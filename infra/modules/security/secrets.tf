# Los dos secretos de Neon. Terraform crea solo la "caja" con el nombre:
# el valor (host, usuario, contraseña...) se carga aparte con
#   aws secretsmanager put-secret-value
# para que la contraseña nunca quede en el código, en Git ni en el tfstate.

resource "aws_secretsmanager_secret" "neon_oltp" {
  name        = "${var.proyecto}/neon-oltp"
  description = "Conexión a Neon 1 (OLTP, esquema retail). La lee el job extract_neon."
  # 0 = se borra de inmediato con terraform destroy (si no, AWS lo guarda 7-30 días y el nombre queda ocupado).
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret" "neon_dw" {
  name                    = "${var.proyecto}/neon-dw"
  description             = "Conexión a Neon 2 (esquema dw). La leen el job load_serving y la Lambda api_kpis."
  recovery_window_in_days = 0
}
