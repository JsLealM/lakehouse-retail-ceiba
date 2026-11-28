# Evidencia #36 · Terraform base aplicado (Avance 1)

Región us-east-2 (Ohio), cuenta 771574032966. Estado remoto en `s3://ceiba-tfstate-771574032966` con `use_lockfile`.

| Módulo | Issue | Qué creó |
|---|---|---|
| storage | #32 | buckets `ceiba-lakehouse-<id>` y `ceiba-artifacts-<id>` (cifrado SSE-S3, sin acceso público, `athena-results/` se borra a los 7 días) |
| security | #33 | roles `ceiba-glue-role`, `ceiba-lambda-ingest-role`, `ceiba-lambda-api-role`, `ceiba-sfn-role`; secretos `ceiba/neon-oltp` y `ceiba/neon-dw` (con valor) |
| observability | #35 | budgets `ceiba-10usd` y `ceiba-20usd` (sin descontar créditos), tema SNS `ceiba-alertas`, logs con 7 días |
| catalog | #34 | bases `ceiba_landing`, `ceiba_bronze`, `ceiba_silver`, `ceiba_gold`; 4 crawlers sin horario; workgroup de Athena `ceiba` (corte de 1 GB por consulta) |

Recursos en el estado de Terraform: **54**. Último `apply`: 27-nov-2026, sin errores.

## terraform output

```
account_id = "771574032966"
athena_workgroup = "ceiba"
bucket_artifacts = "ceiba-artifacts-771574032966"
bucket_lakehouse = "ceiba-lakehouse-771574032966"
crawlers = [
  "ceiba-crawler-bronze",
  "ceiba-crawler-gold",
  "ceiba-crawler-landing",
  "ceiba-crawler-silver",
]
glue_bases = [
  "ceiba_bronze",
  "ceiba_gold",
  "ceiba_landing",
  "ceiba_silver",
]
glue_role_arn = "arn:aws:iam::771574032966:role/ceiba-glue-role"
secretos_neon = [
  "ceiba/neon-oltp",
  "ceiba/neon-dw",
]
sns_alertas_arn = "arn:aws:sns:us-east-2:771574032966:ceiba-alertas"
```

Capturas de la consola: `36-consola-*.png` (S3, IAM, Glue, Budgets).
