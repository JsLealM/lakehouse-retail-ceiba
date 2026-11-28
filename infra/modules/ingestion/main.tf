# Lambdas de ingesta (diagrama del profesor, caja "Ingesta"):
#   ceiba-ingest-drive  Drive del profesor -> landing (los archivos tal cual llegan)
#   ceiba-xlsx-to-csv   catálogos .xlsx de landing -> .csv al lado (los crawlers no leen Excel)
# El código vive en etl/lambdas/<carpeta>/; Terraform lo empaqueta en un .zip en cada plan/apply
# y, si el código cambió, sube la versión nueva.

locals {
  # Capa administrada por AWS (AWS SDK for pandas): trae pandas y openpyxl, así no hay que construir una.
  # 336392948345 es la cuenta de AWS que publica la capa; la versión 32 es para Python 3.12 en x86_64.
  capa_pandas = "arn:aws:lambda:${var.region}:336392948345:layer:AWSSDKPandas-Python312:32"

  lambdas = {
    ingest_drive = {
      nombre  = "${var.proyecto}-ingest-drive"
      timeout = 300  # baja el zip del Drive (115 MB) y sube hasta 7 archivos
      memoria = 1024 # más memoria en Lambda también da más red y CPU
      capas   = []
    }
    xlsx_to_csv = {
      nombre  = "${var.proyecto}-xlsx-to-csv"
      timeout = 120
      memoria = 512
      capas   = [local.capa_pandas]
    }
  }
}

# Empaqueta cada carpeta de código en un .zip (queda en build/, que Git ignora).
data "archive_file" "codigo" {
  for_each = local.lambdas

  type        = "zip"
  source_dir  = "${path.root}/../etl/lambdas/${each.key}"
  output_path = "${path.module}/build/${each.key}.zip"
  excludes    = ["__pycache__"]
}

resource "aws_lambda_function" "this" {
  for_each = local.lambdas

  function_name    = each.value.nombre
  role             = var.role_arn
  runtime          = "python3.12"
  handler          = "handler.handler" # archivo handler.py, función handler()
  filename         = data.archive_file.codigo[each.key].output_path
  source_code_hash = data.archive_file.codigo[each.key].output_base64sha256 # cambia el código -> se actualiza
  timeout          = each.value.timeout
  memory_size      = each.value.memoria
  layers           = each.value.capas

  environment {
    variables = {
      BUCKET = var.lakehouse_bucket
    }
  }
}
