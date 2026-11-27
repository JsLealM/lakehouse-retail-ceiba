// Capa de datos del tablero.
// Hoy calcula todo con los datos de ejemplo. Cuando la API esté desplegada, cada
// función se cambia por un fetch a su endpoint (por ejemplo GET /kpis/resumen) y
// los componentes siguen igual, porque reciben los mismos tipos.

import {
  CANALES,
  CATEGORIAS,
  COORDENADAS,
  DIAS,
  MARCAS,
  MEDIOS_PAGO,
  PERIODOS,
  TIENDAS,
  pesoHora,
} from "./datos-ejemplo";
import type {
  CanalesPagos,
  DiaHora,
  EstadoTienda,
  FilaMapa,
  FilaMeta,
  FilaRanking,
  Filtros,
  Productos,
  Resumen,
  Rol,
  Tienda,
} from "./tipos";

const factorPeriodo = (f: Filtros) => PERIODOS.find((p) => p.valor === f.periodo)?.factor ?? 1;

export function tiendasFiltradas(f: Filtros): Tienda[] {
  return TIENDAS.filter(
    (t) =>
      (f.zona === "Todas" || t.zona === f.zona) &&
      (f.departamento === "Todos" || t.departamento === f.departamento) &&
      (f.formato === "Todos" || t.formato === f.formato) &&
      (f.tienda === "Todas" || t.codigo === f.tienda),
  );
}

// Venta y peso del canal elegido para una tienda.
function ventaTienda(t: Tienda, f: Filtros) {
  const total = CANALES.reduce((s, c) => s + t.ventasPorCanal[c], 0);
  const venta =
    f.canal === "Todos" ? total : t.ventasPorCanal[f.canal as keyof Tienda["ventasPorCanal"]] ?? 0;
  return { venta: venta * factorPeriodo(f), peso: total ? venta / total : 0 };
}

// GET /kpis/resumen
export function obtenerResumen(f: Filtros): Resumen {
  let ventaNeta = 0;
  let facturas = 0;
  let unidades = 0;
  for (const t of tiendasFiltradas(f)) {
    const { venta, peso } = ventaTienda(t, f);
    ventaNeta += venta;
    facturas += t.facturasMes * peso * factorPeriodo(f);
    unidades += t.unidadesMes * peso * factorPeriodo(f);
  }
  return {
    ventaNeta,
    facturas: Math.round(facturas),
    ticketPromedio: facturas ? ventaNeta / facturas : 0,
    unidadesPorTicket: facturas ? unidades / facturas : 0,
  };
}

// GET /kpis/ranking
export function obtenerRanking(f: Filtros): FilaRanking[] {
  return tiendasFiltradas(f).map((t) => {
    const { venta } = ventaTienda(t, f);
    return { tienda: t.codigo, municipio: t.municipio, ventaNeta: venta, ventaPorM2: venta / t.m2 };
  });
}

// GET /kpis/mapa
export function obtenerMapa(f: Filtros): FilaMapa[] {
  const filas = new Map<string, FilaMapa>();
  for (const t of tiendasFiltradas(f)) {
    const [lat, lng] = COORDENADAS[t.municipio] ?? [4.6, -74.1];
    const fila = filas.get(t.municipio) ?? {
      municipio: t.municipio,
      departamento: t.departamento,
      zona: t.zona,
      lat,
      lng,
      ventaNeta: 0,
      tiendas: 0,
    };
    fila.ventaNeta += ventaTienda(t, f).venta;
    fila.tiendas += 1;
    filas.set(t.municipio, fila);
  }
  return [...filas.values()].sort((a, b) => b.ventaNeta - a.ventaNeta);
}

// GET /kpis/tiendas-abiertas
export function obtenerTiendasAbiertas(f: Filtros, horaActual: string): EstadoTienda[] {
  return tiendasFiltradas(f).map((t) => ({
    tienda: t.codigo,
    municipio: t.municipio,
    horario: `${t.abre} – ${t.cierra}`,
    abierta: horaActual >= t.abre && horaActual < t.cierra,
  }));
}

// GET /kpis/canales-pagos (los canales no usan el filtro de canal: muestran la mezcla completa)
export function obtenerCanalesPagos(f: Filtros): CanalesPagos {
  const tiendas = tiendasFiltradas(f);
  const factor = factorPeriodo(f);
  const canales = CANALES.map((canal) => ({
    canal,
    ventaNeta: tiendas.reduce((s, t) => s + t.ventasPorCanal[canal] * factor, 0),
  }));
  const total = obtenerResumen(f).ventaNeta;
  return { canales, mediosPago: MEDIOS_PAGO.map((m) => ({ medio: m.medio, valor: total * m.peso })) };
}

// GET /kpis/dia-hora
export function obtenerDiaHora(f: Filtros, festivos: boolean): DiaHora {
  const total = obtenerResumen(f).ventaNeta;
  const pesos = DIAS.map((_, d) => Array.from({ length: 24 }, (_, h) => pesoHora(d, h, festivos)));
  const suma = pesos.flat().reduce((s, p) => s + p, 0);
  return { dias: DIAS, valores: pesos.map((fila) => fila.map((p) => (total * p) / suma)) };
}

// GET /kpis/metas: el gerente general ve zonas; los demás ven sus tiendas.
export function obtenerMetas(f: Filtros, rol: Rol): FilaMeta[] {
  const grupos = new Map<string, FilaMeta>();
  for (const t of tiendasFiltradas(f)) {
    const nombre = rol === "general" ? t.zona : t.codigo;
    const fila = grupos.get(nombre) ?? { nombre, real: 0, meta: 0 };
    fila.real += ventaTienda(t, f).venta;
    fila.meta += t.metaMes * factorPeriodo(f) * ventaTienda(t, f).peso;
    grupos.set(nombre, fila);
  }
  return [...grupos.values()];
}

// GET /kpis/productos
export function obtenerProductos(f: Filtros): Productos {
  const total = obtenerResumen(f).ventaNeta;
  return {
    categorias: CATEGORIAS.map((c) => ({ nombre: c.nombre, ventaNeta: total * c.peso })),
    marcas: MARCAS.map((m) => ({ nombre: m.nombre, ventaNeta: total * m.peso })),
    pesoMarcaPropia: MARCAS[0].peso,
  };
}

// Opciones para los filtros
export const opciones = {
  periodos: PERIODOS,
  zonas: [...new Set(TIENDAS.map((t) => t.zona))],
  departamentos: [...new Set(TIENDAS.map((t) => t.departamento))].sort(),
  formatos: [...new Set(TIENDAS.map((t) => t.formato))],
  canales: CANALES,
  tiendas: TIENDAS.map((t) => ({ codigo: t.codigo, municipio: t.municipio })),
};
