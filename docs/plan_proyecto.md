# Plan del Proyecto Final · Lakehouse Retail "Ceiba" en AWS

> Curso: Fundamentos de Computación Paralela y Distribuida · Vale **30 % de la materia**
> Equipo: 3 integrantes · Presupuesto AWS: **≤ 20 USD (meta: ≤ 10 USD)**
> Hoy: miércoles 25-nov-2026 · Sustentación: miércoles 09-dic-2026 → **14 días**

---

## 1. Qué hay que construir (en una frase)

Llevar las ventas de una cadena ficticia de 150 tiendas desde una base **PostgreSQL (Neon)** + **3 lotes de archivos** + **3 Excel** hasta un **Lakehouse en S3** (landing → bronze → silver → gold) usando **Glue (PySpark)**, modelarlo en **estrella**, cargarlo en un **segundo Neon**, exponerlo con **API Gateway + Lambda** y mostrarlo en un **tablero web público** (Vercel/Render). Todo orquestado con **Step Functions** y creado/destruido con **Terraform**.

La arquitectura **es fija** (la del profesor). Cualquier cambio → preguntarle antes.

### 1.1 El flujo completo (diagrama `06_end_to_end.png`)

**Camino batch (a demanda, lo dispara Step Functions):**

| # | Paso | Servicio |
|---|------|----------|
| 1 | Se lanza `pipeline_retail` con `{modo: full|incremental, lote: lote_0X}` | Step Functions |
| 2 | `extract_neon`: lee Neon OLTP por TLS y escribe en landing (**solo carga inicial**) | Glue job |
| 3 | `ingest_drive`: baja lotes/catálogos del Drive a landing; `xlsx_to_csv` convierte los Excel | Lambda ×2 |
| 4 | Crawler cataloga landing | Glue Crawler |
| 5 | `to_bronze`: Parquet + columnas de control | Glue job |
| 6 | `to_silver`: tipar, estandarizar, deduplicar, cruzar con DIVIPOLA | Glue job |
| 7 | `to_gold`: modelo estrella con llaves sustitutas | Glue job |
| 8 | `load_serving`: dimensiones + fact_metas + agregados → Neon `dw` | Glue job |
| 9 | Registrar el lote como procesado en `etl_control` | DynamoDB |

**Camino de consulta (cada vez que alguien abre el tablero):**
A Gerente abre el tablero → B HTTPS a API Gateway (CORS + throttling) → C IAM invoca Lambda `api_kpis` → D Lambda lee credenciales de Secrets Manager → E consulta Neon `dw` (TLS, usuario **solo lectura**) → F JSON al front.

### 1.2 Las capas del Lakehouse

| Capa | Qué hace | Partición · formato |
|------|----------|---------------------|
| landing | archivo tal cual llega | `fuente=/fecha_ingesta=` · original |
| bronze | Parquet + columnas de control | `fuente=/lote=` · Parquet |
| silver | tipa, estandariza, deduplica, cruza DIVIPOLA | `anio=/mes=` · Parquet |
| gold | estrella con llaves sustitutas | `anio=/mes=` · Parquet |

**Columnas de control obligatorias en bronze:** `_origen` (neon|archivo), `_fuente`, `_lote`, `_fecha_ingesta`, `_hash_registro`.

### 1.3 Modelo estrella (diagrama `02_modelo_estrella.png`)

- **Hechos:** `fact_ventas` (grano: 1 línea de factura), `fact_pagos` (grano: 1 pago de factura), `fact_metas` (grano: tienda × mes).
- **Dimensiones:** `dim_fecha` (propia, `aaaammdd`, con festivos), `dim_hora` (0–23, franja), `dim_tienda` (+ outrigger `dim_tienda_horario`), `dim_producto`, `dim_cliente` (`cliente_sk = -1` consumidor final, documento → **SHA-256**), `dim_canal`, `dim_medio_pago`.
- SCD **tipo 1** (sobrescribir). Tipo 2 = bonificación.
- **Gold (S3)** = todo a grano atómico. **Neon dw** = dimensiones + `fact_metas` + agregados `agg_ventas_dia`, `agg_ventas_hora`, `agg_pagos_dia` (para caber en el límite del plan gratuito).

### 1.4 Terraform: 8 módulos (diagrama `04_terraform.png`)

| Módulo | Recursos |
|--------|----------|
| `security` | roles IAM (uno por servicio), secretos Neon (Secrets Manager) |
| `storage` | bucket lakehouse, bucket athena/scripts (SSE-S3, bloqueo público) |
| `catalog` | 4 crawlers, 4 bases Glue, workgroup Athena |
| `ingestion` | Lambdas `ingest_drive`, `xlsx_to_csv` |
| `etl` | 5 jobs Glue, conexión JDBC |
| `orchestration` | Step Function `pipeline_retail`, DynamoDB `etl_control` |
| `api` | HTTP API (API Gateway), Lambda `api_kpis` |
| `observability` | logs 7 días, Budgets 10 y 20 USD, alertas |

Fuera de Terraform: los 2 proyectos de Neon y el front (Vercel/Render).

### 1.5 Step Functions (diagrama `07_step_functions.png`)

`LeerControl` → **Parallel**[ `IngestDrive → ConvertirXlsx` ‖ `¿full? → ExtraerNeon` ] → `StartCrawler → Wait 30s → GetCrawler → ¿READY?` (loop) → `¿nuevos?` (no → terminar) → `ToBronze → ToSilver → ToGold → LoadServing` (cada uno `.sync`) → `Registrar` → Éxito.
Errores: **Retry ×2 con backoff**, **Catch → RegistrarFalla**, **Fail** mostrando el paso exacto.

### 1.6 Seguridad exigida

HTTPS + CORS solo al dominio del front + throttling · `aws_lambda_permission` explícito · `sslmode=require` · rol de solo lectura para la API · credenciales **solo** en Secrets Manager (nunca en Git) · S3 cifrado + bloqueo público · documento del cliente hasheado antes de Gold · **sin VPC**.

### 1.7 El tablero: 8 preguntas de negocio

1. **Ventas y ticket:** venta neta, # facturas, ticket promedio, unidades por ticket
2. **Ranking de tiendas:** total y por m²
3. **Mapa de calor:** por departamento, municipio y zona comercial
4. **Tiendas abiertas:** estado y horario vigente según día y hora
5. **Cómo se vende:** mezcla de canal y medio de pago
6. **Día × hora:** horas pico, festivos vs. días normales
7. **Cumplimiento:** venta real vs. meta mensual
8. **Productos:** top categorías y marcas, peso de la marca propia

**Filtros:** periodo, zona, departamento, formato de tienda, canal. Además: responsive, estados de carga y de error.

### 1.8 Rúbrica (7 criterios, nivel 1–4)

Ingesta y Lakehouse · Calidad del dato (reglas de dedupe documentadas + **conteos por capa en Athena**) · Modelo estrella · Orquestación (lote en vivo) · IaC y costos · API y seguridad (**OpenAPI**) · UI/UX.
Además: **repo público con README**, **cada integrante con sus propios commits**, y en la sustentación **cualquiera responde por cualquier parte**.

---

## 2. Los datos: problemas que ya se ven (revisado en los archivos)

| Fuente | Formato | Problemas detectados |
|--------|---------|----------------------|
| `retail_oltp.pgdump` | pg_dump custom, ~700 MB, 14 tablas en esquema `retail` | llaves de negocio compuestas (`cod_tienda+prefijo+numero`), prefijo cambia `FV01→FV02` y la numeración se reinicia; `cufe` NULL = contingencia; cliente NULL = consumidor final; TIMESTAMPTZ → convertir a `America/Bogota` |
| `lote_01` (julio) | CSV `,` UTF-8, 4 archivos (facturas, detalle, pagos, clientes) | fechas con offset `-05`, campos vacíos, posibles duplicados del dump |
| `lote_02` (agosto) | **JSON Lines**, camelCase, **detalle anidado** en `ventas.jsonl` | fechas en **UTC (`Z`)** → convertir a Bogotá; hay que hacer `explode` del detalle (y revisar si pagos también vienen anidados) |
| `lote_03` (septiembre) | **CSV regional**: separador `;`, **decimal con coma**, **Latin-1** (no UTF-8), fecha `dd/mm/yyyy` y hora en columnas separadas, columnas en MAYÚSCULAS con otros nombres (`NRO_FACTURA`, `VR_TOTAL`), estado `EMITIDA` en vez de `E` | trae **NOVEDADES**: tienda nueva (BOG025), tienda cerrada (NEI002), horarios y cajas nuevas → actualizan dimensiones |
| Catálogos `.xlsx` | Excel | Glue no lee Excel → `xlsx_to_csv`; DANE pierde el cero inicial (`5001` → `05001`, usar `lpad`) |

Problemas sembrados a propósito (según el profe): **duplicados exactos** (se detectan con `_hash_registro`), **versiones distintas** de la misma factura (ej. anulada después → regla: gana el `updated_at` más reciente; documentarla), **códigos DANE rotos**, **campos vacíos**, **formatos mezclados**, y **solo los registros nuevos** deben sumar venta.

> Ojo: ya tenemos `lote_03` en la carpeta. Úsenlo para **ensayar** el procesamiento antes del día 9 (el profe lo "publica" el día de la sustentación, pero conviene que el parser regional ya esté probado).

---

## 3. División del trabajo (3 roles)

Cada uno es **dueño** de una parte, pero todos deben poder explicar todo. Cada quien hace commits **desde su propia cuenta de GitHub**.

### 👤 Johan Leal (A) — Infraestructura, costos y orquestación ("DevOps")
- Cuenta AWS, usuarios IAM del equipo, **alarmas de costo** (ver §5)
- Terraform: estructura `infra/` con los 8 módulos; backend de estado; `apply`/`destroy`
- Módulos: `security`, `storage`, `catalog`, `observability`, `orchestration`, y el *esqueleto* de `etl`/`api`/`ingestion` (los demás le pasan el código)
- Lambdas `ingest_drive` y `xlsx_to_csv`
- Step Functions `pipeline_retail` + DynamoDB `etl_control` + manejo de errores
- Conteos por capa en Athena (queries guardadas)
- Evidencia de `terraform destroy`

### 👤 Jhayder Florez (B) — Ingeniería de datos (Glue / PySpark)
- Restaurar el dump en **Neon proyecto 1** (hoy mismo)
- Entorno local con la **imagen Docker de Glue** (desarrollar sin gastar)
- Jobs: `extract_neon`, `to_bronze`, `to_silver`, `to_gold`
- Reglas de deduplicación/estandarización **documentadas** (`docs/reglas_calidad.md`)
- Parsers de los 3 formatos de lote (CSV, JSONL anidado, CSV regional)
- `dim_fecha` con festivos, llaves sustitutas, hash del documento

### 👤 Andres Benitez (C) — Serving, API y tablero ("Full-stack")
- **Neon proyecto 2**: esquema `dw` (DDL de dimensiones, `fact_metas`, agregados), usuario de solo lectura
- Job `load_serving` (en pareja con B: B entrega gold, C define qué carga a Neon)
- Lambda `api_kpis` + endpoints + **OpenAPI** (`docs/openapi.yaml`)
- Tablero (recomendado **Next.js en Vercel**): KPIs, filtros, mapa de calor (Leaflet o Deck.gl con lat/long de DIVIPOLA), estados de carga/error
- Prototipo con datos *mock* para el Avance 1

**Trabajo compartido:** README, diagramas, documentación, ensayo de la sustentación.

> **Por qué así:** Johan y Andres pueden avanzar sin esperar datos reales (infra y front con mocks); Jhayder es el camino crítico. Si Jhayder se atrasa, Johan ayuda con `to_bronze` (es casi mecánico) y Andres con el DDL de gold.

---

## 4. Cronograma día a día

Leyenda: **Johan** = Infra · **Jhayder** = Datos · **Andres** = API/Front · ⭐ = bloqueante

### Semana 1 — Cimientos → **Avance 1 (lunes 30-nov)**
*Avance 1 = Base restaurada en Neon, Terraform base aplicado, carga en landing y bronze, prototipo del tablero.*

| Día | Johan (Infra) | Jhayder (Datos) | Andres (API/Front) |
|-----|---|---|---|
| **Mié 25** | ⭐ Cuenta AWS + MFA + usuarios IAM + **Budget manual de 5/10/20 USD** (§5). Crear repo GitHub público con estructura (§7) | ⭐ Crear Neon proyecto 1 (us-east-1), **restaurar dump**, verificar conteos. Bajar imagen Docker de Glue | Leer arquitectura completa. Crear Neon proyecto 2. Elegir stack front y crear proyecto Next.js |
| **Jue 26** | Terraform: backend, `storage`, `security` (roles + secretos) | Job `extract_neon` en local (leer tablas por JDBC → Parquet/CSV) | Wireframe del tablero (8 preguntas + filtros). Proyecto en Vercel |
| **Vie 27** | `catalog` (bases + crawlers + workgroup Athena), `observability` (budgets en TF, logs 7 días). **`terraform apply`** | `to_bronze` en local: columnas de control + `_hash_registro` | Prototipo con datos mock: tarjetas KPI, 2–3 gráficas, mapa |
| **Sáb 28** | `ingestion`: Lambdas `ingest_drive` + `xlsx_to_csv`. Subir lote_01, lote_02 y catálogos a landing | ⭐ Correr `extract_neon` **una sola vez** en AWS → landing. Correr `to_bronze` en AWS | DDL del esquema `dw` en Neon 2 (basado en el diagrama estrella) |
| **Dom 29** | Crawlers sobre landing/bronze; queries de conteo en Athena | Empezar `to_silver` en local con lote_01 (ya hay tiempo muerto) | Pulir prototipo; desplegar en Vercel |
| **Lun 30** | **📦 Entrega Avance 1**: capturas de Neon, `terraform apply`, S3 landing/bronze, Athena, link del prototipo | | |

### Semana 2 — El pipeline → **Avance 2 (miércoles 02-dic)**
*Avance 2 = Silver con deduplicación de lotes 1 y 2, gold en estrella, al menos un endpoint de la API.*
**Solo hay 2 días entre Avance 1 y 2** → silver y gold deben empezar antes del 30.

| Día | Johan (Infra) | Jhayder (Datos) | Andres (API/Front) |
|-----|---|---|---|
| **Lun 30** | Módulo `etl` en TF (5 jobs, 2 workers G.1X, timeout) | ⭐ `to_silver`: dedupe (hash + última versión por `updated_at`), tipado, DANE con `lpad`, cruce DIVIPOLA, lote_02 con explode | Lambda `api_kpis` (1er endpoint: `/kpis/resumen`) leyendo secreto |
| **Mar 01** | Módulo `api` en TF (HTTP API, CORS, throttling, `aws_lambda_permission`) | ⭐ `to_gold`: dimensiones + hechos + llaves sustitutas + `dim_fecha` | `load_serving` con B; carga a Neon dw |
| **Mié 02** | **📦 Entrega Avance 2**: conteos por capa en Athena, reglas de dedupe documentadas, gold en S3, endpoint respondiendo con curl | | |

### Semana 3 — Producto → **Sustentación (miércoles 09-dic)**

| Día | Johan (Infra) | Jhayder (Datos) | Andres (API/Front) |
|-----|---|---|---|
| **Jue 03** | `orchestration`: Step Function completa + DynamoDB `etl_control` | Lógica incremental (`¿nuevos?`), parser de **lote_03** regional + NOVEDADES | Resto de endpoints (ranking, mapa, canales/pagos, día×hora, metas, productos, tiendas abiertas) |
| **Vie 04** | Retry/Catch/Fail en la Step Function; probar full + incremental | Agregados `agg_ventas_dia/hora`, `agg_pagos_dia`; `fact_metas` | Conectar tablero a la API real; filtros |
| **Sáb 05** | **Ensayo 1 completo**: `destroy` → `apply` → pipeline full → lote_01 → lote_02 | Corregir lo que falle | Mapa de calor, tiendas abiertas, responsive |
| **Dom 06** | OpenAPI + README (cómo desplegar) | Documento de reglas de calidad + conteos | Estados de carga/error, UX |
| **Lun 07** | **Ensayo 2**: procesar lote_03 como si fuera en vivo | Diagramas / README de datos | Pulido visual |
| **Mar 08** | **Ensayo general de sustentación** (todos explican todo). Revisar gasto en Cost Explorer | | |
| **Mié 09** | **🎤 Sustentación**: lote_03 en vivo con Step Functions → tablero actualizado → `terraform destroy` con evidencia | | |

### Dedicación estimada

- **~50–60 h por persona** en total (≈ 4 h/día entre semana, 6–8 h sábado/domingo).
- Reunión diaria de **15 min** (qué hice / qué haré / qué me bloquea) por WhatsApp/Meet.
- Los días de entrega (30-nov, 02-dic) dejen **la noche anterior** para capturas y evidencias.

---

## 5. Control de costos (hacer HOY, antes de crear cualquier recurso)

### 5.1 Alarmas
1. **AWS Budgets manual (consola) hoy:** presupuesto mensual de costo con alertas al **25 % (5 USD), 50 % (10 USD), 80 % (16 USD) y 100 % (20 USD)**, real y *forecasted*, al correo de los 3. (Los budgets de monitoreo no cuestan.)
2. **Budgets en Terraform** (lo pide la rúbrica, módulo `observability`): `aws_budgets_budget` a **10 y 20 USD**.
3. **Cost Anomaly Detection** (gratis): activarlo en Billing.
4. Activar **Free Tier usage alerts** en Billing preferences.
5. Revisar **Cost Explorer cada 2 días** (Johan lo reporta en el chat del grupo).

### 5.2 Reglas para no quemar plata

| Regla | Por qué |
|-------|---------|
| Desarrollar PySpark **en local** con la imagen Docker de Glue; en AWS solo correr lo que ya funciona | Cada corrida de Glue cuesta |
| Jobs con **2 workers G.1X**, `timeout` de 15–20 min, `max_retries = 0` en desarrollo | El default son 10 workers = 5× el costo |
| **Nada de notebooks interactivos / Glue Studio sessions** olvidados | Cobran mientras estén abiertos |
| **NUNCA crear NAT Gateway ni VPC** (la arquitectura es *sin VPC*) | Un NAT cuesta ~32 USD/mes: solo eso se come el presupuesto. Los jobs Glue llegan a Neon por internet con TLS |
| Crawlers solo cuando cambie el esquema (min. facturable 10 min) | ≈ 0,07 USD por corrida, pero suman |
| `extract_neon` se corre **una vez** (carga full) | Ahorra Glue y horas de cómputo de Neon |
| Athena: siempre filtrar por partición; workgroup con límite de bytes escaneados | 5 USD/TB |
| CloudWatch logs con retención de 7 días | Evita costo acumulado |
| Secrets Manager: 2 secretos (Neon OLTP, Neon dw) | 0,40 USD/secreto/mes |
| Hacer `terraform destroy` los días que no se trabaje si algo cobra por tiempo | Solo pagar lo usado |

**Estimado del profe:** ≈ 10 USD (Glue ≈ 5, crawlers ≈ 3, Secrets ≈ 0,60, resto < 1).

### 5.3 Cuenta de AWS
- Usar **una sola cuenta** (la del dueño de la tarjeta). Crear un **usuario IAM por integrante** con MFA, nunca usar root.
- Si alguien abre una cuenta nueva, AWS da créditos de bienvenida (verificar condiciones y si el "plan gratuito" restringe algún servicio como Glue antes de elegirla).

---

## 6. Riesgos a verificar el primer día

| Riesgo | Qué hacer |
|--------|-----------|
| **Límite de almacenamiento de Neon free.** El LEEME dice 1 GB, la base ocupa ~700 MB; Neon ha cambiado sus límites (algunos planes gratis dan 0,5 GB por proyecto) | Restaurar **hoy** y ver si entra. Si no, avisar al profe de inmediato |
| Conexión Glue → Neon sin VPC | Probar el 26-nov con un job mínimo. Si la "conexión JDBC" de Glue exige VPC, leer credenciales de Secrets Manager y conectar con el driver directo (consultar al profe si se considera cambio) |
| Lambda bajando de Google Drive | Probar descarga de un archivo público temprano; los archivos grandes (44 MB) caben en `/tmp` de Lambda |
| `pandas`/`openpyxl` en Lambda | Usar una Lambda Layer o empaquetar con Docker |
| Front en Vercel llamando a API Gateway | Configurar CORS con el dominio exacto de Vercel |
| Credenciales subidas a GitHub | `.gitignore` con `*.tfvars`, `.env`, `*.tfstate`; nunca commitear estado de Terraform |

---

## 7. Estructura sugerida del repositorio

```
lakehouse-retail-ceiba/
├── README.md                  # qué es, arquitectura, cómo desplegar/destruir, integrantes
├── .gitignore                 # .env, *.tfvars, *.tfstate*, .terraform/, node_modules/
├── infra/                     # Terraform (Johan)
│   ├── main.tf  variables.tf  outputs.tf  backend.tf
│   └── modules/{security,storage,catalog,ingestion,etl,orchestration,api,observability}/
├── etl/                       # Glue PySpark (Jhayder)
│   ├── jobs/{extract_neon,to_bronze,to_silver,to_gold,load_serving}.py
│   ├── lambdas/{ingest_drive,xlsx_to_csv}/
│   └── tests/
├── sql/                       # DDL Neon dw, usuario readonly, queries Athena de conteo
├── api/                       # Lambda api_kpis + openapi.yaml (Andres)
├── frontend/                  # Next.js (Andres)
└── docs/                      # reglas_calidad.md, diagramas, evidencias (capturas por avance)
```

Trabajen con ramas por persona (`infra/...`, `etl/...`, `front/...`) y Pull Requests a `main`: así cada uno tiene sus commits visibles.

---

## 8. Recursos del profesor y para qué sirve cada uno

| Recurso | Úsenlo para |
|---------|-------------|
| [matiastulli/aws-terraform-glue-iceberg-medallion](https://github.com/matiastulli/aws-terraform-glue-iceberg-medallion) | **Plantilla de Terraform** para Glue + S3 + capas medallion (Johan). Ojo: usa Iceberg; nuestro enunciado pide Parquet |
| [cleberzumba/medallion-scd-aws-glue-iceberg](https://github.com/cleberzumba/medallion-scd-aws-glue-iceberg) | Ejemplo de **SCD y deduplicación** en jobs Glue (Jhayder) |
| [YouTube: Deploying a Glue Job with Terraform](https://www.youtube.com/watch?v=CYZ3ZjXdQP8) | Paso a paso para subir scripts a S3 y crear `aws_glue_job` (Johan y Jhayder) |
| [ajteaches.dev: Distributed pipeline with Spark and Glue](https://www.ajteaches.dev/posts/distributed-pipeline-with-apache-spark-and-aws-glue) | Conceptos de Spark distribuido en Glue (todos; sirve para la sustentación) |
| `pry-fcpd-architecture.zip` | Diagramas oficiales: relacional, estrella, Terraform, end-to-end, Step Functions |

---

## 9. Checklist de entregables

**Avance 1 (30-nov)**
- [ ] Dump restaurado en Neon 1 con conteos verificados (648.246 facturas, 2.360.406 detalles, 673.044 pagos, 120.011 clientes)
- [ ] `terraform apply` de los módulos base (captura)
- [ ] Landing con carga full de Neon + lotes 1 y 2 + catálogos CSV
- [ ] Bronze en Parquet con las 5 columnas de control
- [ ] Prototipo del tablero desplegado

**Avance 2 (02-dic)**
- [ ] Silver con dedupe de lotes 1 y 2 y reglas documentadas
- [ ] Conteos por capa en Athena (landing vs bronze vs silver)
- [ ] Gold en estrella (S3) con llaves sustitutas y `dim_fecha` propia
- [ ] Al menos un endpoint respondiendo

**Sustentación (09-dic)**
- [ ] Step Functions completo (full + incremental, retry/catch)
- [ ] Neon dw con dimensiones, `fact_metas` y agregados
- [ ] API completa + OpenAPI
- [ ] Tablero público con las 8 preguntas, filtros, mapa de calor, responsive, carga/error
- [ ] Lote 3 procesado en vivo
- [ ] `terraform destroy` con evidencia
- [ ] README completo, repo público, commits de los 3
- [ ] Gasto total ≤ 20 USD (captura de Cost Explorer)
