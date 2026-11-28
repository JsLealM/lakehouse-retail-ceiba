output "sns_alertas_arn" {
  description = "Tema SNS de alertas (lo usa el pipeline en #44)"
  value       = aws_sns_topic.alertas.arn
}

output "budgets" {
  description = "Nombres de los budgets creados"
  value       = [for b in aws_budgets_budget.costo : b.name]
}
