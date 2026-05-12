import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Search, MapPin, AlertTriangle, TrendingUp, Loader2, Shield, X, Plus, Send, Users } from "lucide-react";
import { fetchRecentThefts, geocode, distanceKm, type Theft } from "@/lib/thefts";
import {
  fetchUserReports,
  submitUserReport,
  type UserReport,
} from "@/lib/reports";

const TheftMap = lazy(() => import("@/components/TheftMap"));

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "ParkSafe Toronto — Live Vehicle Theft Map" },
      {
        name: "description",
        content:
          "Visualize recent vehicle theft incidents across Toronto using public Toronto Police Service data. Search any address and see thefts within 1, 3, or 5 km.",
      },
    ],
  }),
});

const TORONTO: [number, number] = [43.6532, -79.3832];
const RADII = [1, 3, 5] as const;

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

  useEffect(() => {
    setMounted(true);
    Promise.all([
      fetchRecentThefts().catch((e) => {
        setError(e.message);
        return [] as Theft[];
      }),
      fetchUserReports().catch(() => [] as UserReport[]),
    ])
      .then(([t, r]) => {
        setThefts(t);
        setUserReports(r);
      })
      .finally(() => setLoading(false));
  }, []);

  const inRadius = useMemo(
    () =>
      thefts
        .filter((t) => distanceKm(center, [t.lat, t.lng]) <= radius)
        .sort((a, b) => b.occDate - a.occDate),
    [thefts, center, radius]
  );

  const reportsInRadius = useMemo(
    () =>
      userReports
        .filter((r) => distanceKm(center, [r.lat, r.lng]) <= radius)
        .sort((a, b) => b.occurredAt - a.occurredAt),
    [userReports, center, radius]
  );

  const stats = useMemo(() => {
    const count = inRadius.length;
    const recent = inRadius[0];
    const now = Date.now();
    const last30 = inRadius.filter((t) => now - t.occDate < 30 * 86400000).length;
    const prev30 = inRadius.filter(
      (t) => now - t.occDate >= 30 * 86400000 && now - t.occDate < 60 * 86400000
    ).length;
    const trend =
      prev30 === 0
        ? last30 > 0
          ? 100
          : 0
        : Math.round(((last30 - prev30) / prev30) * 100);
    return { count, recent, last30, trend };
  }, [inRadius]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const r = await geocode(query.trim());
      if (!r) {
        setError("Address not found in Toronto.");
      } else {
        setCenter([r.lat, r.lng]);
        setPin([r.lat, r.lng]);
        setSearchLabel(r.label.split(",").slice(0, 2).join(","));
      }
    } catch {
      setError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  function handleReportAdded(r: UserReport) {
    setUserReports((prev) => [r, ...prev]);
  }

  return (
    <div className="dark relative h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-[1000] px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 rounded-2xl border border-border bg-card/85 p-3 backdrop-blur-xl shadow-2xl sm:flex-row sm:items-center sm:gap-3 sm:p-3">
          <div className="flex items-center gap-2 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold tracking-tight">ParkSafe</h1>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Toronto
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search an address or intersection…"
                className="w-full rounded-xl border border-border bg-input py-2.5 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </button>
          </form>

          <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
            {RADII.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  radius === r
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Map */}
      <div className="absolute inset-0">
        {mounted ? (
          <Suspense fallback={<MapSkeleton />}>
            <TheftMap
              center={center}
              radiusKm={radius}
              thefts={inRadius}
              userReports={reportsInRadius}
              searchPin={pin}
              onSelect={(t) => {
                setSelected(t);
                setDrawerOpen(true);
              }}
            />
          </Suspense>
        ) : (
          <MapSkeleton />
        )}
      </div>

      {/* Loading / error toast */}
      {(loading || error) && (
        <div className="pointer-events-none absolute left-1/2 top-28 z-[900] -translate-x-1/2">
          <div className="pointer-events-auto rounded-full border border-border bg-card/90 px-4 py-2 text-xs shadow-lg backdrop-blur">
            {loading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading recent theft data…
              </span>
            ) : (
              <span className="flex items-center gap-2 text-danger">
                <AlertTriangle className="h-3 w-3" /> {error}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Summary card — desktop side, mobile bottom */}
      <aside className="absolute bottom-3 left-3 right-3 z-[900] sm:bottom-4 sm:right-auto sm:left-4 sm:top-28 sm:w-80">
        <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Within {radius} km of
              </div>
              <div className="text-sm font-semibold">{searchLabel ?? "Downtown Toronto"}</div>
            </div>
            <MapPin className="h-4 w-4 text-primary" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat label="Thefts" value={loading ? "—" : stats.count.toLocaleString()} accent />
            <Stat label="Last 30d" value={loading ? "—" : String(stats.last30)} />
            <Stat
              label="Trend"
              value={
                loading || stats.last30 === 0 ? "—" : `${stats.trend > 0 ? "+" : ""}${stats.trend}%`
              }
              tone={stats.trend > 0 ? "danger" : stats.trend < 0 ? "good" : "muted"}
              icon={<TrendingUp className="h-3 w-3" />}
            />
          </div>

          {stats.recent && (
            <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <AlertTriangle className="h-3 w-3 text-danger" /> Most recent
              </div>
              <div className="text-sm font-medium">{stats.recent.offence}</div>
              <div className="text-xs text-muted-foreground">{stats.recent.neighbourhood}</div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(stats.recent.occDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                · {stats.recent.locationType}
              </div>
            </div>
          )}

          {reportsInRadius.length > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background/40 p-2.5 text-xs">
              <Users className="h-3.5 w-3.5 text-accent" />
              <span className="text-muted-foreground">
                {reportsInRadius.length} community report
                {reportsInRadius.length === 1 ? "" : "s"} nearby
              </span>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            {!loading && inRadius.length > 0 ? (
              <button
                onClick={() => {
                  setSelected(inRadius[0]);
                  setDrawerOpen(true);
                }}
                className="rounded-xl border border-border bg-muted py-2 text-xs font-medium text-foreground transition hover:bg-muted/70"
              >
                View {inRadius.length}
              </button>
            ) : (
              <div className="rounded-xl border border-border bg-muted/40 py-2 text-center text-xs text-muted-foreground">
                No incidents
              </div>
            )}
            <button
              onClick={() => setReportOpen(true)}
              className="flex items-center justify-center gap-1 rounded-xl bg-accent py-2 text-xs font-medium text-accent-foreground transition hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Report
            </button>
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            Locations offset to nearest intersection. Source: Toronto Police Service Public Safety
            Data Portal.
          </p>
        </div>
      </aside>

      {reportOpen && (
        <ReportDialog
          defaultLocation={center}
          defaultLabel={searchLabel}
          onClose={() => setReportOpen(false)}
          onSubmitted={(r) => {
            handleReportAdded(r);
            setReportOpen(false);
          }}
        />
      )}

      {/* Detail drawer */}
      {drawerOpen && (
        <>
          <div
            className="absolute inset-0 z-[1100] bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 z-[1200] max-h-[75vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-4 shadow-2xl sm:bottom-4 sm:left-auto sm:right-4 sm:top-28 sm:max-h-none sm:w-96 sm:rounded-2xl sm:border">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Incidents within {radius} km
                </div>
                <div className="text-base font-semibold">{inRadius.length} reports</div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2">
              {inRadius.slice(0, 100).map((t) => (
                <li
                  key={t.id}
                  className={`cursor-pointer rounded-xl border p-3 transition ${
                    selected?.id === t.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/40 hover:border-primary/50"
                  }`}
                  onClick={() => {
                    setSelected(t);
                    setCenter([t.lat, t.lng]);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{t.offence}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {t.neighbourhood}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {t.locationType}
                      </div>
                    </div>
                    <div className="shrink-0 text-[11px] text-muted-foreground">
                      {new Date(t.occDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
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

function Stat({
  label,
  value,
  accent,
  tone,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "danger" | "good" | "muted";
  icon?: React.ReactNode;
}) {
  const color =
    tone === "danger"
      ? "text-danger"
      : tone === "good"
      ? "text-accent"
      : accent
      ? "text-primary"
      : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-background/40 p-2.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 flex items-center gap-1 text-lg font-semibold ${color}`}>
        {icon}
        {value}
      </div>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[oklch(0.18_0.02_260)]">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
