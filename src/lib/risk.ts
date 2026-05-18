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

// Broad catalog for autocomplete. Lookup is fuzzy, so users can also type
// anything not on this list — we'll still match by make / partial model.
export const VEHICLE_CATALOG: Record<string, string[]> = {
  Acura: ["MDX", "RDX", "TLX", "ILX", "Integra", "NSX", "ZDX"],
  Audi: ["A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron", "RS6"],
  BMW: ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X6", "X7", "M3", "M5"],
  Buick: ["Enclave", "Encore", "Envision", "Regal"],
  Cadillac: ["CT4", "CT5", "Escalade", "XT4", "XT5", "XT6"],
  Chevrolet: ["Blazer", "Bolt", "Camaro", "Colorado", "Corvette", "Cruze", "Equinox", "Impala", "Malibu", "Silverado", "Suburban", "Tahoe", "Trailblazer", "Traverse", "Trax"],
  Chrysler: ["300", "Pacifica", "Voyager"],
  Dodge: ["Challenger", "Charger", "Durango", "Grand Caravan", "Journey", "Ram 1500", "Ram 2500"],
  Fiat: ["500", "500X"],
  Ford: ["Bronco", "Bronco Sport", "EcoSport", "Edge", "Escape", "Expedition", "Explorer", "F-150", "F-250", "F-350", "Fiesta", "Focus", "Fusion", "Maverick", "Mustang", "Mustang Mach-E", "Ranger", "Transit"],
  Genesis: ["G70", "G80", "G90", "GV70", "GV80"],
  GMC: ["Acadia", "Canyon", "Sierra", "Terrain", "Yukon"],
  Honda: ["Accord", "Civic", "CR-V", "CR-V Hybrid", "HR-V", "Insight", "Odyssey", "Passport", "Pilot", "Ridgeline"],
  Hyundai: ["Accent", "Elantra", "Ioniq", "Ioniq 5", "Kona", "Palisade", "Santa Cruz", "Santa Fe", "Sonata", "Tucson", "Venue"],
  Infiniti: ["Q50", "Q60", "QX50", "QX55", "QX60", "QX80"],
  Jaguar: ["E-Pace", "F-Pace", "I-Pace", "XE", "XF"],
  Jeep: ["Cherokee", "Compass", "Gladiator", "Grand Cherokee", "Grand Wagoneer", "Renegade", "Wagoneer", "Wrangler"],
  Kia: ["Carnival", "EV6", "Forte", "K5", "Niro", "Rio", "Seltos", "Sorento", "Soul", "Sportage", "Stinger", "Telluride"],
  "Land Rover": ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"],
  Lexus: ["ES", "GX", "IS", "LS", "LX", "NX", "RC", "RX", "RZ", "TX", "UX"],
  Lincoln: ["Aviator", "Corsair", "Nautilus", "Navigator"],
  Mazda: ["CX-3", "CX-30", "CX-5", "CX-50", "CX-9", "CX-90", "Mazda3", "Mazda6", "MX-5 Miata"],
  "Mercedes-Benz": ["A-Class", "C-Class", "CLA", "E-Class", "G-Class", "GLA", "GLB", "GLC", "GLE", "GLS", "S-Class", "Sprinter"],
  Mini: ["Cooper", "Countryman", "Clubman"],
  Mitsubishi: ["Eclipse Cross", "Mirage", "Outlander", "RVR"],
  Nissan: ["Altima", "Armada", "Frontier", "Kicks", "Leaf", "Maxima", "Murano", "Pathfinder", "Rogue", "Sentra", "Titan", "Versa"],
  Polestar: ["Polestar 2", "Polestar 3"],
  Porsche: ["911", "Cayenne", "Macan", "Panamera", "Taycan"],
  Ram: ["1500", "2500", "3500", "ProMaster"],
  Rivian: ["R1S", "R1T"],
  Subaru: ["Ascent", "BRZ", "Crosstrek", "Forester", "Impreza", "Legacy", "Outback", "WRX"],
  Tesla: ["Model 3", "Model S", "Model X", "Model Y", "Cybertruck"],
  Toyota: ["4Runner", "86", "bZ4X", "C-HR", "Camry", "Corolla", "Corolla Cross", "Crown", "GR86", "GR Corolla", "Highlander", "Highlander Hybrid", "Land Cruiser", "Prius", "RAV4", "RAV4 Hybrid", "RAV4 Prime", "Sequoia", "Sienna", "Supra", "Tacoma", "Tundra", "Venza"],
  Volkswagen: ["Arteon", "Atlas", "Atlas Cross Sport", "Golf", "GTI", "ID.4", "Jetta", "Passat", "Taos", "Tiguan"],
  Volvo: ["S60", "S90", "V60", "V90", "XC40", "XC60", "XC90"],
};

export const VEHICLE_MAKES = Object.keys(VEHICLE_CATALOG).sort();

// Colour-based theft risk (Toronto/GTA data: dark + neutral colours are
// over-represented in theft reports because they're the most common cars
// on the road and easier to blend in after the fact).
const COLOUR_MULTIPLIER: Record<string, number> = {
  black: 1.10,
  white: 1.08,
  silver: 1.08,
  grey: 1.06,
  gray: 1.06,
  blue: 1.0,
  red: 0.95,
  green: 0.92,
  brown: 0.95,
  yellow: 0.85,
  orange: 0.85,
};

export function colourMultiplier(colour?: string | null): number {
  if (!colour) return 1;
  return COLOUR_MULTIPLIER[colour.trim().toLowerCase()] ?? 1;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Fuzzy lookup of a vehicle's theft-risk multiplier from typed make/model. */
export function lookupVehicleMultiplier(make?: string | null, model?: string | null): number {
  if (!make && !model) return 1;
  const m = norm(make ?? "");
  const mo = norm(model ?? "");
  let best = 1;
  for (const entry of VEHICLE_RISK) {
    const em = norm(entry.make);
    const emo = norm(entry.model);
    if (!em) continue;
    const makeMatch = m && (em === m || em.includes(m) || m.includes(em));
    if (!makeMatch) continue;
    // Make matches. If model is empty on either side, take a softer bonus.
    if (!emo) {
      best = Math.max(best, 1 + (entry.multiplier - 1) * 0.4);
      continue;
    }
    if (!mo) {
      best = Math.max(best, 1 + (entry.multiplier - 1) * 0.3);
      continue;
    }
    if (emo === mo || emo.includes(mo) || mo.includes(emo)) {
      best = Math.max(best, entry.multiplier);
    } else {
      // Same make, different model — small generic boost.
      best = Math.max(best, 1 + (entry.multiplier - 1) * 0.25);
    }
  }
  return best;
}

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
