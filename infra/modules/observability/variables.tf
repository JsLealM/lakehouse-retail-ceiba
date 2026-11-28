variable "proyecto" {
  description = "Prefijo de los nombres"
  type        = string
}

variable "account_id" {
  description = "Número de la cuenta de AWS"
  type        = string
}

variable "correos_alertas" {
  description = "Correos que reciben las alertas de costo y del pipeline (vienen de terraform.tfvars, que no va a Git)"
  type        = list(string)
}

variable "lambdas" {
  description = "Nombres de las Lambdas del proyecto: se les crea el grupo de logs con 7 días"
  type        = list(string)
}
