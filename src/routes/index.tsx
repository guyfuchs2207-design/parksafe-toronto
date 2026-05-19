import AuthPanel from "@/components/AuthPanel";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Search, MapPin, AlertTriangle, TrendingUp, Loader2, Shield, X, Plus, Send, Users, Flame, LocateFixed, ChevronDown, ChevronUp } from "lucide-react";
import { fetchRecentThefts, geocode, distanceKm, type Theft } from "@/lib/thefts";
import { fetchUserReports, submitUserReport, type UserReport } from "@/lib/reports";
import { assessRisk, lookupVehicleMultiplier, colourMultiplier } from "@/lib/risk";
import RiskPanel, { type VehicleInput } from "@/components/RiskPanel";
import ClaimGuide from "@/components/ClaimGuide";
import { getProfile } from "@/lib/profile";

const TheftMap = lazy(() => import("@/components/TheftMap"));

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "ParkSafe Toronto — Live Vehicle Theft Map" },
      { name: "description", content: "Visualize recent vehicle theft incidents across Toronto using public Toronto Police Service data. Search any address and see thefts within 1, 3, or 5 km." },
    ],
  }),
});

const TORONTO: [number, number] = [43.6532, -79.3832];
const RADII = [1, 3, 5] as const;
const EMPTY_VEHICLE: VehicleInput = { make: "", model: "", colour: "" };

function Index() {
  const [mounted, setMounted] = useState(false);
  const [thefts, setThefts] = useState<Theft[]>([]);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>(TORONTO);
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState<number>(3);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchLabel, setSearchLabel] = useState<string | null>(null);
  const [selected, setSelected] = useState<Theft | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleInput>(EMPTY_VEHICLE);
  const [claimOpen, setClaimOpen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [locating, setLocating] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    Promise.all([
      fetchRecentThefts().catch((e) => { setError(e.message); return [] as Theft[]; }),
      fetchUserReports().catch(() => [] as UserReport[]),
    ]).then(([t, r]) => {
      setThefts(t);
      setUserReports(r);
    }).finally(() => setLoading(false));
    getProfile().then((p) => {
      if (!p) return;
      setVehicle({ make: p.vehicleMake ?? "", model: p.vehicleModel ?? "", colour: p.vehicleColour ?? "" });
      if (p.homeLat != null && p.homeLng != null) {
        setCenter([p.homeLat, p.homeLng]);
        setPin([p.homeLat, p.homeLng]);
        setSearchLabel((p.homeAddress ?? "Home").split(",").slice(0, 2).join(","));
      }
    }).catch(() => {});
  }, []);

  const inRadius = useMemo(
    () => thefts.filter((t) => distanceKm(center, [t.lat, t.lng]) <= radius).sort((a, b) => b.occDate - a.occDate),
    [thefts, center, radius]
  );

  const reportsInRadius = useMemo(
    () => userReports.filter((r) => distanceKm(center, [r.lat, r.lng]) <= radius).sort((a, b) => b.occurredAt - a.occurredAt),
    [userReports, center, radius]
  );

  const stats = useMemo(() => {
    const count = inRadius.length;
    const recent = inRadius[0];
    const now = Date.now();
    const last30 = inRadius.filter((t) => now - t.occDate < 30 * 86400000).length;
    const prev30 = inRadius.filter((t) => now - t.occDate >= 30 * 86400000 && now - t.occDate < 60 * 86400000).length;
    const trend = prev30 === 0 ? (last30 > 0 ? 100 : 0) : Math.round(((last30 - prev30) / prev30) * 100);
    return { count, recent, last30, trend };
  }, [inRadius]);

  const vehicleMultiplier = useMemo(
    () => lookupVehicleMultiplier(vehicle.make, vehicle.model) * colourMultiplier(vehicle.colour),
    [vehicle.make, vehicle.model, vehicle.colour]
  );

  const risk = useMemo(
    () => assessRisk(thefts, center, radius, vehicleMultiplier),
    [thefts, center, radius, vehicleMultiplier]
  );

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const r = await geocode(query.trim());
      if (!r) { setError("Address not found in Toronto."); }
      else { setCenter([r.lat, r.lng]); setPin([r.lat, r.lng]); setSearchLabel(r.label.split(",").slice(0, 2).join(",")); }
    } catch { setError("Search failed. Try again."); }
    finally { setSearching(false); }
  }

  function handleLocate() {
    if (!navigator.geolocation) { setError("Geolocation is not supported by your browser."); return; }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { const c: [number, number] = [pos.coords.latitude, pos.coords.longitude]; setCenter(c); setPin(c); setSearchLabel("My location"); setLocating(false); },
      (err) => { setError(err.message || "Could not get your location."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleReportAdded(r: UserReport) { setUserReports((prev) => [r, ...prev]); }

  return (
    <div className="dark relative h-screen w-full overflow-hidden bg-background text-foreground">

      {/* ── HEADER ── */}
      <header className="absolute left-0 right-0 top-0 z-[1000] px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="mx-auto max-w-6xl rounded-2xl border border-border bg-card/85 p-2.5 backdrop-blur-xl shadow-2xl sm:p-3">

          {/* Single row on desktop, two rows on mobile */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Logo — always visible */}
            <div className="flex shrink-0 items-center gap-2 px-0.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:h-9 sm:w-9">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="hidden leading-tight sm:block">
                <h1 className="text-sm font-semibold tracking-tight">ParkSafe</h1>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Toronto</p>
              </div>
            </div>

            {/* Search — grows to fill */}
            <form onSubmit={handleSearch} className="flex flex-1 items-center gap-1.5 sm:gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search address…"
                  className="w-full rounded-xl border border-border bg-input py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 sm:py-2.5"
                />
              </div>
              <button type="submit" disabled={searching}
                className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50 sm:px-4 sm:py-2.5">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </button>
              <button type="button" onClick={handleLocate} disabled={locating} title="Use my location"
                className="flex items-center justify-center rounded-xl border border-border bg-muted px-2.5 py-2 text-foreground transition hover:bg-muted/70 disabled:opacity-50 sm:px-3 sm:py-2.5">
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              </button>
            </form>

            {/* Controls — hidden on mobile, shown on desktop */}
            <div className="hidden items-center gap-2 sm:flex">
              <button type="button" onClick={() => setShowHeatmap((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${showHeatmap ? "bg-primary text-primary-foreground shadow" : "border border-border bg-muted text-muted-foreground hover:text-foreground"}`}>
                <Flame className="h-3.5 w-3.5" /> Heat
              </button>
              <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
                {RADII.map((r) => (
                  <button key={r} onClick={() => setRadius(r)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${radius === r ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                    {r} km
                  </button>
                ))}
              </div>
              <button onClick={() => setAuthOpen(true)}
                className="rounded-xl border border-border bg-muted px-3 py-2 text-xs font-medium hover:bg-muted/70">
                Account
              </button>
            <PwaStatus />
            </div>
          </div>

          {/* Mobile-only second row: controls */}
          <div className="mt-2 flex items-center gap-1.5 sm:hidden">
            <button type="button" onClick={() => setShowHeatmap((v) => !v)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${showHeatmap ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-muted-foreground"}`}>
              <Flame className="h-3 w-3" /> Heat
            </button>
            <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted p-1">
              {RADII.map((r) => (
                <button key={r} onClick={() => setRadius(r)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${radius === r ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>
                  {r} km
                </button>
              ))}
            </div>
            <button onClick={() => setAuthOpen(true)}
              className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs font-medium hover:bg-muted/70">
              Account
            </button>
          </div>

        </div>
      </header>

      {/* Map */}
      <div className="absolute inset-0">
        {mounted ? (
          <Suspense fallback={<MapSkeleton />}>
            <TheftMap center={center} radiusKm={radius} thefts={inRadius}
              allThefts={thefts} showHeatmap={showHeatmap}
              userReports={reportsInRadius} searchPin={pin}
              onSelect={(t) => { setSelected(t); setDrawerOpen(true); }} />
          </Suspense>
        ) : <MapSkeleton />}
      </div>

      {(loading || error) && (
        <div className="pointer-events-none absolute left-1/2 top-28 z-[900] -translate-x-1/2">
          <div className="pointer-events-auto rounded-full border border-border bg-card/90 px-4 py-2 text-xs shadow-lg backdrop-blur">
            {loading
              ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading recent theft data…</span>
              : <span className="flex items-center gap-2 text-danger"><AlertTriangle className="h-3 w-3" /> {error}</span>}
          </div>
        </div>
      )}

      <aside className="absolute bottom-3 left-3 right-3 z-[900] sm:bottom-4 sm:right-auto sm:left-4 sm:top-28 sm:w-80">
        {/* Mobile collapse handle — keeps the map visible */}
        <button
          type="button"
          onClick={() => setMobilePanelOpen((v) => !v)}
          className="mb-2 flex w-full items-center justify-between gap-2 rounded-2xl border border-border bg-card/90 px-3 py-2 shadow-lg backdrop-blur-xl sm:hidden"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                risk.level === "high"
                  ? "bg-danger"
                  : risk.level === "medium"
                  ? "bg-[oklch(0.75_0.18_75)]"
                  : "bg-[oklch(0.7_0.18_150)]"
              }`}
            />
            <span className="truncate text-xs font-medium">
              Risk {risk.score} · {loading ? "—" : stats.count} thefts · {radius} km
            </span>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {mobilePanelOpen ? "Hide" : "Details"}
            {mobilePanelOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </span>
        </button>

        <div className={`${mobilePanelOpen ? "" : "hidden"} sm:block`}>
        {showHeatmap && (
          <div className="mb-2 hidden rounded-xl border border-border bg-card/85 p-2.5 shadow-lg backdrop-blur sm:block">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Theft density</div>
            <div className="h-2 w-full rounded-full" style={{ background: "linear-gradient(90deg,#16a34a,#eab308,#f97316,#dc2626)" }} />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>Safer</span><span>Higher risk</span></div>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card/90 p-3 shadow-2xl backdrop-blur-xl sm:p-4">
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Within {radius} km of</div>
              <div className="text-sm font-semibold">{searchLabel ?? "Downtown Toronto"}</div>
            </div>
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <Stat label="Thefts" value={loading ? "—" : stats.count.toLocaleString()} accent />
            <Stat label="Last 30d" value={loading ? "—" : String(stats.last30)} />
            <Stat label="Trend"
              value={loading || stats.last30 === 0 ? "—" : `${stats.trend > 0 ? "+" : ""}${stats.trend}%`}
              tone={stats.trend > 0 ? "danger" : stats.trend < 0 ? "good" : "muted"}
              icon={<TrendingUp className="h-3 w-3" />} />
          </div>
          {stats.recent && (
            <div className="mt-2 rounded-xl border border-border bg-background/40 p-2.5 sm:mt-3 sm:p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <AlertTriangle className="h-3 w-3 text-danger" /> Most recent
              </div>
              <div className="text-sm font-medium">{stats.recent.offence}</div>
              <div className="text-xs text-muted-foreground">{stats.recent.neighbourhood}</div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(stats.recent.occDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {stats.recent.locationType}
              </div>
            </div>
          )}
          {reportsInRadius.length > 0 && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background/40 p-2 text-xs sm:mt-3 sm:p-2.5">
              <Users className="h-3.5 w-3.5 text-accent" />
              <span className="text-muted-foreground">{reportsInRadius.length} community report{reportsInRadius.length === 1 ? "" : "s"} nearby</span>
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3">
            {!loading && inRadius.length > 0 ? (
              <button onClick={() => { setSelected(inRadius[0]); setDrawerOpen(true); }}
                className="rounded-xl border border-border bg-muted py-2 text-xs font-medium text-foreground transition hover:bg-muted/70">
                View {inRadius.length}
              </button>
            ) : (
              <div className="rounded-xl border border-border bg-muted/40 py-2 text-center text-xs text-muted-foreground">No incidents</div>
            )}
            <button onClick={() => setReportOpen(true)}
              className="flex items-center justify-center gap-1 rounded-xl bg-accent py-2 text-xs font-medium text-accent-foreground transition hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Report
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground sm:mt-3">
            Locations offset to nearest intersection. Source: Toronto Police Service Public Safety Data Portal.
          </p>
        </div>
        {!loading && (
          <div className="mt-2 sm:mt-3">
            <RiskPanel risk={risk} locationLabel={searchLabel ?? "Downtown Toronto"} radiusKm={radius}
              vehicle={vehicle} onVehicleChange={setVehicle} onOpenClaim={() => setClaimOpen(true)} />
          </div>
        )}
        </div>
      </aside>

      {claimOpen && <ClaimGuide onClose={() => setClaimOpen(false)} defaultVehicle={vehicle} locationLabel={searchLabel ?? "Downtown Toronto"} />}

      {reportOpen && (
        <ReportDialog defaultLocation={center} defaultLabel={searchLabel}
          onClose={() => setReportOpen(false)}
          onSubmitted={(r) => { handleReportAdded(r); setReportOpen(false); }} />
      )}

      {authOpen && (
        <AuthPanel onClose={() => setAuthOpen(false)} onVehicleChange={setVehicle}
          onLocationSet={(lat, lng, label) => { setCenter([lat, lng]); setPin([lat, lng]); setSearchLabel(label); }} />
      )}

      {drawerOpen && (
        <>
          <div className="absolute inset-0 z-[1100] bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 z-[1200] max-h-[75vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-4 shadow-2xl sm:bottom-4 sm:left-auto sm:right-4 sm:top-28 sm:max-h-none sm:w-96 sm:rounded-2xl sm:border">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Incidents within {radius} km</div>
                <div className="text-base font-semibold">{inRadius.length} reports</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2">
              {inRadius.slice(0, 100).map((t) => (
                <li key={t.id}
                  className={`cursor-pointer rounded-xl border p-3 transition ${selected?.id === t.id ? "border-primary bg-primary/10" : "border-border bg-background/40 hover:border-primary/50"}`}
                  onClick={() => { setSelected(t); setCenter([t.lat, t.lng]); }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{t.offence}</div>
                      <div className="truncate text-xs text-muted-foreground">{t.neighbourhood}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{t.locationType}</div>
                    </div>
                    <div className="shrink-0 text-[11px] text-muted-foreground">
                      {new Date(t.occDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </li>
              ))}
              {inRadius.length === 0 && (
                <li className="rounded-xl border border-border bg-background/40 p-6 text-center text-sm text-muted-foreground">
                  No incidents in this radius. Try widening the search.
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent, tone, icon }: { label: string; value: string; accent?: boolean; tone?: "danger" | "good" | "muted"; icon?: React.ReactNode }) {
  const color = tone === "danger" ? "text-danger" : tone === "good" ? "text-accent" : accent ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-background/40 p-2.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 flex items-center gap-1 text-lg font-semibold ${color}`}>{icon}{value}</div>
    </div>
  );
}

function MapSkeleton() {
  return <div className="flex h-full w-full items-center justify-center bg-[oklch(0.18_0.02_260)]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
}

const OFFENCE_OPTIONS = ["Theft Of Motor Vehicle", "Attempted Theft", "Theft From Motor Vehicle", "Vehicle Vandalism"];
const LOCATION_OPTIONS = ["Street / Road", "Parking Lot", "Driveway", "Apartment Garage", "House (Garage)", "Other"];

function ReportDialog({ defaultLocation, defaultLabel, onClose, onSubmitted }: {
  defaultLocation: [number, number]; defaultLabel: string | null;
  onClose: () => void; onSubmitted: (r: UserReport) => void;
}) {
  const [offence, setOffence] = useState(OFFENCE_OPTIONS[0]);
  const [locationType, setLocationType] = useState(LOCATION_OPTIONS[0]);
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState(() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setErr(null);
    try {
      const r = await submitUserReport({ lat: defaultLocation[0], lng: defaultLocation[1], offence, locationType, description: description.trim() || undefined, occurredAt: new Date(when) });
      onSubmitted(r);
    } catch (e: any) { setErr(e?.message ?? "Failed to submit report."); }
    finally { setSubmitting(false); }
  }

  return (
    <>
      <div className="absolute inset-0 z-[1300] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 z-[1400] w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Community report</div>
            <h2 className="text-base font-semibold">Report a vehicle theft</h2>
            <p className="mt-1 text-xs text-muted-foreground">Pinned to {defaultLabel ?? "current map center"}.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="What happened?">
            <select value={offence} onChange={(e) => setOffence(e.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-ring focus:outline-none">
              {OFFENCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Where">
            <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-ring focus:outline-none">
              {LOCATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="When">
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-ring focus:outline-none" />
          </Field>
          <Field label="Details (optional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} rows={3}
              placeholder="Make/model, time of night, anything useful for neighbours…"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-ring focus:outline-none" />
            <div className="mt-1 text-right text-[10px] text-muted-foreground">{description.length}/500</div>
          </Field>
          {err && <div className="rounded-lg border border-danger/30 bg-danger/10 p-2 text-xs text-danger">{err}</div>}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border bg-muted py-2.5 text-sm font-medium hover:bg-muted/70">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> Submit</>}
            </button>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Reports are public and unverified. Always file an official report with Toronto Police (416-808-2222).
          </p>
        </form>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
