output "jobs" {
  description = "Nombre de cada job de Glue"
  value       = [for j in aws_glue_job.this : j.name]
}

output "scripts" {
  description = "Ruta en S3 del script de cada job"
  value       = { for k, j in aws_glue_job.this : k => j.command[0].script_location }
}
