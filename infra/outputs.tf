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
