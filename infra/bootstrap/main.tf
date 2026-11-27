# Bootstrap: crea el bucket donde vive el estado de Terraform del proyecto principal.
# Se aplica UNA sola vez, con estado local (infra/bootstrap/terraform.tfstate, ignorado por Git).
# No se destruye con el proyecto: si se borrara, Terraform perdería la memoria de lo que creó.
# Mismo patrón que el repo de referencia del profesor (aws-terraform-glue-iceberg-medallion).

data "aws_caller_identity" "actual" {}

# El bucket. Los nombres de S3 son únicos en todo el mundo: el número de cuenta evita choques.
resource "aws_s3_bucket" "tfstate" {
  bucket = "${var.proyecto}-tfstate-${data.aws_caller_identity.actual.account_id}"
}

# Versionado: guarda las versiones anteriores del estado por si un apply lo daña.
resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Cifrado en reposo con SSE-S3 (AES256): AWS maneja las llaves.
resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Nadie de afuera puede leerlo: se bloquea todo acceso público.
resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket                  = aws_s3_bucket.tfstate.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
