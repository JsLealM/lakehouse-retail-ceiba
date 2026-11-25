# Lakehouse retail en AWS · Ceiba

Proyecto final de Fundamentos de Computación Paralela y Distribuida (FCPD).

Plataforma de datos de punta a punta para **Ceiba**, una cadena ficticia de 150 tiendas en Colombia: de una base transaccional en Neon y tres lotes incrementales a un **Lakehouse en S3** (landing → bronze → silver → gold) procesado con **AWS Glue (PySpark)**, modelado en estrella, servido desde Neon mediante **API Gateway + Lambda** y visualizado en un **tablero web público**. Todo se orquesta con **Step Functions** y se crea y destruye con **Terraform**.

## Integrantes

| Integrante | Rol |
|---|---|
| Johan Leal | Infraestructura y orquestación (Terraform, AWS, Step Functions) |
| Jhayder Florez | Ingeniería de datos (Glue, PySpark, modelo estrella) |
| Andres Benitez | Serving, API y tablero (Neon dw, Lambda, frontend) |

## Estructura

```
infra/       Terraform: 8 módulos (security, storage, catalog, ingestion, etl, orchestration, api, observability)
etl/         Jobs de Glue en PySpark y Lambdas de ingesta
sql/         DDL de Neon dw, usuario de solo lectura y consultas de Athena
api/         Lambda api_kpis y especificación OpenAPI
frontend/    Tablero web
docs/        Reglas de calidad, diagramas y evidencias por avance
```

## Entregas

| Hito | Fecha |
|---|---|
| Avance 1 | 30 de noviembre de 2026 |
| Avance 2 | 2 de diciembre de 2026 |
| Sustentación final | 9 de diciembre de 2026 |

El seguimiento de tareas está en el tablero de GitHub Projects del repositorio.

## Reglas del equipo

- Ninguna credencial en el repositorio: se usan Secrets Manager y variables de entorno locales.
- Cada integrante trabaja en su rama y abre Pull Request a `main`.
- Todo `terraform apply` se avisa antes en el chat del grupo.
- Presupuesto máximo de AWS: 20 USD.
