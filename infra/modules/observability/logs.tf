# Grupos de logs con retención de 7 días (si no, CloudWatch los guarda para siempre y cobra).

# Glue escribe en estos 3 grupos compartidos (ya existían: los creó la prueba de #5;
# se importan en infra/imports.tf en vez de crearlos).
resource "aws_cloudwatch_log_group" "glue" {
  for_each = toset(["/aws-glue/jobs/output", "/aws-glue/jobs/error", "/aws-glue/jobs/logs-v2"])

  name              = each.value
  retention_in_days = 7
}

# Cada Lambda escribe en /aws/lambda/<nombre>. Se crean aquí antes que las Lambdas (#37, #41)
# para que nazcan ya con 7 días.
resource "aws_cloudwatch_log_group" "lambda" {
  for_each = toset(var.lambdas)

  name              = "/aws/lambda/${each.value}"
  retention_in_days = 7
}
