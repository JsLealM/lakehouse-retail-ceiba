"use client";

// Mapa de Colombia con un punto por municipio. El tamaño y el color del punto
// dependen de la venta neta. Usa React Leaflet con el mapa base de OpenStreetMap.

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { pesosCortos } from "@/lib/formato";
import type { FilaMapa } from "@/lib/tipos";
import { colorEscala } from "./graficas";

export default function Mapa({ puntos }: { puntos: FilaMapa[] }) {
  const max = Math.max(...puntos.map((p) => p.ventaNeta), 1);
  return (
    <MapContainer
      center={[6.2, -74.6]}
      zoom={5}
      scrollWheelZoom={false}
      className="h-80 w-full rounded-lg"
      aria-label="Mapa de ventas por municipio"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {puntos.map((p) => {
        const proporcion = p.ventaNeta / max;
        return (
          <CircleMarker
            key={p.municipio}
            center={[p.lat, p.lng]}
            radius={6 + 16 * Math.sqrt(proporcion)}
            pathOptions={{
              color: "#1e3a8a",
              weight: 1,
              fillColor: colorEscala(proporcion),
              fillOpacity: 0.85,
            }}
          >
            <Tooltip>
              <strong>{p.municipio}</strong> ({p.departamento})
              <br />
              {pesosCortos(p.ventaNeta)} · {p.tiendas} {p.tiendas === 1 ? "tienda" : "tiendas"}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
