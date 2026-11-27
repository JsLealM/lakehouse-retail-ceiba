# Proyecto principal: aquí se llama a cada módulo (una "caja" de recursos que van juntos).
# Los módulos viven en infra/modules/<nombre>/ y se van agregando issue por issue.

# #32: buckets del lakehouse (datos por capas) y de artefactos (scripts y resultados de Athena).
module "storage" {
  source = "./modules/storage"

  proyecto   = var.proyecto
  account_id = data.aws_caller_identity.actual.account_id
}

# #33: un rol IAM por servicio (mínimo privilegio) y los dos secretos de Neon.
module "security" {
  source = "./modules/security"

  proyecto             = var.proyecto
  region               = var.region
  account_id           = data.aws_caller_identity.actual.account_id
  lakehouse_bucket_arn = module.storage.lakehouse_bucket_arn
  artifacts_bucket_arn = module.storage.artifacts_bucket_arn
}
