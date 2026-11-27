# Dónde se guarda el estado (la "libreta" de lo que Terraform creó).
# Vive en el bucket que creó infra/bootstrap, así los tres trabajamos sobre el mismo estado.
#
# Configuración parcial: el nombre del bucket y la región NO van aquí, van en backend.hcl
# (ese archivo cambia según la cuenta y no se sube a Git). Se usa así:
#   terraform init -backend-config=backend.hcl
terraform {
  backend "s3" {
    key          = "lakehouse/terraform.tfstate" # ruta del archivo de estado dentro del bucket
    encrypt      = true                          # el estado se guarda cifrado
    use_lockfile = true                          # bloqueo: dos apply no pueden correr a la vez
  }
}
