variable "proyecto" {
  description = "Prefijo de los recursos"
  type        = string
}

variable "lakehouse_bucket" {
  description = "Bucket del lakehouse (argumento --bucket de los jobs)"
  type        = string
}

variable "artifacts_bucket" {
  description = "Bucket de artefactos: los scripts van en scripts/jobs/"
  type        = string
}

variable "glue_role_arn" {
  description = "Rol ceiba-glue-role (módulo security)"
  type        = string
}
