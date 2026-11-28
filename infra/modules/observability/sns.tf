# Tema SNS ceiba-alertas: el "megáfono" del proyecto. Publican aquí:
#   - los budgets de 10 y 20 USD (cuando el gasto se acerca o pasa el límite)
#   - el pipeline de Step Functions cuando una tarea falla (#44)
# y AWS reenvía cada mensaje por correo a los integrantes.
resource "aws_sns_topic" "alertas" {
  name = "${var.proyecto}-alertas"
}

# Política del tema: quién puede publicar en él.
#   1. La propia cuenta (así Step Functions, con su rol, puede publicar).
#   2. El servicio Budgets, SOLO para budgets de esta cuenta (condiciones SourceAccount y SourceArn).
# Sin el punto 2, AWS Budgets no puede avisar por SNS.
data "aws_iam_policy_document" "alertas" {
  statement {
    sid       = "CuentaPropia"
    actions   = ["sns:Publish", "sns:Subscribe", "sns:GetTopicAttributes"]
    resources = [aws_sns_topic.alertas.arn]
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.account_id}:root"]
    }
  }

  statement {
    sid       = "BudgetsPublica"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.alertas.arn]
    principals {
      type        = "Service"
      identifiers = ["budgets.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [var.account_id]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:budgets::${var.account_id}:*"]
    }
  }
}

resource "aws_sns_topic_policy" "alertas" {
  arn    = aws_sns_topic.alertas.arn
  policy = data.aws_iam_policy_document.alertas.json
}

# Una suscripción por correo. AWS manda un correo "AWS Notification - Subscription Confirmation":
# cada uno debe abrirlo y dar clic en "Confirm subscription", si no, no le llega nada.
resource "aws_sns_topic_subscription" "correo" {
  for_each = toset(var.correos_alertas)

  topic_arn = aws_sns_topic.alertas.arn
  protocol  = "email"
  endpoint  = each.value
}
