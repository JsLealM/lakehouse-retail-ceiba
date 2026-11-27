# Preguntas de negocio del tablero

El tablero responde 8 preguntas de negocio. Cada una tiene su bloque en el tablero, un endpoint de la API que la alimenta y unas tablas de Neon `dw` de donde salen los datos.

Boceto: `docs/diseno/boceto_tablero.png`

## Usuarios

| Usuario | Qué ve |
|---|---|
| Gerente general | Todo el país |
| Gerente de zona | Solo su zona (Caribe, Andina…) |
| Administrador de tienda | Solo su tienda |

Todos ven los mismos bloques; cambia el alcance de los datos.

## Filtros (aplican a todo el tablero)

Periodo · zona · departamento · formato de tienda · canal.

## Las 8 preguntas

| # | Pregunta | Qué muestra el tablero | Endpoint | Tablas en Neon `dw` |
|---|---|---|---|---|
| P1 | ¿Cuánto vendemos y cuál es el ticket? | 4 tarjetas: venta neta, número de facturas, ticket promedio, unidades por ticket | `GET /kpis/resumen` | `agg_ventas_dia` |
| P2 | ¿Qué tienda vende más? | Barras horizontales: top 10 tiendas, por venta total y por m² | `GET /kpis/ranking` | `agg_ventas_dia`, `dim_tienda` |
| P3 | ¿Dónde se vende más? | Mapa de calor por departamento, municipio y zona comercial | `GET /kpis/mapa` | `agg_ventas_dia`, `dim_tienda` |
| P4 | ¿Qué tiendas están abiertas ahora? | Conteo de abiertas/cerradas y lista con horario de hoy | `GET /kpis/tiendas-abiertas` | `dim_tienda`, `dim_tienda_horario` |
| P5 | ¿Cómo se vende? | Dona de canales y barras de medios de pago | `GET /kpis/canales-pagos` | `agg_ventas_dia`, `agg_pagos_dia`, `dim_canal`, `dim_medio_pago` |
| P6 | ¿A qué hora se vende más? | Cuadrícula día × hora, con opción de festivos vs. días normales | `GET /kpis/dia-hora` | `agg_ventas_hora`, `dim_fecha`, `dim_hora` |
| P7 | ¿Cumplimos la meta? | Barras de venta real vs. meta mensual por zona o tienda | `GET /kpis/metas` | `fact_metas`, `agg_ventas_dia` |
| P8 | ¿Qué productos se venden más? | Top categorías y marcas, y peso de la marca propia | `GET /kpis/productos` | Por definir (ver pendiente) |

## Pendiente

- **P8 necesita una tabla más.** Los 3 agregados del plan (`agg_ventas_dia`, `agg_ventas_hora`, `agg_pagos_dia`) no dicen si guardan el producto. Para el top de categorías y marcas hace falta un agregado por producto (por ejemplo `agg_ventas_producto_mes`) o que `agg_ventas_dia` incluya `producto_sk`. Definirlo con Jhayder antes del DDL de `dw`.
- Los nombres de los endpoints son una propuesta; se confirman al escribir `docs/openapi.yaml`.
