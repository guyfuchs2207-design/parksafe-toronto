export interface Theft {
  id: string;
  lat: number;
  lng: number;
  offence: string;
  locationType: string;
  premisesType: string;
  neighbourhood: string;
  occDate: number;
  reportDate: number;
}

const ENDPOINT =
  "https://services.arcgis.com/S9th0jAJ7bqgIRjw/arcgis/rest/services/Auto_Theft_Open_Data/FeatureServer/0/query";

export async function fetchRecentThefts(limit = 4000): Promise<Theft[]> {
  const params = new URLSearchParams({
    where: "OCC_DATE > CURRENT_TIMESTAMP - INTERVAL '365' DAY",
    outFields:
      "EVENT_UNIQUE_ID,OFFENCE,LOCATION_TYPE,PREMISES_TYPE,NEIGHBOURHOOD_158,OCC_DATE,REPORT_DATE,LONG_WGS84,LAT_WGS84",
    orderByFields: "OCC_DATE DESC",
    resultRecordCount: String(limit),
    f: "geojson",
  });
  const res = await fetch(`${ENDPOINT}?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch thefts: ${res.status}`);
  const json = await res.json();
  return (json.features ?? [])
    .map((f: any): Theft | null => {
      const c = f.geometry?.coordinates;
      const p = f.properties ?? {};
      if (!c || c.length < 2 || !p.LAT_WGS84) return null;
      return {
        id: p.EVENT_UNIQUE_ID ?? String(f.id),
        lat: p.LAT_WGS84,
        lng: p.LONG_WGS84,
        offence: p.OFFENCE ?? "Auto Theft",
        locationType: p.LOCATION_TYPE ?? "Unknown",
        premisesType: p.PREMISES_TYPE ?? "Unknown",
        neighbourhood: p.NEIGHBOURHOOD_158 ?? "Toronto",
        occDate: p.OCC_DATE ?? 0,
        reportDate: p.REPORT_DATE ?? 0,
      };
    })
    .filter(Boolean) as Theft[];
}

// Haversine
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

export async function geocode(query: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&viewbox=-79.64,43.58,-79.12,43.85&bounded=1&q=${encodeURIComponent(
    query + ", Toronto, ON"
  )}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const arr = await res.json();
  if (!arr.length) return null;
  return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon), label: arr[0].display_name };
}
