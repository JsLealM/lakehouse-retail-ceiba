# Jobs de Glue (PySpark). Por cada script de etl/jobs/<job>.py:
#   1. se sube a s3://<artifacts>/scripts/jobs/<job>.py (Glue ejecuta el script desde S3, no desde GitHub)
#   2. se crea el job <job> que lo ejecuta
# #40 parcial (28-nov): extract_neon y to_bronze, para la #8. Faltan to_silver, to_gold, load_serving y la
# conexión JDBC ceiba-neon-oltp (30-nov). Para agregar un job: una línea en local.jobs.

locals {
  # Argumentos propios de cada job (se suman a los comunes de abajo). Al lanzar el job se pueden cambiar,
  # p. ej. to_bronze con --lote lote_01.
  jobs = {
    extract_neon = { "--secret_oltp" = "${var.proyecto}/neon-oltp" }
    to_bronze    = { "--lote" = "full" }
  }
}

resource "aws_s3_object" "script" {
  for_each = local.jobs

  bucket = var.artifacts_bucket
  key    = "scripts/jobs/${each.key}.py"
  source = "${path.root}/../etl/jobs/${each.key}.py"
  # Huella del archivo: si alguien cambia el .py, cambia la huella y el apply sube la versión nueva.
  etag = filemd5("${path.root}/../etl/jobs/${each.key}.py")
}

resource "aws_glue_job" "this" {
  for_each = local.jobs

  name         = each.key
  role_arn     = var.glue_role_arn
  glue_version = "5.0" # Spark 3.5 y Python 3.11; trae el driver JDBC de PostgreSQL

  # Costo: 2 workers G.1X = 2 DPU (0,44 USD por DPU-hora). Timeout corto y sin reintentos automáticos:
  # si algo se cuelga se corta a los 20 min, y un fallo no se vuelve a cobrar solo.
  worker_type       = "G.1X"
  number_of_workers = 2
  timeout           = 20
  max_retries       = 0

  execution_property {
    max_concurrent_runs = 1 # una corrida a la vez: evita lanzar dos veces el mismo job sin querer
  }

  command {
    name            = "glueetl"
    script_location = "s3://${var.artifacts_bucket}/${aws_s3_object.script[each.key].key}"
    python_version  = "3"
  }

  default_arguments = merge({
    "--bucket"                  = var.lakehouse_bucket
    "--enable-glue-datacatalog" = "true" # Spark puede leer las tablas del Glue Data Catalog
    "--job-language"            = "python"
  }, each.value)
}
