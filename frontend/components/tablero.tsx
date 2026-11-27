"use client";

import { useEffect, useMemo, useState } from "react";
import {
  obtenerCanalesPagos,
  obtenerDiaHora,
  obtenerMapa,
  obtenerMetas,
  obtenerProductos,
  obtenerRanking,
  obtenerResumen,
  obtenerTiendasAbiertas,
  opciones,
} from "@/lib/api";
import { entero, pesos, pesosCortos, porcentaje, unDecimal } from "@/lib/formato";
import type { Filtros, Rol } from "@/lib/tipos";
import {
  BarrasHorizontales,
  Dona,
  Indicador,
  LeyendaEscala,
  Tarjeta,
  colorEscala,
} from "./graficas";

const ROLES: { valor: Rol; nombre: string }[] = [
  { valor: "general", nombre: "Gerente general" },
  { valor: "zona", nombre: "Gerente de zona" },
  { valor: "tienda", nombre: "Administrador de tienda" },
];

const FILTROS_INICIALES: Filtros = {
  periodo: "2026-07",
  zona: "Todas",
  departamento: "Todos",
  formato: "Todos",
  canal: "Todos",
  tienda: "Todas",
};

function horaBogota(): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

export default function Tablero() {
  const [rol, setRol] = useState<Rol>("general");
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [porM2, setPorM2] = useState(false);
  const [festivos, setFestivos] = useState(false);
  const [hora, setHora] = useState<string | null>(null);

  // La hora se calcula en el navegador para que coincida con la del usuario.
  useEffect(() => {
    const primera = setTimeout(() => setHora(horaBogota()), 0);
    const id = setInterval(() => setHora(horaBogota()), 60_000);
    return () => {
      clearTimeout(primera);
      clearInterval(id);
    };
  }, []);

  function cambiarRol(nuevo: Rol) {
    setRol(nuevo);
    setFiltros({
      ...FILTROS_INICIALES,
      periodo: filtros.periodo,
      zona: nuevo === "zona" ? opciones.zonas[0] : "Todas",
      tienda: nuevo === "tienda" ? opciones.tiendas[0].codigo : "Todas",
    });
  }

  const cambiar = (campo: keyof Filtros) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFiltros((f) => ({ ...f, [campo]: e.target.value }));

  const datos = useMemo(
    () => ({
      resumen: obtenerResumen(filtros),
      ranking: obtenerRanking(filtros),
      mapa: obtenerMapa(filtros),
      canalesPagos: obtenerCanalesPagos(filtros),
      diaHora: obtenerDiaHora(filtros, festivos),
      metas: obtenerMetas(filtros, rol),
      productos: obtenerProductos(filtros),
    }),
    [filtros, festivos, rol],
  );

  const tiendasAbiertas = hora ? obtenerTiendasAbiertas(filtros, hora) : [];
  const abiertas = tiendasAbiertas.filter((t) => t.abierta).length;

  const ranking = [...datos.ranking]
    .sort((a, b) => (porM2 ? b.ventaPorM2 - a.ventaPorM2 : b.ventaNeta - a.ventaNeta))
    .slice(0, 10);
  const maxMapa = Math.max(...datos.mapa.map((m) => m.ventaNeta), 1);
  const maxCelda = Math.max(...datos.diaHora.valores.flat(), 1);

  const departamentos =
    rol === "zona"
      ? [...new Set(datos.mapa.map((m) => m.departamento))].sort()
      : opciones.departamentos;

  const alcance =
    rol === "general"
      ? "Todo el país"
      : rol === "zona"
        ? `Zona ${filtros.zona}`
        : `Tienda ${filtros.tienda}`;

  const claseSelect =
    "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-500";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tablero de ventas Ceiba</h1>
          <p className="text-sm text-slate-600">
            {alcance} · Prototipo con <strong>datos de ejemplo</strong>
          </p>
        </div>
        <div
          role="group"
          aria-label="Tipo de usuario"
          className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1"
        >
          {ROLES.map((r) => (
            <button
              key={r.valor}
              type="button"
              aria-pressed={rol === r.valor}
              onClick={() => cambiarRol(r.valor)}
              className={`min-h-10 rounded-lg px-4 text-sm font-medium ${
                rol === r.valor ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {r.nombre}
            </button>
          ))}
        </div>
      </header>

      <section
        aria-label="Filtros"
        className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 lg:grid-cols-5"
      >
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
          Periodo
          <select className={claseSelect} value={filtros.periodo} onChange={cambiar("periodo")}>
            {opciones.periodos.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>

        {rol === "tienda" ? (
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
            Tienda
            <select className={claseSelect} value={filtros.tienda} onChange={cambiar("tienda")}>
              {opciones.tiendas.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.codigo} · {t.municipio}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
            Zona
            <select className={claseSelect} value={filtros.zona} onChange={cambiar("zona")}>
              {rol === "general" && <option value="Todas">Todas</option>}
              {opciones.zonas.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
          Departamento
          <select
            className={claseSelect}
            value={filtros.departamento}
            onChange={cambiar("departamento")}
            disabled={rol === "tienda"}
          >
            <option value="Todos">Todos</option>
            {departamentos.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
          Formato de tienda
          <select
            className={claseSelect}
            value={filtros.formato}
            onChange={cambiar("formato")}
            disabled={rol === "tienda"}
          >
            <option value="Todos">Todos</option>
            {opciones.formatos.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
          Canal
          <select className={claseSelect} value={filtros.canal} onChange={cambiar("canal")}>
            <option value="Todos">Todos</option>
            {opciones.canales.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </section>

      {datos.ranking.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          No hay tiendas con esta combinación de filtros.
        </p>
      ) : (
        <>
          {/* P1 · GET /kpis/resumen */}
          <section aria-label="Indicadores principales" className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Indicador nombre="Venta neta" valor={pesosCortos(datos.resumen.ventaNeta)} nota="Sin IVA" />
              <Indicador nombre="Facturas" valor={entero(datos.resumen.facturas)} nota="Número de facturas" />
              <Indicador
                nombre="Ticket promedio"
                valor={pesos(datos.resumen.ticketPromedio)}
                nota="Venta neta ÷ facturas"
              />
              <Indicador
                nombre="Unidades por ticket"
                valor={unDecimal(datos.resumen.unidadesPorTicket)}
                nota="Promedio de unidades"
              />
            </div>
            <code className="text-xs text-slate-500">P1 · GET /kpis/resumen</code>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Tarjeta titulo="Ranking de tiendas" pregunta="P2" endpoint="GET /kpis/ranking">
              <div className="flex gap-2">
                {[
                  { valor: false, nombre: "Venta total" },
                  { valor: true, nombre: "Venta por m²" },
                ].map((o) => (
                  <button
                    key={o.nombre}
                    type="button"
                    aria-pressed={porM2 === o.valor}
                    onClick={() => setPorM2(o.valor)}
                    className={`min-h-9 rounded-lg border px-3 text-sm ${
                      porM2 === o.valor
                        ? "border-blue-600 bg-blue-50 font-semibold text-blue-800"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    {o.nombre}
                  </button>
                ))}
              </div>
              <BarrasHorizontales
                filas={ranking.map((r) => ({
                  etiqueta: r.tienda,
                  detalle: r.municipio,
                  valor: porM2 ? r.ventaPorM2 : r.ventaNeta,
                }))}
                formatear={porM2 ? pesos : pesosCortos}
              />
            </Tarjeta>

            <Tarjeta titulo="Ventas por departamento" pregunta="P3" endpoint="GET /kpis/mapa">
              <p className="text-xs text-slate-500">
                En el tablero final esto será un mapa de Colombia; aquí se ve como mosaico.
              </p>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {datos.mapa.map((m) => {
                  const p = m.ventaNeta / maxMapa;
                  return (
                    <li
                      key={m.departamento}
                      className="flex flex-col rounded-lg p-3 text-sm"
                      style={{ background: colorEscala(p), color: p > 0.6 ? "#fff" : "#0f172a" }}
                    >
                      <span className="font-semibold">{m.departamento}</span>
                      <span className="text-xs opacity-90">
                        {m.zona} · {m.tiendas} {m.tiendas === 1 ? "tienda" : "tiendas"}
                      </span>
                      <span className="mt-1 tabular-nums">{pesosCortos(m.ventaNeta)}</span>
                    </li>
                  );
                })}
              </ul>
              <LeyendaEscala />
            </Tarjeta>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Tarjeta
              titulo="Ventas por día y hora"
              pregunta="P6"
              endpoint="GET /kpis/dia-hora"
              className="lg:col-span-2"
            >
              <div className="flex gap-2">
                {[
                  { valor: false, nombre: "Días normales" },
                  { valor: true, nombre: "Festivos" },
                ].map((o) => (
                  <button
                    key={o.nombre}
                    type="button"
                    aria-pressed={festivos === o.valor}
                    onClick={() => setFestivos(o.valor)}
                    className={`min-h-9 rounded-lg border px-3 text-sm ${
                      festivos === o.valor
                        ? "border-blue-600 bg-blue-50 font-semibold text-blue-800"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    {o.nombre}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <div
                  className="grid min-w-[560px] gap-0.5 text-xs"
                  style={{ gridTemplateColumns: "2.5rem repeat(24, minmax(0, 1fr))" }}
                >
                  <span />
                  {Array.from({ length: 24 }, (_, h) => (
                    <span key={h} className="text-center text-slate-500">
                      {h % 3 === 0 ? h : ""}
                    </span>
                  ))}
                  {datos.diaHora.dias.map((dia, d) => [
                    <span key={dia} className="pr-2 text-slate-600">
                      {dia}
                    </span>,
                    ...datos.diaHora.valores[d].map((v, h) => (
                      <span
                        key={`${dia}-${h}`}
                        className="h-5 rounded-sm"
                        style={{ background: colorEscala(v / maxCelda) }}
                        title={`${dia} ${h}:00 · ${pesosCortos(v)}`}
                      />
                    )),
                  ])}
                </div>
              </div>
              <LeyendaEscala />
            </Tarjeta>

            <Tarjeta titulo="Cómo se vende" pregunta="P5" endpoint="GET /kpis/canales-pagos">
              <Dona
                partes={datos.canalesPagos.canales.map((c) => ({ nombre: c.canal, valor: c.ventaNeta }))}
              />
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-slate-600">Medio de pago</h3>
                <BarrasHorizontales
                  filas={datos.canalesPagos.mediosPago.map((m) => ({ etiqueta: m.medio, valor: m.valor }))}
                  formatear={pesosCortos}
                  colorClase="bg-blue-400"
                />
              </div>
            </Tarjeta>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Tarjeta titulo="Cumplimiento de metas" pregunta="P7" endpoint="GET /kpis/metas">
              <ul className="flex flex-col gap-3">
                {datos.metas.map((m) => {
                  const pct = m.meta ? m.real / m.meta : 0;
                  const cumple = pct >= 1;
                  return (
                    <li key={m.nombre} className="flex flex-col gap-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-700">{m.nombre}</span>
                        <span className={`font-semibold ${cumple ? "text-green-700" : "text-orange-700"}`}>
                          {porcentaje(pct)}
                        </span>
                      </div>
                      <div className="relative h-3.5 rounded bg-slate-100">
                        <div
                          className={`h-3.5 rounded ${cumple ? "bg-green-600" : "bg-orange-500"}`}
                          style={{ width: `${Math.min(pct / 1.25, 1) * 100}%` }}
                        />
                        <div className="absolute -top-1 h-5.5 w-0.5 bg-slate-900" style={{ left: "80%" }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-slate-500">La línea negra es la meta del mes.</p>
            </Tarjeta>

            <Tarjeta titulo="Productos" pregunta="P8" endpoint="GET /kpis/productos">
              <h3 className="text-xs font-semibold text-slate-600">Top categorías</h3>
              <BarrasHorizontales
                filas={datos.productos.categorias.map((c) => ({ etiqueta: c.nombre, valor: c.ventaNeta }))}
                formatear={pesosCortos}
              />
              <h3 className="text-xs font-semibold text-slate-600">Top marcas</h3>
              <BarrasHorizontales
                filas={datos.productos.marcas.map((m) => ({ etiqueta: m.nombre, valor: m.ventaNeta }))}
                formatear={pesosCortos}
                colorClase="bg-blue-400"
              />
              <div className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm">
                <span className="text-slate-700">Peso de la marca propia</span>
                <strong>{porcentaje(datos.productos.pesoMarcaPropia)}</strong>
              </div>
            </Tarjeta>

            <Tarjeta titulo="Tiendas abiertas ahora" pregunta="P4" endpoint="GET /kpis/tiendas-abiertas">
              <p className="text-xs text-slate-500">Hora de Bogotá: {hora ?? "…"}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-green-50 p-3">
                  <div className="text-xs text-green-800">Abiertas</div>
                  <div className="text-2xl font-bold text-green-800">{hora ? abiertas : "…"}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">Cerradas</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {hora ? tiendasAbiertas.length - abiertas : "…"}
                  </div>
                </div>
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
                    <tr>
                      <th className="py-1.5 font-semibold">Tienda</th>
                      <th className="py-1.5 font-semibold">Horario</th>
                      <th className="py-1.5 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiendasAbiertas.map((t) => (
                      <tr key={t.tienda} className="border-t border-slate-100">
                        <td className="py-1.5">
                          {t.tienda} <span className="text-xs text-slate-500">{t.municipio}</span>
                        </td>
                        <td className="py-1.5 tabular-nums text-slate-600">{t.horario}</td>
                        <td className="py-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              t.abierta ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {t.abierta ? "Abierta" : "Cerrada"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tarjeta>
          </div>
        </>
      )}

      <footer className="text-xs text-slate-500">
        Prototipo: todas las cifras son de ejemplo. Los datos reales llegarán desde la API{" "}
        <code>api_kpis</code>.
      </footer>
    </main>
  );
}
