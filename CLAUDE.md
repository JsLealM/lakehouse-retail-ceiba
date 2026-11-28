# Contexto del proyecto para asistentes de IA

Lee esto antes de responder o escribir código en este repositorio.

## Proyecto

Proyecto universitario FCPD: Lakehouse retail "Ceiba" en AWS.

| Integrante | Rol | GitHub |
|---|---|---|
| Johan Leal | Infraestructura y orquestación (Terraform, AWS, Step Functions) | JsLealM |
| Jhayder Florez | Ingeniería de datos (Glue, PySpark, modelo estrella) | jhayderstiven03-collab |
| Andres Benitez | Neon dw, API y tablero | Hades0131 |

Entregas: Avance 1 el 30-nov-2026, Avance 2 el 02-dic-2026, sustentación el 09-dic-2026.
Tareas: GitHub Projects del repo (https://github.com/users/JsLealM/projects/1). Cada issue trae objetivo, pasos, criterio de terminado, dependencias y preguntas de sustentación: léelo completo antes de empezar. Plan completo en `docs/plan_proyecto.md`.

## Arquitectura fija (no cambiarla sin preguntar)

Neon OLTP + 3 lotes (CSV, JSON Lines, CSV regional) + catálogos xlsx
→ S3 landing / bronze / silver / gold (Parquet)
→ Glue Data Catalog + crawlers + Athena
→ 5 jobs Glue PySpark: `extract_neon`, `to_bronze`, `to_silver`, `to_gold`, `load_serving`
→ modelo estrella → Neon `dw` → API Gateway (HTTP API) + Lambda `api_kpis` → tablero web en Vercel.

Orquestación: Step Functions `pipeline_retail` + DynamoDB `etl_control`.
Alertas: tema SNS `ceiba-alertas` (módulo observability) con suscripción por correo; lo usan los budgets y el pipeline cuando falla.
Usuarios del tablero (PDF pág. 8): gerente general (país), gerente de zona y administrador de tienda.
Fuente de verdad de los diagramas: `Proyecto final · Lakehouse retail en AWS.pdf` (19 páginas); la pág. 9 tiene la arquitectura de servicios completa.
Infraestructura: Terraform en `infra/` con 8 módulos: security, storage, catalog, ingestion, etl, orchestration, api, observability.
Región: `us-east-2` (Ohio). Sin VPC.

## La cuenta de AWS es distinta a los tutoriales

- Se creó con el registro nuevo de AWS: consola con "proyectos" y configuración en settings.aws.com.
- No activar "características avanzadas": es irreversible y elimina el límite de gasto.
- Usuarios IAM: solo acceso programático (access keys para Terraform y CLI). No entran a la consola.
- No hay grupos IAM: las políticas se asignan directo al usuario.
- Las personas entran a la consola por "Equipo" (invitación por correo).
- La cuenta (modalidad "proyectos") tiene una política de la organización (SCP) que **niega todo fuera de
  us-east-2 (Ohio)**, la región del proyecto. Todo se crea en us-east-2; en us-east-1 sale `AccessDenied ... explicit deny in a service control policy`.
- Proyecto de AWS: "LakeHouse". Plan gratuito con 100 USD de créditos (vence el 25-may-2027): AWS no cobra a la
  tarjeta; al acabarse los créditos la cuenta se detiene. Meta del proyecto: 20 USD o menos.
- La cuenta solo permite 1 proyecto: NUNCA cerrar el proyecto "LakeHouse".
- En el plan gratuito, activar AWS Organizations o IAM Identity Center borra los créditos: no hacerlo.
- El MFA del propietario está en su perfil de AWS (Builder ID), no en IAM.

## Convenciones de nombres (usarlas siempre)

| Elemento | Nombre acordado |
|---|---|
| Región | `us-east-2` (Ohio) |
| Prefijo de recursos | `ceiba` |
| Bucket de datos | `ceiba-lakehouse-<id_cuenta>` con carpetas `landing/`, `bronze/`, `silver/`, `gold/` |
| Bucket de artefactos | `ceiba-artifacts-<id_cuenta>` con `scripts/` (jobs y Lambdas) y `athena-results/` |
| Bases del Glue Data Catalog | `ceiba_landing`, `ceiba_bronze`, `ceiba_silver`, `ceiba_gold` |
| Ruta landing | `landing/fuente=<fuente>/fecha_ingesta=AAAA-MM-DD/<archivo>`. `<fuente>` = `neon_<tabla>` (extract_neon) o `<lote>_<archivo>` en minúscula sin extensión (ingest_drive), p. ej. `fuente=lote_01_facturas`, `fuente=catalogos_metas_venta`: una fuente por archivo = una tabla en el crawler |
| Ruta bronze | `bronze/<tabla>/fuente=<fuente>/lote=<lote>/` (Parquet) |
| Ruta silver y gold | `silver/<tabla>/anio=AAAA/mes=MM/` y `gold/<tabla>/anio=AAAA/mes=MM/` (Parquet) |
| Valores de `lote` | `full` (carga inicial desde Neon), `lote_01`, `lote_02`, `lote_03`, `catalogos` |
| Secretos | `ceiba/neon-oltp` y `ceiba/neon-dw`, JSON con `host`, `port`, `dbname`, `username`, `password`. `ceiba/neon-dw` trae además `username_lectura` (`api_lectura`) y `password_lectura`: la API usa esos (solo SELECT), `load_serving` usa `username` |
| Roles IAM | `ceiba-glue-role`, `ceiba-lambda-ingest-role`, `ceiba-lambda-api-role`, `ceiba-sfn-role` (módulo security) |
| Jobs de Glue (nombre en AWS) | `extract_neon`, `to_bronze`, `to_silver`, `to_gold`, `load_serving`; scripts en `s3://ceiba-artifacts-<id>/scripts/jobs/` |
| Tabla de control | DynamoDB `ceiba-etl-control`, llave `lote` (texto) |
| Lambdas (nombre en AWS) | `ceiba-ingest-drive`, `ceiba-xlsx-to-csv`, `ceiba-api-kpis` (el rol de Step Functions solo invoca `ceiba-*`) |
| Crawlers | `ceiba-crawler-landing`, `ceiba-crawler-bronze`, `ceiba-crawler-silver`, `ceiba-crawler-gold` |
| Conexión JDBC de Glue | `ceiba-neon-oltp` (tipo JDBC, sin VPC, `SECRET_ID = ceiba/neon-oltp`; módulo etl, como en el diagrama del profesor). Los jobs NO la adjuntan: con ella Glue correría en una VPC y necesitaría NAT (~32 USD/mes) |
| Endpoints de la API | `GET /kpis/resumen`, `/kpis/ranking`, `/kpis/mapa`, `/kpis/tiendas-abiertas`, `/kpis/canales-pagos`, `/kpis/dia-hora`, `/kpis/metas`, `/kpis/productos` (ver `docs/diseno/preguntas_negocio.md`) |
| Regiones de Neon | Neon 1 (OLTP, Jhayder) y Neon 2 (dw, Andres): los dos en us-east-2, igual que AWS. La conexión va por internet con TLS (`sslmode=require`) |
| Entrada del pipeline | `{"modo": "full" | "incremental", "lote": "lote_02"}` |
| Carpetas del repo | `infra/`, `etl/jobs/`, `etl/lambdas/`, `sql/`, `api/`, `frontend/`, `docs/` |

## Reglas

1. No des rutas de menú de la consola de AWS de memoria: la consola cambió. Verifica en la documentación
   actual o pide una captura antes de indicar dónde hacer clic.
2. Prefiere Terraform y la CLI sobre clics en la consola.
3. Costos: Glue con 2 workers G.1X y timeout de 15-20 min; nunca NAT Gateway ni VPC; nada de notebooks ni
   sesiones interactivas de Glue; `extract_neon` se ejecuta una sola vez (carga full).
4. Nunca pongas credenciales en el código ni en Git: Secrets Manager en AWS y `.env` local (ignorado).
5. Desarrolla PySpark en local con la imagen Docker de Glue antes de correr en AWS.
6. Neon 1 (OLTP, esquema `retail`) es de Jhayder; Neon 2 (`dw`) es de Andres. Siempre `sslmode=require`.
7. Git: una rama por tarea (`infra/...`, `etl/...`, `api/...`, `front/...`) y PR a `main` con
   `closes #N` por cada issue.
8. Si algo implica gastar dinero, borrar recursos o cambiar la arquitectura, pregunta antes.

## Datos (problemas conocidos)

- `lote_01`: CSV con `,`, UTF-8, fechas con offset `-05`.
- `lote_02`: JSON Lines en camelCase, detalle anidado (usar `explode`), fechas en UTC (`Z`).
- `lote_03`: CSV con `;`, coma decimal, Latin-1, fechas `dd/mm/yyyy`, columnas en mayúsculas con otros
  nombres y archivos NOVEDADES (tiendas, horarios, cajas).
- Código DANE sin cero inicial en los Excel: `lpad` a 5 dígitos.
- Llave de factura: `cod_tienda + prefijo + numero`; la numeración se reinicia al cambiar de prefijo.
