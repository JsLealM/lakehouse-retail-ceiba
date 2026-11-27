const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const numero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export const pesos = (v: number) => cop.format(v);
export const entero = (v: number) => numero.format(v);
export const unDecimal = (v: number) => decimal.format(v);
export const porcentaje = (v: number) => `${Math.round(v * 100)} %`;

// Cifras grandes abreviadas: 1.234.000.000 → "$ 1.234 M"
export function pesosCortos(v: number): string {
  if (v >= 1e9) return `$ ${decimal.format(v / 1e9)} mil M`;
  if (v >= 1e6) return `$ ${numero.format(v / 1e6)} M`;
  return pesos(v);
}
