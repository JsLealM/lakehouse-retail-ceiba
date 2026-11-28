variable "proyecto" {
  description = "Prefijo de los recursos"
  type        = string
}

variable "region" {
  description = "Región de AWS (para el ARN de la capa de pandas)"
  type        = string
}

variable "lakehouse_bucket" {
  description = "Bucket del lakehouse: las Lambdas escriben en su carpeta landing/"
  type        = string
}

variable "role_arn" {
  description = "Rol ceiba-lambda-ingest-role (módulo security)"
  type        = string
}
