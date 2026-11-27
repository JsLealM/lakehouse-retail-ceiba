variable "proyecto" {
  description = "Prefijo de los nombres"
  type        = string
}

variable "region" {
  description = "Región donde viven los recursos (para armar los ARN)"
  type        = string
}

variable "account_id" {
  description = "Número de la cuenta de AWS (para armar los ARN)"
  type        = string
}

variable "lakehouse_bucket_arn" {
  description = "ARN del bucket de datos (sale del módulo storage)"
  type        = string
}

variable "artifacts_bucket_arn" {
  description = "ARN del bucket de artefactos (sale del módulo storage)"
  type        = string
}
