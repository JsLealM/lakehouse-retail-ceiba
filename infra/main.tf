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

# #35: budgets de 10 y 20 USD, tema SNS de alertas y logs con 7 días.
module "observability" {
  source = "./modules/observability"

  proyecto        = var.proyecto
  account_id      = data.aws_caller_identity.actual.account_id
  correos_alertas = var.correos_alertas
  lambdas         = ["${var.proyecto}-ingest-drive", "${var.proyecto}-xlsx-to-csv", "${var.proyecto}-api-kpis"]
}

# #34: 4 bases del Glue Data Catalog, un crawler por capa y el workgroup de Athena.
module "catalog" {
  source = "./modules/catalog"

  proyecto         = var.proyecto
  lakehouse_bucket = module.storage.lakehouse_bucket
  artifacts_bucket = module.storage.artifacts_bucket
  glue_role_arn    = module.security.glue_role_arn
}
