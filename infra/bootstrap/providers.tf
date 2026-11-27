terraform {
  # Versión mínima de Terraform: 1.10 trae el bloqueo nativo en S3 (use_lockfile).
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region

  # Etiquetas que se ponen solas en todo lo que se cree: sirven para filtrar costos en Cost Explorer.
  default_tags {
    tags = {
      Proyecto  = var.proyecto
      ManagedBy = "terraform/bootstrap"
    }
  }
}