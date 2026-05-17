import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  email: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleColour: string | null;
  homeAddress: string | null;
  homeLat: number | null;
  homeLng: number | null;
  alertsEnabled: boolean;
  alertRadiusKm: number;
}

export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    vehicleMake: data.vehicle_make,
    vehicleModel: data.vehicle_model,
    vehicleYear: data.vehicle_year,
    vehicleColour: data.vehicle_colour,
    homeAddress: data.home_address,
    homeLat: data.home_lat,
    homeLng: data.home_lng,
    alertsEnabled: data.alerts_enabled,
    alertRadiusKm: data.alert_radius_km,
  };
}

export async function upsertProfile(updates: Partial<Omit<Profile, "id">>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: updates.email,
    vehicle_make: updates.vehicleMake,
    vehicle_model: updates.vehicleModel,
    vehicle_year: updates.vehicleYear,
    vehicle_colour: updates.vehicleColour,
    home_address: updates.homeAddress,
    home_lat: updates.homeLat,
    home_lng: updates.homeLng,
    alerts_enabled: updates.alertsEnabled,
    alert_radius_km: updates.alertRadiusKm,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}
