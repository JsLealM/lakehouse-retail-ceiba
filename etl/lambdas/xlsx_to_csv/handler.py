"""
Lambda ceiba-xlsx-to-csv: convierte a CSV los catálogos Excel de landing, porque los crawlers de Glue no
leen Excel. El .xlsx original se queda en landing; el .csv se escribe al lado, con el mismo nombre.

Busca todos los .xlsx bajo landing/fuente=catalogos_* (lo que dejó ceiba-ingest-drive con {"lote": "catalogos"}).
El evento no necesita nada: {}. Repetirla no duplica (sobrescribe el mismo .csv).

Qué cambia y qué no:
- Se quitan las filas de título que el Excel trae antes del encabezado (divipola y metas las tienen).
  El encabezado es la primera fila con más celdas llenas entre las 10 primeras.
- Los encabezados quedan en snake_case sin tildes ("Código Municipio" -> codigo_municipio): Athena no admite
  espacios ni tildes en nombres de columna.
- Los VALORES no se limpian: todo sale como texto para no perder ceros iniciales (el lpad del código DANE
  se hace en silver). Las fechas sin hora salen como AAAA-MM-DD. Celda vacía -> campo vacío.
"""
import csv
import io
import os
import re
import unicodedata
from datetime import datetime

import boto3
import openpyxl  # viene en la capa administrada AWSSDKPandas

BUCKET = os.environ["BUCKET"]
PREFIJO = "landing/fuente=catalogos_"

s3 = boto3.client("s3")


def a_snake(texto):
    sin_tildes = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", sin_tildes.lower()).strip("_")


def a_texto(valor):
    if valor is None:
        return ""
    if isinstance(valor, datetime):
        return valor.date().isoformat() if valor.time() == datetime.min.time() else valor.isoformat()
    return str(valor)


def convertir(contenido):
    """Devuelve (csv en bytes, número de filas de datos) a partir del .xlsx."""
    hoja = openpyxl.load_workbook(io.BytesIO(contenido), read_only=True, data_only=True).worksheets[0]
    filas = [f for f in hoja.iter_rows(values_only=True) if any(v is not None for v in f)]
    llenas = [sum(v is not None for v in f) for f in filas[:10]]
    i_encabezado = llenas.index(max(llenas))

    salida = io.StringIO()
    escritor = csv.writer(salida, lineterminator="\n")
    escritor.writerow(a_snake(v) for v in filas[i_encabezado])
    for fila in filas[i_encabezado + 1:]:
        escritor.writerow(a_texto(v) for v in fila)
    return salida.getvalue().encode("utf-8"), len(filas) - i_encabezado - 1


def handler(event, context):
    convertidos = []
    for pagina in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix=PREFIJO):
        for obj in pagina.get("Contents", []):
            clave = obj["Key"]
            if not clave.endswith(".xlsx"):
                continue
            cuerpo, n = convertir(s3.get_object(Bucket=BUCKET, Key=clave)["Body"].read())
            destino = clave[: -len(".xlsx")] + ".csv"
            s3.put_object(Bucket=BUCKET, Key=destino, Body=cuerpo, ContentType="text/csv; charset=utf-8")
            print(f"[xlsx_to_csv] {clave} -> {destino} ({n} filas)")
            convertidos.append({"origen": clave, "destino": destino, "filas": n})

    if not convertidos:
        raise RuntimeError(f"No hay .xlsx en s3://{BUCKET}/{PREFIJO}*: corre antes ceiba-ingest-drive con catalogos")
    return {"convertidos": convertidos}
