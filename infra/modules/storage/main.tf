# Módulo storage: los dos buckets del proyecto.
#   lakehouse -> los datos: landing/, bronze/, silver/, gold/
#   artifacts -> lo que no es dato: scripts/ (jobs de Glue y Lambdas) y athena-results/
# Separarlos permite dar permisos distintos y limpiar artefactos sin tocar los datos.

locals {
  # Mapa con los dos buckets: con for_each se escriben los recursos una sola vez para ambos.
  buckets = {
    lakehouse = "${var.proyecto}-lakehouse-${var.account_id}"
    artifacts = "${var.proyecto}-artifacts-${var.account_id}"
  }
}

resource "aws_s3_bucket" "this" {
  for_each = local.buckets # crea un bucket por cada entrada: this["lakehouse"] y this["artifacts"]

  bucket = each.value
  # Permite que terraform destroy borre el bucket aunque tenga archivos (necesario al final).
  force_destroy = true
}

# Nadie de afuera puede leerlos: los 4 seguros del bloqueo público en true.
resource "aws_s3_bucket_public_access_block" "this" {
  for_each = aws_s3_bucket.this

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Cifrado en reposo SSE-S3 (AES256): AWS maneja las llaves, sin costo.
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# El dueño del bucket es dueño de todos sus archivos; se apagan las ACL (permisos por archivo).
resource "aws_s3_bucket_ownership_controls" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Solo en artifacts: borra los resultados de Athena a los 7 días para no acumular costo.
resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.this["artifacts"].id

  rule {
    id     = "borrar-athena-results"
    status = "Enabled"

    filter {
      prefix = "athena-results/"
    }

    expiration {
      days = 7
    }
  }
}
