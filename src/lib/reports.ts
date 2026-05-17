import { supabase } from "@/integrations/supabase/client";

export interface UserReport {
  id: string;
  lat: number;
  lng: number;
  offence: string;
  locationType: string;
  neighbourhood: string;
  description: string | null;
  occurredAt: number;
}

export async function fetchUserReports(): Promise<UserReport[]> {
  const { data, error } = await supabase
    .from("user_reports")
    .select("id,lat,lng,offence,location_type,neighbourhood,description,occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    offence: r.offence,
    locationType: r.location_type,
    neighbourhood: r.neighbourhood,
    description: r.description,
    occurredAt: new Date(r.occurred_at).getTime(),
  }));
}

export interface NewReport {
  lat: number;
  lng: number;
  offence: string;
  locationType: string;
  neighbourhood?: string;
  description?: string;
  occurredAt: Date;
}

export async function submitUserReport(r: NewReport): Promise<UserReport> {
  const { data, error } = await supabase
    .from("user_reports")
    .insert({
      lat: r.lat,
      lng: r.lng,
      offence: r.offence,
      location_type: r.locationType,
      neighbourhood: r.neighbourhood ?? "Toronto",
      description: r.description ?? null,
      occurred_at: r.occurredAt.toISOString(),
    })
    .select("id,lat,lng,offence,location_type,neighbourhood,description,occurred_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    lat: data.lat,
    lng: data.lng,
    offence: data.offence,
    locationType: data.location_type,
    neighbourhood: data.neighbourhood,
    description: data.description,
    occurredAt: new Date(data.occurred_at).getTime(),
  };
}
}
