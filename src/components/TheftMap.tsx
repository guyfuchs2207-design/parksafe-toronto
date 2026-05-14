import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import type { Theft } from "@/lib/thefts";
import type { UserReport } from "@/lib/reports";

interface Props {
  center: [number, number];
  radiusKm: number;
  thefts: Theft[];
  userReports: UserReport[];
  searchPin: [number, number] | null;
  onSelect: (t: Theft) => void;
  showHeatmap: boolean;
  allThefts: Theft[];
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 13), { duration: 0.8 });
  }, [center[0], center[1]]);
  return null;
}

function HeatLayer({ points, visible }: { points: Theft[]; visible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!visible) return;
    const data = points.map((t) => [t.lat, t.lng, 0.6] as [number, number, number]);
    // @ts-expect-error - leaflet.heat extends L
    const layer = L.heatLayer(data, {
      radius: 28,
      blur: 22,
      maxZoom: 17,
      minOpacity: 0.35,
      gradient: {
        0.0: "#16a34a", // green = safe
        0.35: "#eab308", // yellow
        0.65: "#f97316", // orange
        1.0: "#dc2626", // red = dangerous
      },
    }).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [points, visible, map]);
  return null;
}

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;transform:translate(-50%,-100%)">
    <div style="width:18px;height:18px;border-radius:50%;background:oklch(0.72 0.16 250);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>
    <div class="pulse-ring" style="position:absolute;inset:0;background:oklch(0.72 0.16 250 / 0.5)"></div>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function TheftMap({ center, radiusKm, thefts, userReports, searchPin, onSelect, showHeatmap, allThefts }: Props) {
  const mapRef = useRef<L.Map | null>(null);

  const markers = useMemo(
    () =>
      (showHeatmap ? [] : thefts).map((t) => (
        <CircleMarker
          key={t.id}
          center={[t.lat, t.lng]}
          radius={5}
          pathOptions={{
            color: "oklch(0.68 0.22 25)",
            fillColor: "oklch(0.68 0.22 25)",
            fillOpacity: 0.7,
            weight: 1,
          }}
          eventHandlers={{ click: () => onSelect(t) }}
        >
          <Popup>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.offence}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{t.neighbourhood}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{t.locationType}</div>
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.6 }}>
                {new Date(t.occDate).toLocaleDateString()}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      )),
    [thefts, onSelect]
  );

  const reportMarkers = useMemo(
    () =>
      userReports.map((r) => (
        <CircleMarker
          key={`r-${r.id}`}
          center={[r.lat, r.lng]}
          radius={6}
          pathOptions={{
            color: "oklch(0.78 0.18 70)",
            fillColor: "oklch(0.78 0.18 70)",
            fillOpacity: 0.85,
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Community report · {r.offence}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{r.locationType}</div>
              {r.description && (
                <div style={{ fontSize: 12, marginTop: 6 }}>{r.description}</div>
              )}
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.6 }}>
                {new Date(r.occurredAt).toLocaleString()}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      )),
    [userReports]
  );

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
      ref={(m) => {
        if (m) mapRef.current = m;
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <Recenter center={center} />
      {searchPin && <Marker position={searchPin} icon={pinIcon} />}
      <HeatLayer points={allThefts} visible={showHeatmap} />
      <Circle
        center={center}
        radius={radiusKm * 1000}
        pathOptions={{
          color: "oklch(0.72 0.16 250)",
          fillColor: "oklch(0.72 0.16 250)",
          fillOpacity: 0.05,
          weight: 1.5,
          dashArray: "6 6",
        }}
      />
      {markers}
      {reportMarkers}
    </MapContainer>
  );
}
