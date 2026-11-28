# Recursos que ya existían en AWS antes de manejarlos con Terraform: se "adoptan" en vez de crearlos.
# Los 3 grupos de logs de Glue los creó solo AWS en la prueba de #5.
import {
  to = module.observability.aws_cloudwatch_log_group.glue["/aws-glue/jobs/output"]
  id = "/aws-glue/jobs/output"
}

import {
  to = module.observability.aws_cloudwatch_log_group.glue["/aws-glue/jobs/error"]
  id = "/aws-glue/jobs/error"
}

import {
  to = module.observability.aws_cloudwatch_log_group.glue["/aws-glue/jobs/logs-v2"]
  id = "/aws-glue/jobs/logs-v2"
}
