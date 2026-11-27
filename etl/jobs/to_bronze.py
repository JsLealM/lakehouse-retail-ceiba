"""
Job to_bronze: landing -> bronze. Mismo dato, en Parquet y con 5 columnas de trazabilidad.

NO cambia tipos ni limpia (eso es silver): los CSV se leen con todas las columnas como texto,
el JSONL conserva su estructura anidada y el Parquet de Neon conserva sus tipos.

Columnas de control:
  _origen          'neon' | 'archivo'
  _fuente          neon_<tabla> o nombre del archivo en minúscula y sin extensión
  _lote            full | lote_01 | lote_02 | lote_03 | catalogos
  _fecha_ingesta   current_timestamp() al correr el job
  _hash_registro   sha2 (256) de todas las columnas originales de la fila

Salida: bronze/<tabla>/fuente=<fuente>/lote=<lote>/  (Parquet, overwrite: repetir no duplica)

Uso en AWS:  --bucket ceiba-lakehouse-<id_cuenta> --lote lote_01
Uso local:   --local_root /home/hadoop/workspace/salida_local --lote full
"""
import argparse
import sys
from pathlib import PurePosixPath

from awsglue.context import GlueContext
from pyspark.context import SparkContext
from pyspark.sql import functions as F

# --- Neon (lote "full"): las 14 tablas que dejó extract_neon en landing/fuente=neon_<tabla>/ ---
TABLAS_NEON = [
    "caja", "canal_venta", "categoria", "cliente", "detalle_factura", "factura",
    "horario_tienda", "marca", "medio_pago", "pago_factura", "precio_producto",
    "producto", "tienda", "zona_comercial",
]

# --- Archivos de cada lote. `tabla` = tabla lógica de bronze; la fuente sale del nombre del archivo ---
CSV_COMA = {"formato": "csv", "sep": ",", "enc": "UTF-8"}
CSV_REG = {"formato": "csv", "sep": ";", "enc": "UTF-8"}          # lote 3, archivos en UTF-8
CSV_REG_LATIN = {"formato": "csv", "sep": ";", "enc": "windows-1252"}  # lote 3, archivos con tildes
JSONL = {"formato": "json"}

LOTES = {
    "lote_01": [
        {"archivo": "facturas.csv", "tabla": "factura", **CSV_COMA},
        {"archivo": "detalle_factura.csv", "tabla": "detalle_factura", **CSV_COMA},
        {"archivo": "pagos_factura.csv", "tabla": "pago_factura", **CSV_COMA},
        {"archivo": "clientes.csv", "tabla": "cliente", **CSV_COMA},
    ],
    "lote_02": [
        # ventas.jsonl trae tanto `detalle` como `pagos` anidados (array<struct>); se explotan en silver.
        {"archivo": "ventas.jsonl", "tabla": "factura", **JSONL},
        {"archivo": "clientes.jsonl", "tabla": "cliente", **JSONL},
    ],
    "lote_03": [
        {"archivo": "VENTAS_SEP2026.csv", "tabla": "factura", **CSV_REG},
        {"archivo": "DETALLE_SEP2026.csv", "tabla": "detalle_factura", **CSV_REG},
        {"archivo": "PAGOS_SEP2026.csv", "tabla": "pago_factura", **CSV_REG},
        {"archivo": "CLIENTES_SEP2026.csv", "tabla": "cliente", **CSV_REG_LATIN},
        {"archivo": "NOVEDADES_TIENDAS_SEP2026.csv", "tabla": "tienda", **CSV_REG_LATIN},
        {"archivo": "NOVEDADES_HORARIOS_SEP2026.csv", "tabla": "horario_tienda", **CSV_REG},
        {"archivo": "NOVEDADES_CAJAS_SEP2026.csv", "tabla": "caja", **CSV_REG},
    ],
    "catalogos": [
        # Catálogos Excel convertidos a CSV por la Lambda xlsx_to_csv.
        {"archivo": "divipola_geografia.csv", "tabla": "divipola_geografia", **CSV_COMA},
        {"archivo": "festivos_colombia.csv", "tabla": "festivos_colombia", **CSV_COMA},
        {"archivo": "metas_venta.csv", "tabla": "metas_venta", **CSV_COMA},
    ],
}

COLUMNAS_CONTROL = ["_origen", "_fuente", "_lote", "_fecha_ingesta", "_hash_registro"]


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--bucket", help="Bucket del lakehouse (ceiba-lakehouse-<id_cuenta>)")
    p.add_argument("--lote", required=True, choices=["full", "lote_01", "lote_02", "lote_03", "catalogos"])
    p.add_argument("--local_root", help="Carpeta local que hace de bucket (solo pruebas)")
    p.add_argument("--permitir_faltantes", action="store_true",
                   help="No fallar si falta un archivo en landing (solo pruebas locales)")
    args, _ = p.parse_known_args()  # Glue agrega argumentos propios
    if not args.local_root and not args.bucket:
        p.error("Indica --bucket (AWS) o --local_root (local)")
    return args


def fuentes_del_lote(spark, raiz, lote):
    """Devuelve una lista de dicts: fuente, tabla, origen y una función que lee el DataFrame."""
    fuentes = []
    if lote == "full":
        for t in TABLAS_NEON:
            patron = f"{raiz}/landing/fuente=neon_{t}/fecha_ingesta=*/"
            fuentes.append({"fuente": f"neon_{t}", "tabla": t, "origen": "neon",
                            "leer": lambda patron=patron: spark.read.parquet(patron)})
    else:
        for spec in LOTES[lote]:
            patron = f"{raiz}/landing/fuente=*/fecha_ingesta=*/{spec['archivo']}"
            if spec["formato"] == "csv":
                leer = lambda patron=patron, s=spec: (spark.read.option("header", True)
                                                      .option("sep", s["sep"])
                                                      .option("encoding", s["enc"]).csv(patron))
            else:
                leer = lambda patron=patron: spark.read.json(patron)  # se deja anidado
            fuentes.append({"fuente": PurePosixPath(spec["archivo"]).stem.lower(), "tabla": spec["tabla"],
                            "origen": "archivo", "leer": leer})
    return fuentes


def agregar_control(df, origen, fuente, lote):
    """Hash sobre las columnas originales (antes de agregar las de control).
    Cada valor se pasa a texto y el nulo se marca, para que ('a',NULL,'b') y ('a','b') no den igual."""
    originales = [F.coalesce(F.col(f"`{c}`").cast("string"), F.lit("<NULL>")) for c in df.columns]
    return (df.withColumn("_hash_registro", F.sha2(F.concat_ws("||", *originales), 256))
              .withColumn("_origen", F.lit(origen))
              .withColumn("_fuente", F.lit(fuente))
              .withColumn("_lote", F.lit(lote))
              .withColumn("_fecha_ingesta", F.current_timestamp()))


def main():
    args = parse_args()
    sc = SparkContext.getOrCreate()
    sc.setLogLevel("WARN")
    spark = GlueContext(sc).spark_session
    raiz = args.local_root.rstrip("/") if args.local_root else f"s3://{args.bucket}"

    resumen, omitidas, errores = [], [], []
    for f in fuentes_del_lote(spark, raiz, args.lote):
        try:
            df = f["leer"]()
        except Exception as e:  # archivo no encontrado en landing
            if "Path does not exist" in str(e) or "UNABLE_TO_INFER_SCHEMA" in str(e):
                omitidas.append(f["fuente"])
                print(f"[to_bronze] AVISO: no hay datos en landing para {f['fuente']}")
                continue
            raise
        if "fecha_ingesta" in df.columns:  # columna de partición que Spark puede agregar al leer landing
            df = df.drop("fecha_ingesta")

        n_origen = df.count()
        out = agregar_control(df, f["origen"], f["fuente"], args.lote)
        destino = f"{raiz}/bronze/{f['tabla']}/fuente={f['fuente']}/lote={args.lote}/"
        out.write.mode("overwrite").parquet(destino)

        bronze = spark.read.parquet(destino)
        n_bronze = bronze.count()
        faltan = [c for c in COLUMNAS_CONTROL if c not in bronze.columns]
        ok = (n_bronze == n_origen) and not faltan
        if not ok:
            errores.append(f["fuente"])
        resumen.append((f["fuente"], n_origen, n_bronze, "OK" if ok else "FALLA"))
        print(f"[to_bronze] {f['fuente']}: landing={n_origen} bronze={n_bronze} -> {destino}")

    print("[to_bronze] RESUMEN (lote=%s)" % args.lote)
    print(f"  {'fuente':<32}{'landing':>10}{'bronze':>10}  estado")
    for fuente, a, b, estado in resumen:
        print(f"  {fuente:<32}{a:>10}{b:>10}  {estado}")
    if omitidas:
        print(f"[to_bronze] sin datos en landing: {omitidas}")

    if errores or not resumen or (omitidas and not args.permitir_faltantes):
        print("[to_bronze] TERMINÓ CON PROBLEMAS")
        sys.exit(1)
    print(f"[to_bronze] {len(resumen)} fuentes escritas")


if __name__ == "__main__":
    main()