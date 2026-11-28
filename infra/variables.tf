variable "region" {
  description = "Región de AWS donde se crea todo"
  type        = string
  default     = "us-east-2" # Ohio: la cuenta solo permite esta región
}

variable "proyecto" {
  description = "Prefijo de todos los recursos"
  type        = string
  default     = "ceiba"
}

variable "correos_alertas" {
  description = "Correos de los integrantes para las alertas. Se escriben en terraform.tfvars (ignorado por Git)"
  type        = list(string)
}
