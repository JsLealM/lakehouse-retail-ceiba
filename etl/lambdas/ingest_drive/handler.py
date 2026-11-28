"""
Lambda ceiba-ingest-drive: trae del Drive del profesor los archivos de un lote y los deja en landing
SIN modificarlos.

El profesor publica los datos como un .zip (drive_proyecto_retail.zip). La Lambda lo descarga a /tmp,
saca solo los archivos de la carpeta del lote y sube cada uno a:
    landing/fuente=<lote>_<archivo>/fecha_ingesta=AAAA-MM-DD/<archivo original>
Ejemplo: landing/fuente=lote_01_facturas/fecha_ingesta=2026-11-28/facturas.csv
(una fuente por archivo: así el crawler crea una tabla por archivo, como neon_<tabla> en extract_neon).

Evento:  {"lote": "lote_01"}    lote_01, lote_02, lote_03 o catalogos (ver fuentes.json)
Para la sustentación, si el profesor publica el lote_03 en otro archivo de Drive:
         {"lote": "lote_03", "drive_id": "<id del archivo>", "carpeta": "<carpeta dentro del zip>"}
Si el archivo de Drive no es un .zip, se sube tal cual, con su nombre.

Cada lote se carga una sola vez: si ya está en landing con OTRA fecha_ingesta, no se vuelve a subir y la
respuesta trae "ya_cargado": true (si se subiera otra vez, to_bronze leería las dos copias). Repetirla el mismo
día sí sube (sobrescribe los mismos archivos, sirve para completar una carga que falló a medias).
Para cargarlo de nuevo a propósito (p. ej. el profesor corrigió un archivo): borrar antes la carpeta vieja de
landing y usar {"lote": "...", "forzar": true}.
"""
import json
import os
import re
import shutil
import urllib.request
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import PurePosixPath

import boto3

BUCKET = os.environ["BUCKET"]
# confirm=t salta el aviso de "no se pudo analizar en busca de virus" que Drive muestra con archivos grandes.
URL_DRIVE = "https://drive.usercontent.google.com/download?id={id}&export=download&confirm=t"
COLOMBIA = timezone(timedelta(hours=-5))  # Colombia no tiene horario de verano
DESCARGA = "/tmp/descarga"

with open(os.path.join(os.path.dirname(__file__), "fuentes.json"), encoding="utf-8") as f:
    FUENTES = json.load(f)

s3 = boto3.client("s3")


def descargar(drive_id):
    """Baja el archivo de Drive a /tmp y devuelve su nombre original."""
    req = urllib.request.Request(URL_DRIVE.format(id=drive_id), headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=240) as r:
        if r.headers.get_content_type() == "text/html":
            raise RuntimeError(f"Drive devolvió una página web y no el archivo {drive_id}: "
                               "¿está compartido como 'cualquier persona con el enlace'?")
        nombre = re.search(r'filename="([^"]+)"', r.headers.get("Content-Disposition", ""))
        with open(DESCARGA, "wb") as f:
            shutil.copyfileobj(r, f, 1024 * 1024)
    return nombre.group(1) if nombre else drive_id


def subir(origen, nombre, lote, fecha, tamano):
    """Sube un archivo a landing y comprueba que en S3 quedó con el mismo tamaño."""
    fuente = f"{lote}_{PurePosixPath(nombre).stem.lower()}"
    clave = f"landing/fuente={fuente}/fecha_ingesta={fecha}/{nombre}"
    s3.upload_fileobj(origen, BUCKET, clave)
    en_s3 = s3.head_object(Bucket=BUCKET, Key=clave)["ContentLength"]
    if en_s3 != tamano:
        raise RuntimeError(f"{clave}: el original pesa {tamano} bytes y en S3 quedó con {en_s3}")
    print(f"[ingest_drive] {clave} ({tamano} bytes)")
    return {"clave": clave, "bytes": tamano}


def ya_en_landing(lote):
    """Archivos que el lote ya tiene en landing, de cualquier fecha."""
    previos = []
    for pagina in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix=f"landing/fuente={lote}_"):
        previos += [{"clave": o["Key"], "bytes": o["Size"]} for o in pagina.get("Contents", [])]
    return previos


def handler(event, context):
    lote = event["lote"]
    if lote not in FUENTES:
        raise ValueError(f"Lote desconocido: {lote}. Opciones: {sorted(FUENTES)}")
    drive_id = event.get("drive_id", FUENTES[lote]["drive_id"])
    carpeta = event.get("carpeta", FUENTES[lote]["carpeta"])
    fecha = datetime.now(COLOMBIA).strftime("%Y-%m-%d")

    previos = ya_en_landing(lote)
    if not event.get("forzar") and any(f"/fecha_ingesta={fecha}/" not in a["clave"] for a in previos):
        print(f"[ingest_drive] {lote} ya estaba en landing de otro día: no se vuelve a subir")
        return {"lote": lote, "ya_cargado": True, "archivos": previos}

    nombre = descargar(drive_id)
    archivos = []
    try:
        if zipfile.is_zipfile(DESCARGA):
            with zipfile.ZipFile(DESCARGA) as z:
                for info in z.infolist():
                    ruta = PurePosixPath(info.filename)
                    # Solo los archivos que están directo en la carpeta del lote (no la base, no el LEEME).
                    if info.is_dir() or ruta.parent.name != carpeta or "__MACOSX" in ruta.parts:
                        continue
                    with z.open(info) as origen:
                        archivos.append(subir(origen, ruta.name, lote, fecha, info.file_size))
        else:
            with open(DESCARGA, "rb") as origen:
                archivos.append(subir(origen, nombre, lote, fecha, os.path.getsize(DESCARGA)))
    finally:
        os.remove(DESCARGA)  # /tmp se reutiliza entre ejecuciones de la misma Lambda

    if not archivos:
        raise RuntimeError(f"No encontré archivos de la carpeta '{carpeta}' en el archivo {nombre}")
    return {"lote": lote, "ya_cargado": False, "fecha_ingesta": fecha, "archivos": archivos}
