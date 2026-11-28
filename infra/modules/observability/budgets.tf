# Dos alarmas de presupuesto mensual (las pide el PDF: "Alarmas de Budgets a 10 y 20 USD en Terraform").
# Cada una avisa al 80 % y al 100 % del gasto real, y al 100 % del gasto pronosticado.
locals {
  limites = { "10usd" = 10, "20usd" = 20 }

  avisos = [
    { tipo = "ACTUAL", umbral = 80 },
    { tipo = "ACTUAL", umbral = 100 },
    { tipo = "FORECASTED", umbral = 100 },
  ]
}

resource "aws_budgets_budget" "costo" {
  for_each = local.limites

  name         = "${var.proyecto}-${each.key}"
  budget_type  = "COST"
  limit_amount = each.value
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # MUY IMPORTANTE: con el plan gratuito los créditos pagan el consumo. Por defecto Budgets
  # descuenta los créditos y el costo medido quedaría en 0 USD: las alarmas nunca sonarían.
  # Con include_credit = false se mide el consumo real (así lo hace el repo de referencia).
  cost_types {
    include_credit = false
    include_refund = false
  }

  dynamic "notification" {
    for_each = local.avisos
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value.umbral
      threshold_type             = "PERCENTAGE"
      notification_type          = notification.value.tipo
      subscriber_email_addresses = var.correos_alertas
      subscriber_sns_topic_arns  = [aws_sns_topic.alertas.arn]
    }
  }

  # La política del tema debe existir antes, si no Budgets no puede publicar.
  depends_on = [aws_sns_topic_policy.alertas]
}
