output "glue_role_arn" {
  description = "Rol de los jobs y crawlers de Glue"
  value       = aws_iam_role.glue.arn
}

output "lambda_ingest_role_arn" {
  description = "Rol de las Lambdas ingest_drive y xlsx_to_csv"
  value       = aws_iam_role.lambda_ingest.arn
}

output "lambda_api_role_arn" {
  description = "Rol de la Lambda api_kpis"
  value       = aws_iam_role.lambda_api.arn
}

output "sfn_role_arn" {
  description = "Rol de Step Functions"
  value       = aws_iam_role.sfn.arn
}

output "secret_neon_oltp_arn" {
  description = "Secreto con la conexión a Neon 1 (OLTP)"
  value       = aws_secretsmanager_secret.neon_oltp.arn
}

output "secret_neon_dw_arn" {
  description = "Secreto con la conexión a Neon 2 (dw)"
  value       = aws_secretsmanager_secret.neon_dw.arn
}
