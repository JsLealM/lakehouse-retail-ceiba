output "lakehouse_bucket" {
  description = "Nombre del bucket de datos"
  value       = aws_s3_bucket.this["lakehouse"].bucket
}

output "lakehouse_bucket_arn" {
  description = "ARN del bucket de datos (lo usan las políticas IAM de #33)"
  value       = aws_s3_bucket.this["lakehouse"].arn
}

output "artifacts_bucket" {
  description = "Nombre del bucket de artefactos"
  value       = aws_s3_bucket.this["artifacts"].bucket
}

output "artifacts_bucket_arn" {
  description = "ARN del bucket de artefactos"
  value       = aws_s3_bucket.this["artifacts"].arn
}
