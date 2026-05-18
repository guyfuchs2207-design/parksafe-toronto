import { useState, useEffect, useId } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getProfile, upsertProfile, signUpWithEmail, signInWithEmail, signOut, Profile } from "@/lib/profile";
import { geocode } from "@/lib/thefts";
import { VEHICLE_CATALOG, VEHICLE_MAKES } from "@/lib/risk";
import { Shield, X, Loader2, LogOut, Car, MapPin, Bell } from "lucide-react";

const COLOURS = ["Black", "White", "Silver", "Grey", "Blue", "Red", "Green", "Brown", "Yellow", "Orange"];

export default function AuthPanel({ onClose, onLocationSet }: {
  onClose: () => void;
  onLocationSet?: (lat: number, lng: number, label: string) => void;
  onVehicleChange?: (v: { make: string; model: string; colour: string }) => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<"auth" | "profile">("auth");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Profile fields
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [colour, setColour] = useState("");
  const [address, setAddress] = useState("");
  const [alerts, setAlerts] = useState(true);
  const [radius, setRadius] = useState(2);
  const [geocoding, setGeocoding] = useState(false);
  const makesListId = useId();
  const modelsListId = useId();
  const coloursListId = useId();

  const modelOptions = make && VEHICLE_CATALOG[make]
    ? VEHICLE_CATALOG[make]
    : Object.values(VEHICLE_CATALOG).flat();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setView("profile");
        loadProfile();
      }
    });
  }, []);

  async function loadProfile() {
    const p = await getProfile();
    if (p) {
      setProfile(p);
      setMake(p.vehicleMake ?? "");
      setModel(p.vehicleModel ?? "");
      setYear(p.vehicleYear ? String(p.vehicleYear) : "");
      setColour(p.vehicleColour ?? "");
      setAddress(p.homeAddress ?? "");
      setAlerts(p.alertsEnabled);
      setRadius(p.alertRadiusKm);
      // Sync vehicle into risk score immediately on load.
      onVehicleChange?.({
        make: p.vehicleMake ?? "",
        model: p.vehicleModel ?? "",
        colour: p.vehicleColour ?? "",
      });
      if (p.homeLat != null && p.homeLng != null) {
        onLocationSet?.(p.homeLat, p.homeLng, (p.homeAddress ?? "Home").split(",").slice(0, 2).join(","));
      }
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setErr("Check your email to confirm your account, then sign in.");
      } else {
        const d = await signInWithEmail(email, password);
        setUser(d.user);
        setView("profile");
        await loadProfile();
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      let homeLat: number | null = null;
      let homeLng: number | null = null;

      if (address.trim()) {
        setGeocoding(true);
        const geo = await geocode(address.trim());
        setGeocoding(false);
        if (geo) {
          homeLat = geo.lat;
          homeLng = geo.lng;
          onLocationSet?.(geo.lat, geo.lng, geo.label.split(",").slice(0, 2).join(","));
        }
      }

      await upsertProfile({
        email: user?.email ?? "",
        vehicleMake: make || null,
        vehicleModel: model || null,
        vehicleYear: year ? parseInt(year) : null,
        vehicleColour: colour || null,
        homeAddress: address || null,
        homeLat,
        homeLng,
        alertsEnabled: alerts,
        alertRadiusKm: radius,
      });
      // Push saved vehicle into the risk score panel.
      onVehicleChange?.({ make, model, colour });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
      setGeocoding(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setProfile(null);
    setView("auth");
  }

  return (
    <>
      <div className="absolute inset-0 z-[1300] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 z-[1400] w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-2xl overflow-y-auto max-h-[90vh]">

        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {view === "auth" ? "Account" : "Your Profile"}
              </div>
              <h2 className="text-sm font-semibold">
                {view === "auth" ? (isSignUp ? "Create account" : "Sign in") : user?.email}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {view === "auth" ? (
          <form onSubmit={handleAuth} className="space-y-3">
            <Field label="Email">
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-ring focus:outline-none"
              />
            </Field>
            <Field label="Password">
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-ring focus:outline-none"
              />
            </Field>
            {err && <p className="rounded-lg border border-danger/30 bg-danger/10 p-2 text-xs text-danger">{err}</p>}
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : isSignUp ? "Create account" : "Sign in"}
            </button>
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setErr(null); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
              {isSignUp ? "Already have an account? Sign in" : "No account? Sign up"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4">

            {/* Vehicle */}
            <div className="rounded-xl border border-border bg-background/40 p-3 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Car className="h-3.5 w-3.5 text-primary" /> Vehicle
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Make">
                  <input
                    list={makesListId}
                    value={make}
                    onChange={e => { setMake(e.target.value); onVehicleChange?.({ make: e.target.value, model, colour }); }}
                    placeholder="Type or pick…"
                    autoComplete="off"
                    className="w-full rounded-lg border border-border bg-input px-2 py-2 text-sm focus:outline-none" />
                  <datalist id={makesListId}>
                    {VEHICLE_MAKES.map(m => <option key={m} value={m} />)}
                  </datalist>
                </Field>
                <Field label="Model">
                  <input
                    list={modelsListId}
                    value={model}
                    onChange={e => { setModel(e.target.value); onVehicleChange?.({ make, model: e.target.value, colour }); }}
                    placeholder="e.g. CR-V"
                    autoComplete="off"
                    className="w-full rounded-lg border border-border bg-input px-2 py-2 text-sm focus:outline-none" />
                  <datalist id={modelsListId}>
                    {modelOptions.map(m => <option key={m} value={m} />)}
                  </datalist>
                </Field>
                <Field label="Year">
                  <input value={year} onChange={e => setYear(e.target.value)}
                    placeholder="e.g. 2021" type="number" min="1990" max="2026"
                    className="w-full rounded-lg border border-border bg-input px-2 py-2 text-sm focus:outline-none" />
                </Field>
                <Field label="Colour">
                  <input
                    list={coloursListId}
                    value={colour}
                    onChange={e => { setColour(e.target.value); onVehicleChange?.({ make, model, colour: e.target.value }); }}
                    placeholder="e.g. Black"
                    autoComplete="off"
                    className="w-full rounded-lg border border-border bg-input px-2 py-2 text-sm focus:outline-none" />
                  <datalist id={coloursListId}>
                    {COLOURS.map(c => <option key={c} value={c} />)}
                  </datalist>
                </Field>
              </div>
            </div>

            {/* Home location */}
            <div className="rounded-xl border border-border bg-background/40 p-3 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Home Address
              </div>
              <Field label="Address">
                <input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. 123 Queen St W, Toronto"
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none" />
              </Field>
              <p className="text-[10px] text-muted-foreground">Used to center your map and calculate your personal risk score.</p>
            </div>

            {/* Alerts */}
            <div className="rounded-xl border border-border bg-background/40 p-3 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Bell className="h-3.5 w-3.5 text-primary" /> Alerts
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Enable alerts</span>
                <button type="button" onClick={() => setAlerts(!alerts)}
                  className={`relative h-6 w-11 rounded-full transition ${alerts ? "bg-primary" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${alerts ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
              {alerts && (
                <Field label={`Alert radius: ${radius} km`}>
                  <input type="range" min={1} max={10} value={radius} onChange={e => setRadius(Number(e.target.value))}
                    className="w-full accent-primary" />
                </Field>
              )}
            </div>

            {err && <p className="rounded-lg border border-danger/30 bg-danger/10 p-2 text-xs text-danger">{err}</p>}

            <button type="submit" disabled={loading || geocoding}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {loading || geocoding
                ? <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                : saved ? "✓ Saved!" : "Save profile"}
            </button>

            <button type="button" onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-muted py-2 text-xs text-muted-foreground hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </form>
        )}
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
