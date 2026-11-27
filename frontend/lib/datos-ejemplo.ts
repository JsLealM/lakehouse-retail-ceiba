// DATOS DE EJEMPLO para el prototipo. No son datos reales de Ceiba:
// se reemplazan por la API (api_kpis) cuando esté desplegada.

import type { Canal, Tienda } from "./tipos";

type Base = [string, string, string, string, string, number, string, string, number];
// [codigo, municipio, departamento, zona, formato, m2, abre, cierra, tamaño relativo]

const BASE: Base[] = [
  ["BOG001", "Bogotá", "Cundinamarca", "Andina", "Hipermercado", 4200, "07:00", "22:00", 3.1],
  ["BOG002", "Bogotá", "Cundinamarca", "Andina", "Supermercado", 1800, "07:00", "21:00", 1.9],
  ["BOG003", "Bogotá", "Cundinamarca", "Andina", "Express", 350, "06:00", "23:00", 0.7],
  ["SOA001", "Soacha", "Cundinamarca", "Andina", "Supermercado", 1500, "07:00", "21:00", 1.3],
  ["MED001", "Medellín", "Antioquia", "Andina", "Hipermercado", 3900, "07:00", "22:00", 2.8],
  ["MED002", "Medellín", "Antioquia", "Andina", "Express", 300, "06:00", "23:00", 0.6],
  ["ENV001", "Envigado", "Antioquia", "Andina", "Supermercado", 1600, "08:00", "21:00", 1.4],
  ["BUC001", "Bucaramanga", "Santander", "Andina", "Supermercado", 1700, "07:00", "21:00", 1.5],
  ["TUN001", "Tunja", "Boyacá", "Andina", "Express", 280, "07:00", "21:00", 0.5],
  ["BAQ001", "Barranquilla", "Atlántico", "Caribe", "Hipermercado", 3600, "07:00", "22:00", 2.5],
  ["BAQ002", "Barranquilla", "Atlántico", "Caribe", "Express", 320, "06:00", "23:00", 0.6],
  ["CTG001", "Cartagena", "Bolívar", "Caribe", "Supermercado", 1900, "07:00", "22:00", 1.7],
  ["SMR001", "Santa Marta", "Magdalena", "Caribe", "Supermercado", 1400, "07:00", "21:00", 1.1],
  ["MTR001", "Montería", "Córdoba", "Caribe", "Express", 300, "07:00", "21:00", 0.5],
  ["CAL001", "Cali", "Valle del Cauca", "Pacífico", "Hipermercado", 3800, "07:00", "22:00", 2.6],
  ["CAL002", "Cali", "Valle del Cauca", "Pacífico", "Supermercado", 1600, "07:00", "21:00", 1.4],
  ["PAS001", "Pasto", "Nariño", "Pacífico", "Supermercado", 1300, "08:00", "20:00", 0.9],
  ["PER001", "Pereira", "Risaralda", "Eje Cafetero", "Supermercado", 1500, "07:00", "21:00", 1.2],
  ["MAN001", "Manizales", "Caldas", "Eje Cafetero", "Express", 290, "07:00", "21:00", 0.5],
  ["VIL001", "Villavicencio", "Meta", "Orinoquía", "Supermercado", 1400, "07:00", "21:00", 1.0],
];

const VENTA_BASE = 820_000_000; // venta neta mensual de una tienda de tamaño 1, COP
const REPARTO_CANAL: Record<Canal, number> = { "Tienda física": 0.78, Web: 0.13, App: 0.09 };

export const TIENDAS: Tienda[] = BASE.map(
  ([codigo, municipio, departamento, zona, formato, m2, abre, cierra, t], i) => {
    const venta = VENTA_BASE * t;
    const ticket = formato === "Express" ? 28_000 : formato === "Hipermercado" ? 74_000 : 52_000;
    const facturas = Math.round(venta / ticket);
    // Metas: algunas tiendas cumplen y otras no, para que el ejemplo muestre ambos casos.
    const cumplimiento = [0.94, 1.06, 0.88, 1.02, 0.97, 1.11, 0.91][i % 7];
    return {
      codigo,
      municipio,
      departamento,
      zona,
      formato,
      m2,
      abre,
      cierra,
      ventasPorCanal: {
        "Tienda física": venta * REPARTO_CANAL["Tienda física"],
        Web: venta * REPARTO_CANAL.Web,
        App: venta * REPARTO_CANAL.App,
      },
      facturasMes: facturas,
      unidadesMes: Math.round(facturas * (formato === "Express" ? 3.1 : 6.4)),
      metaMes: Math.round(venta / cumplimiento),
    };
  },
);

export const PERIODOS = [
  { valor: "2026-07", nombre: "Julio 2026", factor: 1.0 },
  { valor: "2026-08", nombre: "Agosto 2026", factor: 0.97 },
  { valor: "2026-09", nombre: "Septiembre 2026", factor: 1.04 },
];

export const CANALES: Canal[] = ["Tienda física", "Web", "App"];

export const MEDIOS_PAGO = [
  { medio: "Tarjeta débito", peso: 0.38 },
  { medio: "Tarjeta crédito", peso: 0.27 },
  { medio: "Efectivo", peso: 0.24 },
  { medio: "Transferencia", peso: 0.11 },
];

export const CATEGORIAS = [
  { nombre: "Despensa", peso: 0.24 },
  { nombre: "Lácteos y huevos", peso: 0.15 },
  { nombre: "Carnes", peso: 0.14 },
  { nombre: "Aseo del hogar", peso: 0.12 },
  { nombre: "Frutas y verduras", peso: 0.11 },
  { nombre: "Bebidas", peso: 0.1 },
];

export const MARCAS = [
  { nombre: "Ceiba (marca propia)", peso: 0.18 },
  { nombre: "Marca A", peso: 0.09 },
  { nombre: "Marca B", peso: 0.07 },
  { nombre: "Marca C", peso: 0.06 },
  { nombre: "Marca D", peso: 0.05 },
];

export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Forma de la curva de ventas por hora (0-23): picos al mediodía y en la tarde.
export function pesoHora(dia: number, hora: number, festivo: boolean): number {
  if (hora < 6 || hora > 22) return 0.02;
  const mediodia = Math.exp(-((hora - 12.5) ** 2) / 4);
  const tarde = Math.exp(-((hora - 18.5) ** 2) / 3);
  const finDeSemana = dia >= 5 || festivo;
  const base = 0.15 + 0.6 * mediodia + (finDeSemana ? 0.6 : 0.85) * tarde;
  return finDeSemana ? base * 1.25 : base;
}
