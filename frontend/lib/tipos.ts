// Tipos del tablero. Cada uno corresponde a la respuesta de un endpoint de la API
// (docs/diseno/preguntas_negocio.md). Cuando la API exista, solo cambia de dónde
// salen los datos; los componentes no cambian.

export type Rol = "general" | "zona" | "tienda";

export type Canal = "Tienda física" | "Web" | "App";

export interface Filtros {
  periodo: string; // "2026-07", "2026-08", "2026-09"
  zona: string; // "Todas" o nombre de la zona
  departamento: string; // "Todos" o nombre del departamento
  formato: string; // "Todos" o formato de tienda
  canal: string; // "Todos" o un Canal
  tienda: string; // "Todas" o código de tienda
}

export interface Tienda {
  codigo: string;
  municipio: string;
  departamento: string;
  zona: string;
  formato: string;
  m2: number;
  abre: string; // "HH:MM"
  cierra: string; // "HH:MM"
  ventasPorCanal: Record<Canal, number>; // venta neta mensual de referencia, COP
  facturasMes: number;
  unidadesMes: number;
  metaMes: number; // COP
}

// GET /kpis/resumen
export interface Resumen {
  ventaNeta: number;
  facturas: number;
  ticketPromedio: number;
  unidadesPorTicket: number;
}

// GET /kpis/ranking
export interface FilaRanking {
  tienda: string;
  municipio: string;
  ventaNeta: number;
  ventaPorM2: number;
}

// GET /kpis/mapa: un punto por municipio
export interface FilaMapa {
  municipio: string;
  departamento: string;
  zona: string;
  lat: number;
  lng: number;
  ventaNeta: number;
  tiendas: number;
}

// GET /kpis/tiendas-abiertas
export interface EstadoTienda {
  tienda: string;
  municipio: string;
  horario: string;
  abierta: boolean;
}

// GET /kpis/canales-pagos
export interface CanalesPagos {
  canales: { canal: string; ventaNeta: number }[];
  mediosPago: { medio: string; valor: number }[];
}

// GET /kpis/dia-hora
export interface DiaHora {
  dias: string[]; // Lun..Dom
  valores: number[][]; // [dia][hora 0-23], venta neta
}

// GET /kpis/metas
export interface FilaMeta {
  nombre: string; // zona o tienda
  real: number;
  meta: number;
}

// GET /kpis/productos
export interface Productos {
  categorias: { nombre: string; ventaNeta: number }[];
  marcas: { nombre: string; ventaNeta: number }[];
  pesoMarcaPropia: number; // 0..1
}
