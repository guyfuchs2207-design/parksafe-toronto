import { useState } from "react";
import { Share2, AlertCircle, Car, FileText, ChevronDown, ChevronUp } from "lucide-react";
import type { RiskAssessment } from "@/lib/risk";
import { buildPredictiveAlert, buildShareText, VEHICLE_RISK } from "@/lib/risk";

interface Props {
  risk: RiskAssessment;
  locationLabel: string;
  radiusKm: number;
  vehicleIdx: number;
  onVehicleChange: (idx: number) => void;
  onOpenClaim: () => void;
}

const LEVEL_STYLES: Record<RiskAssessment["level"], { bg: string; text: string; ring: string; label: string }> = {
  low: {
    bg: "bg-[oklch(0.32_0.12_150)]",
    text: "text-[oklch(0.92_0.14_150)]",
    ring: "ring-[oklch(0.6_0.18_150)]",
    label: "Low risk",
  },
  medium: {
    bg: "bg-[oklch(0.38_0.16_75)]",
    text: "text-[oklch(0.92_0.16_85)]",
    ring: "ring-[oklch(0.7_0.18_75)]",
    label: "Medium risk",
  },
  high: {
    bg: "bg-[oklch(0.36_0.18_25)]",
    text: "text-[oklch(0.92_0.16_25)]",
    ring: "ring-[oklch(0.7_0.2_25)]",
    label: "High risk",
  },
};

export default function RiskPanel({
  risk,
  locationLabel,
  radiusKm,
  vehicleIdx,
  onVehicleChange,
  onOpenClaim,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const v = VEHICLE_RISK[vehicleIdx];
  const vehicleLabel =
    v.multiplier > 1 ? `${v.make} ${v.model}`.trim() : undefined;
  const alertMsg = buildPredictiveAlert(risk, vehicleLabel);
  const styles = LEVEL_STYLES[risk.level];

  async function share() {
    const text = buildShareText(risk, locationLabel, radiusKm);
    try {
      if (navigator.share) {
        await navigator.share({ title: "ParkSafe Toronto", text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Parking risk score
          </div>
          <div className="truncate text-sm font-semibold">{locationLabel}</div>
        </div>
        <button
          onClick={() => setExpanded((x) => !x)}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Toggle"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      <div className={`mt-3 flex items-center gap-3 rounded-xl ${styles.bg} p-3 ring-1 ${styles.ring}`}>
        <div className={`text-3xl font-bold ${styles.text}`}>{risk.score}</div>
        <div>
          <div className={`text-sm font-semibold ${styles.text}`}>{styles.label}</div>
          <div className="text-[11px] text-foreground/70">
            {risk.count90d} thefts · {radiusKm} km · 90 days
            {risk.trendPct !== 0 && (
              <> · {risk.trendPct > 0 ? "+" : ""}{risk.trendPct}% vs prior month</>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <>
          {alertMsg && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <p className="text-xs leading-relaxed text-foreground">{alertMsg}</p>
            </div>
          )}

          <label className="mt-3 block">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Car className="h-3 w-3" /> Your vehicle
            </div>
            <select
              value={vehicleIdx}
              onChange={(e) => onVehicleChange(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-ring focus:outline-none"
            >
              {VEHICLE_RISK.map((veh, i) => (
                <option key={i} value={i}>
                  {veh.model ? `${veh.make} ${veh.model}` : veh.make}
                  {veh.multiplier > 1 ? `  · ${veh.multiplier.toFixed(1)}× targeted` : ""}
                </option>
              ))}
            </select>
            {v.multiplier > 1 && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {v.make} {v.model} is among the most-stolen vehicles in the GTA. Score is adjusted{" "}
                <span className="font-medium text-foreground">{v.multiplier.toFixed(1)}×</span>.
              </p>
            )}
          </label>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={share}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted py-2 text-xs font-medium hover:bg-muted/70"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <button
              onClick={onOpenClaim}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted py-2 text-xs font-medium hover:bg-muted/70"
            >
              <FileText className="h-3.5 w-3.5" /> Claim help
            </button>
          </div>
        </>
      )}
    </div>
  );
}
