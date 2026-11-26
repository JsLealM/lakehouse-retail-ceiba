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
Tareas: GitHub Projects del repo (https://github.com/users/JsLealM/projects/1). Plan completo en `docs/plan_proyecto.md`.

## Arquitectura fija (no cambiarla sin preguntar)

Neon OLTP + 3 lotes (CSV, JSON Lines, CSV regional) + catálogos xlsx
→ S3 landing / bronze / silver / gold (Parquet)
→ Glue Data Catalog + crawlers + Athena
→ 5 jobs Glue PySpark: `extract_neon`, `to_bronze`, `to_silver`, `to_gold`, `load_serving`
→ modelo estrella → Neon `dw` → API Gateway (HTTP API) + Lambda `api_kpis` → tablero web en Vercel.

Orquestación: Step Functions `pipeline_retail` + DynamoDB `etl_control`.
Infraestructura: Terraform en `infra/` con 8 módulos: security, storage, catalog, ingestion, etl, orchestration, api, observability.
Región: `us-east-1`. Sin VPC.

## La cuenta de AWS es distinta a los tutoriales

- Se creó con el registro nuevo de AWS: consola con "proyectos" y configuración en settings.aws.com.
- No activar "características avanzadas": es irreversible y elimina el límite de gasto.
- Usuarios IAM: solo acceso programático (access keys para Terraform y CLI). No entran a la consola.
- No hay grupos IAM: las políticas se asignan directo al usuario.
- Las personas entran a la consola por "Equipo" (invitación por correo).
- La consola vuelve a la región Ohio, que es la del proyecto. Los recursos se crean en us-east-1 con
  `provider "aws" { region = "us-east-1" }`. Para verlos: links con `?region=us-east-1`.
- Límite de gasto: 25 USD/mes. Créditos: 120 USD. Meta del proyecto: 20 USD o menos.

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
