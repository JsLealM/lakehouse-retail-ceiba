output "lambdas" {
  description = "Nombre en AWS de cada Lambda de ingesta"
  value       = { for k, f in aws_lambda_function.this : k => f.function_name }
}

output "lambda_arns" {
  description = "ARN de cada Lambda de ingesta (los usará Step Functions)"
  value       = { for k, f in aws_lambda_function.this : k => f.arn }
}
