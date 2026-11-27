output "bucket_estado" {
  description = "Nombre del bucket donde vive el estado del proyecto principal"
  value       = aws_s3_bucket.tfstate.bucket
}

# Contenido listo para infra/backend.hcl:
#   terraform -chdir=bootstrap output -raw backend_hcl > backend.hcl
output "backend_hcl" {
  description = "Configuración del backend para el proyecto principal"
  value       = "bucket = \"${aws_s3_bucket.tfstate.bucket}\"\nregion = \"${var.region}\"\n"
}
