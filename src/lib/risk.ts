import type { Theft } from "./thefts";
import { distanceKm } from "./thefts";

// Vehicles disproportionately targeted in the GTA based on IBC / TPS reports.
// Multiplier represents relative theft rate vs. baseline (1.0).
export const VEHICLE_RISK: { make: string; model: string; multiplier: number }[] = [
  { make: "Honda", model: "CR-V", multiplier: 1.6 },
  { make: "Honda", model: "Civic", multiplier: 1.4 },
  { make: "Lexus", model: "RX", multiplier: 1.7 },
  { make: "Toyota", model: "Highlander", multiplier: 1.6 },
  { make: "Toyota", model: "RAV4", multiplier: 1.5 },
  { make: "Ford", model: "F-150", multiplier: 1.5 },
  { make: "Jeep", model: "Grand Cherokee", multiplier: 1.5 },
  { make: "Jeep", model: "Wrangler", multiplier: 1.3 },
  { make: "Land Rover", model: "Range Rover", multiplier: 1.6 },
  { make: "Acura", model: "MDX", multiplier: 1.5 },
  { make: "Acura", model: "RDX", multiplier: 1.4 },
  { make: "Dodge", model: "Ram 1500", multiplier: 1.4 },
  { make: "BMW", model: "X5", multiplier: 1.3 },
  { make: "Other / Not listed", model: "", multiplier: 1.0 },
];

export type RiskLevel = "low" | "medium" | "high";

export interface RiskAssessment {
  level: RiskLevel;
  score: number; // 0-100
  count90d: number;
  count30d: number;
  count60to30d: number;
  trendPct: number;
  density: number; // incidents per km² in 90d
  peakDays: string[]; // e.g. ["Fri", "Sat"]
  peakHourBand: string | null; // e.g. "10pm–4am"
  vehicleMultiplier: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function assessRisk(
  thefts: Theft[],
  center: [number, number],
  radiusKm: number,
  vehicleMultiplier = 1.0
): RiskAssessment {
  const now = Date.now();
  const D = 86400000;
  const within = thefts.filter(
    (t) => distanceKm(center, [t.lat, t.lng]) <= radiusKm
  );
  const last90 = within.filter((t) => now - t.occDate < 90 * D);
  const last30 = within.filter((t) => now - t.occDate < 30 * D);
  const prev30 = within.filter(
    (t) => now - t.occDate >= 30 * D && now - t.occDate < 60 * D
  );

  const trendPct =
    prev30.length === 0
      ? last30.length > 0
        ? 100
        : 0
      : Math.round(((last30.length - prev30.length) / prev30.length) * 100);

  const area = Math.PI * radiusKm * radiusKm;
  const density = last90.length / area;

  // Day of week histogram
  const byDay = new Array(7).fill(0);
  const byHour = new Array(24).fill(0);
  for (const t of last90) {
    const d = new Date(t.occDate);
    byDay[d.getUTCDay()]++;
    byHour[d.getUTCHours()]++;
  }
  const maxDay = Math.max(...byDay, 1);
  const peakDays = byDay
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c >= maxDay * 0.85 && x.c > 0)
    .map((x) => DAY_LABELS[x.i]);

  // Peak hour band - find consecutive 6h window with most incidents
  let bestStart = -1;
  let bestSum = 0;
  for (let s = 0; s < 24; s++) {
    let sum = 0;
    for (let h = 0; h < 6; h++) sum += byHour[(s + h) % 24];
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = s;
    }
  }
  const fmt = (h: number) => {
    const x = h % 24;
    if (x === 0) return "12am";
    if (x < 12) return `${x}am`;
    if (x === 12) return "12pm";
    return `${x - 12}pm`;
  };
  const peakHourBand =
    bestStart >= 0 && bestSum >= 3 ? `${fmt(bestStart)}–${fmt(bestStart + 6)}` : null;

  // Score: density-weighted, vehicle-adjusted, trend-adjusted
  const baseScore = Math.min(100, Math.round(density * 12 * vehicleMultiplier));
  const trendBoost = trendPct > 0 ? Math.min(15, trendPct / 10) : 0;
  const score = Math.min(100, Math.round(baseScore + trendBoost));

  let level: RiskLevel;
  if (score >= 60) level = "high";
  else if (score >= 30) level = "medium";
  else level = "low";

  return {
    level,
    score,
    count90d: last90.length,
    count30d: last30.length,
    count60to30d: prev30.length,
    trendPct,
    density,
    peakDays,
    peakHourBand,
    vehicleMultiplier,
  };
}

export function buildPredictiveAlert(r: RiskAssessment, vehicleLabel?: string): string | null {
  if (r.count90d < 3) return null;
  const parts: string[] = [];
  if (r.peakDays.length && r.peakDays.length <= 4) {
    parts.push(`Theft activity here typically spikes ${r.peakDays.join("–")}`);
  }
  if (r.peakHourBand) {
    parts.push(`between ${r.peakHourBand}`);
  }
  if (parts.length === 0) return null;
  let msg = parts.join(" ") + ".";
  if (vehicleLabel && r.vehicleMultiplier > 1.1) {
    msg += ` Your ${vehicleLabel} is on the high-risk list — extra caution recommended.`;
  } else if (r.trendPct > 25) {
    msg += ` Incidents are up ${r.trendPct}% over last month.`;
  } else {
    msg += " Stay alert during these windows.";
  }
  return msg;
}

export function buildShareText(
  r: RiskAssessment,
  locationLabel: string,
  radiusKm: number
): string {
  const emoji = r.level === "high" ? "🔴" : r.level === "medium" ? "🟡" : "🟢";
  return (
    `${emoji} ParkSafe risk for ${locationLabel}: ${r.level.toUpperCase()} (${r.score}/100)\n` +
    `${r.count90d} vehicle thefts within ${radiusKm} km in last 90 days` +
    (r.peakDays.length ? `\nPeak days: ${r.peakDays.join(", ")}` : "") +
    (r.peakHourBand ? `\nPeak hours: ${r.peakHourBand}` : "") +
    `\nSource: Toronto Police Service open data via ParkSafe Toronto`
  );
}
