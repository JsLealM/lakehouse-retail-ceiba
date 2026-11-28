# #38 · Carga de lote_01, lote_02 y catálogos a landing

Fecha: 2026-11-27. Región us-east-2. Bucket `ceiba-lakehouse-771574032966`.

## Invocaciones

| Lambda | Evento | Resultado |
|---|---|---|
| `ceiba-ingest-drive` | `{"lote": "lote_01"}` | 4 archivos, `ya_cargado: false` (unos 4 s de punta a punta) |
| `ceiba-ingest-drive` | `{"lote": "lote_02"}` | 2 archivos, `ya_cargado: false` |
| `ceiba-ingest-drive` | `{"lote": "catalogos"}` | 3 archivos `.xlsx`, `ya_cargado: false` |
| `ceiba-xlsx-to-csv` | `{}` | 3 `.csv`: divipola 62 filas, festivos 72, metas 151 |

La Lambda descarga del Drive del profesor el zip `drive_proyecto_retail.zip` y sube los archivos del lote sin
modificarlos. El `lote_03` NO se cargó: se procesa el día de la sustentación.

## Contenido de landing (tamaño en S3 comparado con el archivo original)

| Clave | Bytes | Comparación |
|---|---:|---|
| `landing/fuente=catalogos_divipola_geografia/fecha_ingesta=2026-11-27/divipola_geografia.csv` | 3310 | CSV convertido |
| `landing/fuente=catalogos_divipola_geografia/fecha_ingesta=2026-11-27/divipola_geografia.xlsx` | 8345 | igual al original |
| `landing/fuente=catalogos_festivos_colombia/fecha_ingesta=2026-11-27/festivos_colombia.csv` | 3534 | CSV convertido |
| `landing/fuente=catalogos_festivos_colombia/fecha_ingesta=2026-11-27/festivos_colombia.xlsx` | 6655 | igual al original |
| `landing/fuente=catalogos_metas_venta/fecha_ingesta=2026-11-27/metas_venta.csv` | 36505 | CSV convertido |
| `landing/fuente=catalogos_metas_venta/fecha_ingesta=2026-11-27/metas_venta.xlsx` | 24721 | igual al original |
| `landing/fuente=lote_01_clientes/fecha_ingesta=2026-11-27/clientes.csv` | 373578 | igual al original |
| `landing/fuente=lote_01_detalle_factura/fecha_ingesta=2026-11-27/detalle_factura.csv` | 8785459 | igual al original |
| `landing/fuente=lote_01_facturas/fecha_ingesta=2026-11-27/facturas.csv` | 8376453 | igual al original |
| `landing/fuente=lote_01_pagos_factura/fecha_ingesta=2026-11-27/pagos_factura.csv` | 1749598 | igual al original |
| `landing/fuente=lote_02_clientes/fecha_ingesta=2026-11-27/clientes.jsonl` | 908411 | igual al original |
| `landing/fuente=lote_02_ventas/fecha_ingesta=2026-11-27/ventas.jsonl` | 44161427 | igual al original |

Captura de la consola: `38-consola-landing.png`.
