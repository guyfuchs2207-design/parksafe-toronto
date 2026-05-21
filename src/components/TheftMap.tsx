import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, useMap, Marker, useMapEvents } from "react-leaflet";
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
  onSelectReport?: (r: UserReport) => void;
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

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  useEffect(() => { onZoom(map.getZoom()); }, []);
  return null;
}

function HeatLayer({ points, visible }: { points: Theft[]; visible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!visible) return;
    const data = points.map((t) => [t.lat, t.lng, 0.6] as [number, number, number]);
    const layer = (L as any).heatLayer(data, {
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

export default function TheftMap({ center, radiusKm, thefts, userReports, searchPin, onSelect, onSelectReport, showHeatmap, allThefts }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const [zoom, setZoom] = useState(13);
  const detailed = zoom > 14;
  const [isDark, setIsDark] = useState(
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const markers = useMemo(
    () =>
      // When heatmap is on AND we're zoomed out, skip pins so they blend into the heatmap.
      // When zoomed in past 14, always show distinct markers regardless of heatmap.
      (showHeatmap && !detailed ? [] : thefts).map((t) => (
        <CircleMarker
          key={t.id}
          center={[t.lat, t.lng]}
          radius={detailed ? 7 : 3}
          pathOptions={{
            color: "oklch(0.68 0.22 25)",
            fillColor: "oklch(0.68 0.22 25)",
            fillOpacity: detailed ? 0.9 : 0.5,
            weight: detailed ? 2 : 0.5,
          }}
          eventHandlers={{ click: () => onSelect(t) }}
        />
      )),
    [thefts, onSelect, showHeatmap, detailed]
  );

  const reportMarkers = useMemo(
    () =>
      userReports.map((r) => (
        <CircleMarker
          key={`r-${r.id}`}
          center={[r.lat, r.lng]}
          radius={detailed ? 8 : 3}
          pathOptions={{
            color: "oklch(0.78 0.18 70)",
            fillColor: "oklch(0.78 0.18 70)",
            fillOpacity: detailed ? 0.95 : 0.55,
            weight: detailed ? 2 : 0.5,
          }}
          eventHandlers={{ click: () => onSelectReport?.(r) }}
        />
      )),
    [userReports, onSelectReport, detailed]
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
        key={isDark ? "dark" : "light"}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url={
          isDark
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        }
      />
      <Recenter center={center} />
      <ZoomTracker onZoom={setZoom} />
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
