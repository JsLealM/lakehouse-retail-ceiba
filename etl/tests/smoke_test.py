from pyspark.context import SparkContext
from awsglue.context import GlueContext

sc = SparkContext.getOrCreate()
glue = GlueContext(sc)
spark = glue.spark_session

base = "/home/hadoop/workspace/datos_muestra"

# lote_01: CSV con coma, UTF-8
df1 = spark.read.option("header", True).csv(f"{base}/lote_01/facturas.csv")
print("lote_01 facturas:", df1.count())
df1.printSchema()

# lote_02: JSON Lines
df2 = spark.read.json(f"{base}/lote_02/ventas.jsonl")
print("lote_02 ventas:", df2.count())
df2.printSchema()

# lote_03: CSV regional (separador ; y coma decimal). Codificación según archivo.
def leer_lote3(nombre, encoding):
    return (spark.read.option("header", True)
            .option("sep", ";")
            .option("encoding", encoding)
            .csv(f"{base}/lote_03/{nombre}"))

lote3 = {
    "VENTAS_SEP2026.csv": "UTF-8",
    "DETALLE_SEP2026.csv": "UTF-8",
    "PAGOS_SEP2026.csv": "UTF-8",
    "CLIENTES_SEP2026.csv": "windows-1252",
    "NOVEDADES_TIENDAS_SEP2026.csv": "windows-1252",
    "NOVEDADES_HORARIOS_SEP2026.csv": "UTF-8",
    "NOVEDADES_CAJAS_SEP2026.csv": "UTF-8",
}

for archivo, enc in lote3.items():
    df = leer_lote3(archivo, enc)
    print(f"lote_03 {archivo}: {df.count()} filas")
    df.printSchema()
