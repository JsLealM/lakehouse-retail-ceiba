"""
Job extract_neon: copia las 14 tablas del esquema `retail` de Neon (OLTP) a landing en Parquet.

Se ejecuta UNA sola vez (carga full inicial). Los lotes posteriores llegan por archivos.

Decisión de diseño: en landing la "fuente" es una TABLA, no un archivo.
    landing/fuente=neon_<tabla>/fecha_ingesta=AAAA-MM-DD/
Landing guarda el dato tal como sale de Neon, sin columnas de control (esas se agregan en bronze).

Uso en AWS (Glue):
    --bucket ceiba-lakehouse-<id_cuenta> --secret_oltp ceiba/neon-oltp
Uso local (imagen aws-glue-libs:5), credenciales por variables de entorno (.env):
    --local_output /home/hadoop/workspace/salida_local --limit 1000
"""
import argparse
import json
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

from awsglue.context import GlueContext
from pyspark.context import SparkContext
from pyspark.sql.functions import input_file_name

ESQUEMA = "retail"

TABLAS = [
    "caja", "canal_venta", "categoria", "cliente", "detalle_factura", "factura",
    "horario_tienda", "marca", "medio_pago", "pago_factura", "precio_producto",
    "producto", "tienda", "zona_comercial",
]

# Tablas grandes: lectura paralela por rangos de `numero` (columna numérica bigint).
TABLAS_GRANDES = ["detalle_factura", "factura", "pago_factura"]
COLUMNA_PARTICION = "numero"

# Spark lee `time` de Postgres como timestamp (1970-01-01 hh:mm). Se leen como texto.
CONSULTAS_ESPECIALES = {
    "horario_tienda": (
        "SELECT cod_tienda, dia_semana, vigente_desde, "
        "hora_apertura::text AS hora_apertura, hora_cierre::text AS hora_cierre, "
        "es_24h, vigente_hasta FROM retail.horario_tienda"
    ),
}


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--bucket", help="Bucket del lakehouse (ceiba-lakehouse-<id_cuenta>)")
    p.add_argument("--secret_oltp", help="Nombre del secreto en Secrets Manager (ceiba/neon-oltp)")
    p.add_argument("--local_output", help="Carpeta local de salida (solo pruebas); reemplaza al bucket")
    p.add_argument("--limit", type=int, default=0, help="Filas máximas por tabla (solo pruebas locales)")
    p.add_argument("--num_particiones", type=int, default=8, help="Particiones para las tablas grandes")
    p.add_argument("--fecha", help="fecha_ingesta AAAA-MM-DD (por defecto, hoy en Bogotá)")
    p.add_argument("--tablas", help="Lista separada por comas para correr solo algunas (por defecto, las 14)")
    # Glue agrega argumentos propios (--JOB_NAME, etc.): se ignoran.
    args, _ = p.parse_known_args()
    if not args.local_output and not args.bucket:
        p.error("Indica --bucket (AWS) o --local_output (local)")
    return args


def leer_credenciales(secret_oltp):
    """AWS: Secrets Manager. Local: variables de entorno del .env (nunca en el código)."""
    if secret_oltp:
        import boto3
        sm = boto3.client("secretsmanager", region_name="us-east-2")
        return json.loads(sm.get_secret_value(SecretId=secret_oltp)["SecretString"])
    return {
        "host": os.environ["NEON_HOST"],
        "port": os.environ.get("NEON_PORT", "5432"),
        "dbname": os.environ["NEON_DBNAME"],
        "username": os.environ["NEON_USER"],
        "password": os.environ["NEON_PASSWORD"],
    }


def main():
    args = parse_args()
    cred = leer_credenciales(args.secret_oltp)

    spark = GlueContext(SparkContext.getOrCreate()).spark_session
    fecha = args.fecha or datetime.now(ZoneInfo("America/Bogota")).strftime("%Y-%m-%d")
    raiz = args.local_output.rstrip("/") if args.local_output else f"s3://{args.bucket}"

    url = f"jdbc:postgresql://{cred['host']}:{cred['port']}/{cred['dbname']}?sslmode=require"
    base = {
        "url": url,
        "user": cred["username"],
        "password": cred["password"],
        "driver": "org.postgresql.Driver",
        "fetchsize": "10000",
    }

    tablas = [t.strip() for t in args.tablas.split(",")] if args.tablas else TABLAS
    desconocidas = [t for t in tablas if t not in TABLAS]
    if desconocidas:
        raise SystemExit(f"Tablas desconocidas: {desconocidas}. Válidas: {TABLAS}")

    resumen = []
    for tabla in tablas:
        origen = CONSULTAS_ESPECIALES.get(tabla, f"SELECT * FROM {ESQUEMA}.{tabla}")
        lector = spark.read.format("jdbc").options(**base)

        if args.limit:
            # Prueba local: sin paralelismo, solo las primeras N filas.
            df = lector.option("dbtable", f"({origen} LIMIT {args.limit}) AS q").load()
        elif tabla in TABLAS_GRANDES:
            # Límites reales de la columna; se calculan con una consulta barata.
            lim = (spark.read.format("jdbc").options(**base)
                   .option("dbtable", f"(SELECT min({COLUMNA_PARTICION}) AS lo, "
                                      f"max({COLUMNA_PARTICION}) AS hi FROM {ESQUEMA}.{tabla}) AS l")
                   .load().collect()[0])
            df = (lector.option("dbtable", f"({origen}) AS q")
                  .option("partitionColumn", COLUMNA_PARTICION)
                  .option("lowerBound", str(lim["lo"]))
                  .option("upperBound", str(lim["hi"]))
                  .option("numPartitions", str(args.num_particiones))
                  .load())
        else:
            df = lector.option("dbtable", f"({origen}) AS q").load()

        destino = f"{raiz}/landing/fuente=neon_{tabla}/fecha_ingesta={fecha}/"
        # overwrite: repetir la corrida el mismo día no duplica datos.
        df.write.mode("overwrite").parquet(destino)
        escrito = spark.read.parquet(destino)
        filas = escrito.count()
        if tabla in TABLAS_GRANDES and not args.limit:
            # Cada partición de la lectura JDBC produjo un archivo Parquet: se cuentan sus filas
            # leyendo lo ya escrito (no vuelve a consultar Neon).
            print(f"[extract_neon] {tabla}: filas por partición (un archivo Parquet por partición)")
            por_archivo = (escrito.withColumn("archivo", input_file_name())
                           .groupBy("archivo").count().orderBy("archivo").collect())
            for i, r in enumerate(por_archivo, 1):
                print(f"    partición {i}: {r['count']:>9} filas")
        resumen.append((tabla, filas, df.rdd.getNumPartitions()))
        print(f"[extract_neon] {tabla}: {filas} filas, {df.rdd.getNumPartitions()} particiones -> {destino}")

    print("[extract_neon] RESUMEN")
    for tabla, filas, parts in resumen:
        print(f"  {tabla:<18}{filas:>10}  ({parts} part.)")
    print(f"[extract_neon] {len(resumen)} tablas escritas")


if __name__ == "__main__":
    sys.exit(main())