# Respuestas de ejemplo de la API

Estos JSON muestran la forma exacta que devolverán los endpoints de `api_kpis` (julio 2026, sin filtros). Son datos de ejemplo, no reales.

| Archivo | Endpoint |
|---|---|
| `kpis-resumen.json` | `GET /kpis/resumen` |
| `kpis-ranking.json` | `GET /kpis/ranking` |
| `kpis-mapa.json` | `GET /kpis/mapa` |

El prototipo calcula estas mismas respuestas en `lib/api.ts` a partir de `lib/datos-ejemplo.ts`, para que los filtros funcionen. Los tipos de cada respuesta están en `lib/tipos.ts`. Cuando la API esté desplegada, las funciones de `lib/api.ts` se cambian por llamadas a estos endpoints y los componentes siguen igual.
