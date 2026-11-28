variable "proyecto" {
  description = "Prefijo de los nombres"
  type        = string
}

variable "lakehouse_bucket" {
  description = "Nombre del bucket de datos (landing, bronze, silver, gold)"
  type        = string
}

variable "artifacts_bucket" {
  description = "Nombre del bucket de artefactos (ahí van los resultados de Athena)"
  type        = string
}

variable "glue_role_arn" {
  description = "Rol con el que corren los crawlers (ceiba-glue-role, módulo security)"
  type        = string
}
