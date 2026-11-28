output "account_id" {
  description = "Cuenta de AWS donde se desplegó"
  value       = data.aws_caller_identity.actual.account_id
}

output "bucket_lakehouse" {
  description = "Bucket con las capas landing, bronze, silver y gold"
  value       = module.storage.lakehouse_bucket
}

output "bucket_artifacts" {
  description = "Bucket con scripts/ y athena-results/"
  value       = module.storage.artifacts_bucket
}

output "glue_role_arn" {
  description = "Rol que usan los jobs y crawlers de Glue"
  value       = module.security.glue_role_arn
}

output "secretos_neon" {
  description = "Nombres de los secretos de Neon (el valor se carga con put-secret-value)"
  value       = ["${var.proyecto}/neon-oltp", "${var.proyecto}/neon-dw"]
}

output "sns_alertas_arn" {
  description = "Tema SNS de alertas"
  value       = module.observability.sns_alertas_arn
}
