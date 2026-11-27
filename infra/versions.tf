# Versiones de Terraform y del proveedor AWS del proyecto principal.
terraform {
  # 1.10 o más nuevo: trae el bloqueo nativo en S3 (use_lockfile, ver backend.tf).
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0" # cualquier 6.x, nunca un 7.0 que pueda romper el código
    }
  }
}
