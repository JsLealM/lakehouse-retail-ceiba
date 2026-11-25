# Lakehouse retail en AWS para Ceiba: del dato transaccional al tablero de KPIs

<!-- Plantilla para el proyecto: Lakehouse retail en AWS: del dato transaccional al tablero de KPIs -->

## Descripción

Vamos a construir de punta a punta la plataforma de datos de **Ceiba**, una cadena ficticia de 150 tiendas en 62 municipios de Colombia. Los datos de partida son:

- Una base transaccional de unos **3,9 millones de registros** (ventas de enero de 2025 a junio de 2026). La restauramos desde un `.pgdump` en un proyecto de **Neon** (PostgreSQL).
- **Tres lotes incrementales**: julio en CSV, agosto en JSON Lines y septiembre en CSV regional.
- **Catálogos en Excel**: geografía DIVIPOLA, festivos de Colombia y metas de venta por tienda.

Con estos insumos montamos un **Lakehouse en AWS** sobre Amazon S3, organizado en las capas **landing → bronze → silver → gold**:

- **Ingesta**: dos funciones Lambda (`ingest_drive` y `xlsx_to_csv`) y un job de Glue (`extract_neon`) llevan los datos a landing.
- **Transformación**: trabajos de **AWS Glue en PySpark** los convierten a Parquet. Por el camino se limpian, se deduplican y se anonimizan.
- **Modelado y consulta**: en gold armamos un **modelo estrella**, que se cataloga en Glue Data Catalog y se consulta con Athena.
- **Capa de servicio**: las dimensiones, las metas y las tablas agregadas se cargan en un segundo proyecto de Neon (`dw`).
- **Exposición**: una API construida con **API Gateway y Lambda** las sirve.
- **Orquestación**: **AWS Step Functions** ejecuta todo el flujo a demanda.
- **Infraestructura**: la creamos y la destruimos con **Terraform**, sin pasar de 20 USD de consumo.

El producto final es un **tablero web público** desplegado en Vercel. En él, gerentes y administradores consultan las ventas, el ranking de tiendas, las tiendas abiertas según su horario, la mezcla de canales y medios de pago, el cumplimiento de metas y un mapa de calor por zona y departamento.

## Problemática

Ceiba registra miles de ventas al día en sus cajas, su sitio web y su aplicación. Todo eso se guarda en una base transaccional, que está pensada para operar el negocio y no para analizarlo. Hoy, preguntas como *¿qué tienda vende más?*, *¿mi zona cumple la meta?* o *¿a qué hora se vende más?* tienen dos malas respuestas: consultar directamente esa base, lo que pone en riesgo la operación, o armar el análisis a mano durante horas.

Además, los datos llegan por varios caminos y con problemas:

- **Fuentes heterogéneas**: una base relacional, lotes en tres formatos distintos y catálogos en hojas de cálculo que Glue no lee directamente.
- **Calidad deficiente**: facturas duplicadas, varias versiones de una misma factura, registros que llegan tarde, códigos DANE sin el cero inicial, fechas en otra zona horaria y campos vacíos.
- **Llaves de negocio compuestas**: no hay ids autoincrementales. Cada factura se identifica por tienda, prefijo y número, y la numeración se reinicia cuando cambia la resolución de facturación.
- **Infraestructura no reproducible**: los recursos creados a mano en la nube no se pueden replicar ni eliminar con seguridad, y generan costos ocultos.
- **Riesgos de seguridad**: credenciales escritas en el código, bases expuestas a internet y datos personales de clientes sin anonimizar.

Para resolverlo hay que aplicar lo visto en el curso: procesar los datos en paralelo con Spark, coordinar servicios distribuidos y automatizar el despliegue como código.

## Objetivo general

Diseñar, desplegar con Infraestructura como Código y operar una arquitectura Lakehouse en AWS que integre, limpie y modele en estrella los datos de ventas de Ceiba. Esos datos deben llegar de forma segura, a través de una API, a un tablero web público de KPIs, con un consumo total menor a 20 USD.

## Objetivos específicos

- Definir en Terraform, organizada en módulos, toda la infraestructura AWS del proyecto: observabilidad, seguridad, almacenamiento, catálogo, ingesta, ETL, orquestación y API. Debe poder crearse y destruirse con un solo comando, con alertas de presupuesto y sin superar 20 USD.

- Restaurar la base transaccional en Neon e ingerirla, junto con los tres lotes incrementales y los catálogos convertidos a CSV, en un Lakehouse sobre S3 con capas landing, bronze, silver y gold, con columnas de control de trazabilidad.

- Aplicar en la capa silver reglas documentadas de estandarización, deduplicación y anonimización (hash SHA-256 del documento del cliente), y verificarlas con conteos por capa en Athena.

- Construir en gold un modelo estrella con grano declarado y llaves sustitutas, particionado por año y mes, y cargar sus dimensiones, metas y tablas agregadas en un segundo proyecto de Neon.

- Orquestar el pipeline con AWS Step Functions a demanda, con reintentos, manejo de errores y control de lotes en DynamoDB, y procesar en vivo el lote de septiembre durante la sustentación.

- Publicar una API segura con API Gateway y Lambda (consultas parametrizadas, usuario de solo lectura, CORS restringido y throttling), y un tablero web público con KPIs, filtros y mapa de calor.


## Distribución del trabajo

El equipo se divide en tres roles. Cada integrante es responsable de una parte, pero todos conocen el sistema completo para responder en la sustentación. Cada uno trabaja desde su propia cuenta de GitHub, con commits propios, y desde su propio usuario IAM dentro de una única cuenta de AWS.

| Rol | Integrante | Responsabilidades | Módulos y componentes |
|---|---|---|---|
| **A · Infraestructura y orquestación** | Johan Leal | Cuenta AWS y usuarios IAM, alertas de presupuesto, Terraform completo, Lambdas de ingesta, Step Functions y control de lotes, conteos en Athena, evidencia de `terraform destroy` | `security`, `storage`, `catalog`, `ingestion`, `orchestration`, `observability` |
| **B · Ingeniería de datos** | Jhayder Florez | Restauración de la base en Neon, desarrollo local con la imagen Docker de Glue, jobs PySpark de extracción y transformación, reglas de calidad y deduplicación documentadas, lectura de los tres formatos de lote | `etl`: `extract_neon`, `to_bronze`, `to_silver`, `to_gold` |
| **C · Serving, API y tablero** | Andres Benitez | Esquema `dw` en el segundo Neon con usuario de solo lectura, carga de la capa de servicio, Lambda de la API, endpoints y documentación OpenAPI, tablero web en Vercel | `etl`: `load_serving`; `api`; frontend |

Las tareas compartidas son el README, los diagramas, la documentación de reglas y los ensayos de la sustentación.

## Cronograma de actividades

El proyecto va del lunes 23 de noviembre al miércoles 9 de diciembre de 2026, en tres semanas con un hito por semana.

### Semana 1 · Cimientos (23 – 29 de noviembre)

| Fecha | Johan Leal · Infraestructura | Jhayder Florez · Datos | Andres Benitez · API y tablero |
|---|---|---|---|
| Lun 23 | Lectura del enunciado y la arquitectura; creación de la cuenta AWS, MFA y usuarios IAM | Lectura del enunciado; revisión de los datos y los lotes | Lectura del enunciado; revisión de las 8 preguntas de negocio |
| Mar 24 | Alertas de presupuesto en la consola; repositorio en GitHub con su estructura | Creación del proyecto Neon 1 y restauración del `.pgdump` | Creación del proyecto Neon 2; elección del stack del tablero |
| Mié 25 | Terraform: backend de estado y módulos `storage` y `security` | Verificación de conteos en Neon; imagen Docker de Glue en local | Boceto (wireframe) del tablero |
| Jue 26 | Módulos `catalog` y `observability`; primer `terraform apply` | Job `extract_neon` en local; prueba de conexión a Neon | Proyecto Next.js y despliegue inicial en Vercel |
| Vie 27 | Módulo `ingestion`: Lambdas `ingest_drive` y `xlsx_to_csv` | Job `to_bronze` con columnas de control y `_hash_registro` | Prototipo del tablero con datos de ejemplo |
| Sáb 28 | Carga de lotes 1 y 2 y catálogos a landing; crawlers | Ejecución de `extract_neon` (carga full) y `to_bronze` en AWS | DDL del esquema `dw` (modelo estrella) |
| Dom 29 | Conteos landing y bronze en Athena | Inicio de `to_silver` | Ajustes al prototipo |

**Lunes 30 de noviembre · Avance 1:** base restaurada en Neon, Terraform base aplicado, carga en landing y bronze, prototipo del tablero.

### Semana 2 · El pipeline (30 de noviembre – 6 de diciembre)

| Fecha | Johan Leal · Infraestructura | Jhayder Florez · Datos | Andres Benitez · API y tablero |
|---|---|---|---|
| Lun 30 | Entrega del Avance 1; módulo `etl` (5 jobs, 2 workers G.1X) | `to_silver`: tipado, deduplicación, DIVIPOLA y anonimización | Lambda `api_kpis` con lectura del secreto |
| Mar 01 | Módulo `api`: HTTP API, CORS, throttling y permisos | `to_gold`: dimensiones, hechos y llaves sustitutas | `load_serving` hacia Neon `dw` (con B) |
| Mié 02 | Conteos por capa en Athena | Documento de reglas de calidad | Primer endpoint en producción |
| Jue 03 | Step Functions `pipeline_retail` y tabla `etl_control` | Lógica incremental y lectura del CSV regional | Endpoints restantes |
| Vie 04 | Reintentos, captura de errores y estado de fallo | Agregados (`agg_ventas_dia`, `agg_ventas_hora`, `agg_pagos_dia`) y `fact_metas` | Conexión del tablero a la API; filtros |
| Sáb 05 | Ensayo: `destroy` → `apply` → carga full → lotes 1 y 2 | Corrección de fallas | Mapa de calor y tiendas abiertas |
| Dom 06 | Documento OpenAPI y README | Diagramas de datos | Estados de carga y error; diseño responsive |

**Miércoles 2 de diciembre · Avance 2:** silver con deduplicación de los lotes 1 y 2, gold en estrella y al menos un endpoint de la API.

### Semana 3 · Producto (7 – 9 de diciembre)

| Fecha | Actividad (todo el equipo) |
|---|---|
| Lun 07 | Ensayo con un lote incremental procesado de punta a punta; revisión del gasto en Cost Explorer |
| Mar 08 | Ensayo general de la sustentación: cada integrante explica todas las partes |
| Mié 09 | **Sustentación final:** pipeline completo en Step Functions, tablero público, lote 3 procesado en vivo y evidencia de `terraform destroy` |
