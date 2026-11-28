# Módulo catalog: el "índice" del lakehouse.
#   - Glue Data Catalog: 4 bases, una por capa. Una base es solo un nombre que agrupa tablas.
#   - Crawlers: recorren una carpeta de S3, miran los archivos y crean/actualizan las tablas solos.
#   - Athena: consulta esas tablas con SQL leyendo directo de S3 (workgroup con límite de costo).

locals {
  capas = ["landing", "bronze", "silver", "gold"]

  # En qué nivel de la ruta nace cada tabla (el bucket es el nivel 1):
  #   landing/fuente=<fuente>/fecha_ingesta=.../        -> nivel 3: una tabla por fuente, partición fecha_ingesta
  #   bronze/<tabla>/fuente=<fuente>/lote=<lote>/       -> nivel 4: una tabla por tabla y fuente, partición lote
  #     (una misma tabla de bronze trae fuentes con columnas distintas: Neon tipado, CSV en texto, JSON anidado;
  #      juntarlas en una sola tabla haría fallar Athena con "HIVE_PARTITION_SCHEMA_MISMATCH")
  #   silver|gold/<tabla>/anio=/mes=/                   -> nivel 3: una tabla por tabla, particiones anio y mes
  nivel_tabla = { landing = 3, bronze = 4, silver = 3, gold = 3 }
}

resource "aws_glue_catalog_database" "capa" {
  for_each = toset(local.capas)

  name        = "${var.proyecto}_${each.key}"
  description = "Capa ${each.key} del lakehouse (s3://${var.lakehouse_bucket}/${each.key}/)"
}

resource "aws_glue_crawler" "capa" {
  for_each = toset(local.capas)

  name          = "${var.proyecto}-crawler-${each.key}" # el rol de Step Functions solo lanza crawlers ceiba-*
  database_name = aws_glue_catalog_database.capa[each.key].name
  role          = var.glue_role_arn
  # Sin "schedule": solo corre cuando alguien lo lanza (consola, CLI o Step Functions).
  # Cada corrida cobra mínimo 10 minutos, por eso no tiene horario automático.

  s3_target {
    path = "s3://${var.lakehouse_bucket}/${each.key}/"
    # Archivos que no son datos: marcas de Spark y los Excel (Glue no lee .xlsx; se leen sus CSV).
    exclusions = ["**/_SUCCESS", "**/_temporary/**", "**.xlsx", "**.crc"]
  }

  schema_change_policy {
    update_behavior = "UPDATE_IN_DATABASE" # si cambian las columnas, actualiza la tabla
    delete_behavior = "LOG"                # si una carpeta desaparece, solo lo anota (no borra la tabla)
  }

  configuration = jsonencode({
    Version = 1.0
    Grouping = {
      TableLevelConfiguration = local.nivel_tabla[each.key]
    }
    CrawlerOutput = {
      Partitions = { AddOrUpdateBehavior = "InheritFromTable" }
    }
  })
}

# Workgroup de Athena: dónde guarda resultados y cuánto puede leer cada consulta.
resource "aws_athena_workgroup" "ceiba" {
  name          = var.proyecto
  description   = "Consultas del lakehouse Ceiba (conteos por capa)"
  force_destroy = true # permite que terraform destroy lo borre aunque tenga historial de consultas

  configuration {
    enforce_workgroup_configuration    = true       # nadie puede cambiar estas reglas desde la consola
    bytes_scanned_cutoff_per_query     = 1073741824 # 1 GB: una consulta que lea más se cancela (Athena cobra por dato leído)
    publish_cloudwatch_metrics_enabled = false

    result_configuration {
      # La carpeta athena-results/ se borra sola a los 7 días (regla del módulo storage).
      output_location = "s3://${var.artifacts_bucket}/athena-results/"
      encryption_configuration {
        encryption_option = "SSE_S3"
      }
    }
  }
}
