// Piezas visuales reutilizables del tablero, hechas con HTML y SVG (sin librerías).

import type { ReactNode } from "react";

export function Tarjeta({
  titulo,
  pregunta,
  endpoint,
  children,
  className = "",
}: {
  titulo: string;
  pregunta: string;
  endpoint: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 ${className}`}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
        <span className="shrink-0 text-xs font-semibold text-slate-500">{pregunta}</span>
      </header>
      {children}
      <code className="mt-auto text-xs text-slate-500">{endpoint}</code>
    </section>
  );
}

export function Indicador({ nombre, valor, nota }: { nombre: string; valor: string; nota: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-5">
      <span className="text-sm text-slate-600">{nombre}</span>
      <span className="text-xl font-bold tracking-tight text-slate-900 sm:text-3xl">{valor}</span>
      <span className="text-xs text-slate-500">{nota}</span>
    </div>
  );
}

export function BarrasHorizontales({
  filas,
  formatear,
  colorClase = "bg-blue-600",
}: {
  filas: { etiqueta: string; detalle?: string; valor: number }[];
  formatear: (v: number) => string;
  colorClase?: string;
}) {
  const max = Math.max(...filas.map((f) => f.valor), 1);
  return (
    <ul className="flex flex-col gap-2">
      {filas.map((f) => (
        <li key={f.etiqueta} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-slate-700" title={f.detalle ?? f.etiqueta}>
            {f.etiqueta}
            {f.detalle && <span className="ml-1 text-xs text-slate-500">{f.detalle}</span>}
          </span>
          <span className="h-3.5 rounded bg-slate-100">
            <span
              className={`block h-3.5 rounded ${colorClase}`}
              style={{ width: `${(f.valor / max) * 100}%` }}
            />
          </span>
          <span className="w-24 text-right tabular-nums text-slate-700">{formatear(f.valor)}</span>
        </li>
      ))}
    </ul>
  );
}

const COLORES_DONA = ["#2563eb", "#ea580c", "#94a3b8", "#0d9488"];

export function Dona({ partes }: { partes: { nombre: string; valor: number }[] }) {
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1;
  const porcentajes = partes.map((p) => (p.valor / total) * 100);
  const inicios = porcentajes.map((_, i) => porcentajes.slice(0, i).reduce((s, v) => s + v, 0));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 42 42" className="h-32 w-32 -rotate-90" role="img" aria-label="Participación por canal">
        <circle cx="21" cy="21" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="7" />
        {partes.map((p, i) => (
          <circle
              key={p.nombre}
              cx="21"
              cy="21"
              r="15.915"
              fill="none"
              stroke={COLORES_DONA[i % COLORES_DONA.length]}
              strokeWidth="7"
            strokeDasharray={`${porcentajes[i]} ${100 - porcentajes[i]}`}
            strokeDashoffset={-inicios[i]}
          />
        ))}
      </svg>
      <ul className="flex flex-col gap-2 text-sm">
        {partes.map((p, i) => (
          <li key={p.nombre} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: COLORES_DONA[i % COLORES_DONA.length] }}
            />
            <span className="text-slate-700">{p.nombre}</span>
            <span className="tabular-nums text-slate-500">{Math.round((p.valor / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Escala de azules: de claro (menos venta) a oscuro (más venta).
export const ESCALA = ["#dbeafe", "#93c5fd", "#60a5fa", "#2563eb", "#1e3a8a"];
export const colorEscala = (proporcion: number) =>
  ESCALA[Math.min(ESCALA.length - 1, Math.floor(proporcion * ESCALA.length))];

export function LeyendaEscala() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      <span>Menos</span>
      {ESCALA.map((c) => (
        <span key={c} className="h-3 w-6" style={{ background: c }} />
      ))}
      <span>Más</span>
    </div>
  );
}
