provider "aws" {
  region = var.region

  # Etiquetas que se ponen solas en todo lo que se cree: sirven para filtrar costos en Cost Explorer.
  default_tags {
    tags = {
      Proyecto  = var.proyecto
      ManagedBy = "terraform"
    }
  }
}

# Lee el número de la cuenta (sirve para que los nombres de los buckets sean únicos).
data "aws_caller_identity" "actual" {}
