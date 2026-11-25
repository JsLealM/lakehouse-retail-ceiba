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
- Nadie trabaja directo en `main`: cada bloque de trabajo va en su rama y entra por Pull Request.
- Todo `terraform apply` se avisa antes en el chat del grupo.
- Presupuesto máximo de AWS: 20 USD.

## Cómo trabajar

Tareas: [tablero del proyecto](https://github.com/users/JsLealM/projects/1). Al empezar una tarea, moverla a *In Progress*.

### Flujo de una tarea con código

```bash
git switch main && git pull                          # 1. partir de main actualizado
git switch -c infra/storage-security                 # 2. rama nueva: <área>/<qué>
# ... trabajar con commits pequeños ...
git commit -m "Módulo storage con buckets cifrados y bloqueo público"
git push -u origin infra/storage-security            # 3. subir la rama
gh pr create --fill --body "closes #32, closes #33"  # 4. abrir el PR
# 5. revisión y merge: las tareas se cierran solas
```

- **Ramas por área:** `infra/...` (Johan), `etl/...` (Jhayder), `api/...` y `front/...` (Andres).
- **PR pequeños:** de 1 a 3 tareas por PR.
- **Cerrar varias tareas:** cada número con su palabra clave, `closes #32, closes #33`. Con `closes #32, #33` solo se cierra la #32.
- **Las tareas se cierran al hacer merge a `main`**, no al abrir el PR.
- **Terraform se revisa:** los PR de `infra/` los aprueba otra persona antes del merge. En el resto, cada quien puede hacer merge de lo suyo.

### Tareas que pueden ir en un mismo PR

| Quién | Rama sugerida | Cierra |
|---|---|---|
| Johan | `infra/base` (backend, storage, security) | #31, #32, #33 |
| Johan | `infra/catalog-observability` | #34, #35 |
| Johan | `infra/ingestion` | #37 |
| Johan | `infra/etl-api` | #40, #41 |
| Johan | `infra/pipeline` (Step Functions con reintentos y errores) | #43, #44 |
| Jhayder | `etl/extract-bronze` | #6, #7 |
| Jhayder | `etl/silver` (código y reglas documentadas) | #9, #11 |
| Jhayder | `etl/gold` | #10, #13 |
| Jhayder | `etl/incremental-lote3` | #12 |
| Andres | `front/prototipo` (Next.js, boceto, prototipo) | #16, #17, #18 |
| Andres | `api/ddl-primer-endpoint` | #19, #20 |
| Andres | `etl/load-serving` (con Jhayder) | #21 |
| Andres | `api/endpoints` (endpoints y OpenAPI) | #22, #26 |
| Andres | `front/tablero-final` | #23, #24, #25 |

### Tareas sin código: se cierran a mano con evidencia

Crear la cuenta, restaurar Neon, correr jobs en AWS, conteos en Athena, ensayos y entregas no generan commits de código. Para cerrarlas:

1. Guardar la captura en `docs/evidencias/<avance>/` y subirla con un commit.
2. Cerrar la tarea con un comentario que apunte a la evidencia:

```bash
gh issue close 3 -R JsLealM/lakehouse-retail-ceiba \
  -c "Dump restaurado: conteos coinciden. Evidencia en docs/evidencias/avance1/neon_conteos.png"
```
