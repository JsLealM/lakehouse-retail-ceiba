# Roles IAM: la "identidad" con la que actúa cada servicio.
# Un rol tiene dos partes:
#   1. Política de confianza (assume_role_policy): QUIÉN puede usar el rol (Glue, Lambda, Step Functions).
#   2. Políticas de permisos: QUÉ puede hacer quien lo use, y SOBRE QUÉ recursos.
# Mínimo privilegio: cada rol solo puede lo que su servicio necesita, nunca "Resource": "*".

locals {
  # Prefijo de ARN que se repite en varios permisos: arn:aws:<servicio>:us-east-2:771574032966:
  arn_region = "${var.region}:${var.account_id}"
}

# ---------------------------------------------------------------------------
# Política de confianza: la misma forma para los 4 roles, solo cambia el servicio.
# data "aws_iam_policy_document" escribe el JSON por nosotros.
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "confianza" {
  for_each = toset(["glue", "lambda", "states"])

  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["${each.key}.amazonaws.com"]
    }
  }
}

# ===========================================================================
# 1. Rol de Glue: lo usan los 5 jobs y los crawlers.
# ===========================================================================
resource "aws_iam_role" "glue" {
  name               = "${var.proyecto}-glue-role"
  assume_role_policy = data.aws_iam_policy_document.confianza["glue"].json
}

# Política administrada de AWS: permisos básicos de Glue (catálogo, logs de CloudWatch).
resource "aws_iam_role_policy_attachment" "glue_servicio" {
  role       = aws_iam_role.glue.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole"
}

data "aws_iam_policy_document" "glue" {
  # Leer y escribir todas las capas del lakehouse.
  statement {
    sid       = "LakehouseLecturaEscritura"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${var.lakehouse_bucket_arn}/*"]
  }
  # Listar el bucket (Spark lo necesita para ver qué archivos hay en una carpeta).
  statement {
    sid       = "ListarBuckets"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [var.lakehouse_bucket_arn, var.artifacts_bucket_arn]
  }
  # Leer los scripts de los jobs (solo lectura, solo esa carpeta).
  statement {
    sid       = "LeerScripts"
    actions   = ["s3:GetObject"]
    resources = ["${var.artifacts_bucket_arn}/scripts/*"]
  }
  # Leer las credenciales de las dos bases de Neon.
  statement {
    sid       = "LeerSecretosNeon"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.neon_oltp.arn, aws_secretsmanager_secret.neon_dw.arn]
  }
}

resource "aws_iam_role_policy" "glue" {
  name   = "permisos-ceiba"
  role   = aws_iam_role.glue.id
  policy = data.aws_iam_policy_document.glue.json
}

# ===========================================================================
# 2. Rol de las Lambdas de ingesta (ingest_drive y xlsx_to_csv).
# ===========================================================================
resource "aws_iam_role" "lambda_ingest" {
  name               = "${var.proyecto}-lambda-ingest-role"
  assume_role_policy = data.aws_iam_policy_document.confianza["lambda"].json
}

# Política administrada de AWS: escribir sus logs en CloudWatch.
resource "aws_iam_role_policy_attachment" "lambda_ingest_logs" {
  role       = aws_iam_role.lambda_ingest.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_ingest" {
  # Solo la carpeta landing/: leer (el xlsx) y escribir (los archivos y los CSV convertidos).
  statement {
    sid       = "LandingLecturaEscritura"
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["${var.lakehouse_bucket_arn}/landing/*"]
  }
}

resource "aws_iam_role_policy" "lambda_ingest" {
  name   = "permisos-ceiba"
  role   = aws_iam_role.lambda_ingest.id
  policy = data.aws_iam_policy_document.lambda_ingest.json
}

# ===========================================================================
# 3. Rol de la Lambda api_kpis (la que responde al tablero).
# ===========================================================================
resource "aws_iam_role" "lambda_api" {
  name               = "${var.proyecto}-lambda-api-role"
  assume_role_policy = data.aws_iam_policy_document.confianza["lambda"].json
}

resource "aws_iam_role_policy_attachment" "lambda_api_logs" {
  role       = aws_iam_role.lambda_api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_api" {
  # Solo el secreto del dw: la API nunca toca la base OLTP ni S3.
  statement {
    sid       = "LeerSecretoDw"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.neon_dw.arn]
  }
}

resource "aws_iam_role_policy" "lambda_api" {
  name   = "permisos-ceiba"
  role   = aws_iam_role.lambda_api.id
  policy = data.aws_iam_policy_document.lambda_api.json
}

# ===========================================================================
# 4. Rol de Step Functions (el pipeline_retail que coordina todo).
# Los jobs, crawlers, Lambdas, tabla y tema SNS todavía no existen (#34, #37, #40, #43, #35):
# los permisos se dan por NOMBRE con el prefijo ceiba-, así no hay que volver a tocar este rol.
# OJO: por eso las Lambdas y los crawlers DEBEN llamarse ceiba-<algo> (ver AGENTS.md).
# ===========================================================================
resource "aws_iam_role" "sfn" {
  name               = "${var.proyecto}-sfn-role"
  assume_role_policy = data.aws_iam_policy_document.confianza["states"].json
}

data "aws_iam_policy_document" "sfn" {
  # Lanzar, consultar y detener los jobs de Glue (el .sync espera a que terminen).
  statement {
    sid       = "JobsGlue"
    actions   = ["glue:StartJobRun", "glue:GetJobRun", "glue:GetJobRuns", "glue:BatchStopJobRun"]
    resources = ["arn:aws:glue:${local.arn_region}:job/*"]
  }
  # Lanzar y consultar los crawlers.
  statement {
    sid       = "Crawlers"
    actions   = ["glue:StartCrawler", "glue:GetCrawler"]
    resources = ["arn:aws:glue:${local.arn_region}:crawler/${var.proyecto}-*"]
  }
  # Invocar solo las Lambdas del proyecto.
  statement {
    sid       = "InvocarLambdas"
    actions   = ["lambda:InvokeFunction"]
    resources = ["arn:aws:lambda:${local.arn_region}:function:${var.proyecto}-*"]
  }
  # Leer y escribir la tabla de control del ETL.
  statement {
    sid       = "TablaControl"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"]
    resources = ["arn:aws:dynamodb:${local.arn_region}:table/${var.proyecto}-etl-control"]
  }
  # Avisar por correo cuando el pipeline falla.
  statement {
    sid       = "PublicarAlertas"
    actions   = ["sns:Publish"]
    resources = ["arn:aws:sns:${local.arn_region}:${var.proyecto}-alertas"]
  }
}

resource "aws_iam_role_policy" "sfn" {
  name   = "permisos-ceiba"
  role   = aws_iam_role.sfn.id
  policy = data.aws_iam_policy_document.sfn.json
}
