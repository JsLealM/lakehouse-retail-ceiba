output "bases" {
  description = "Bases del Glue Data Catalog, una por capa"
  value       = [for b in aws_glue_catalog_database.capa : b.name]
}

output "crawlers" {
  description = "Nombres de los crawlers (se lanzan a mano o desde Step Functions)"
  value       = [for c in aws_glue_crawler.capa : c.name]
}

output "athena_workgroup" {
  description = "Workgroup de Athena para las consultas"
  value       = aws_athena_workgroup.ceiba.name
}
