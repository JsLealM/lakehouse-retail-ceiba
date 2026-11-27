variable "region" {
  description = "Región de AWS del proyecto"
  type        = string
  default     = "us-east-2" # Ohio: la cuenta solo permite esta región
}

variable "proyecto" {
  description = "Prefijo de todos los recursos"
  type        = string
  default     = "ceiba"
}
