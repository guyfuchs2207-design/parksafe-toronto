create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  offence text not null default 'Theft Of Motor Vehicle',
  location_type text not null default 'Unknown',
  neighbourhood text not null default 'Toronto',
  description text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.user_reports enable row level security;

create policy "Anyone can view reports"
  on public.user_reports for select
  using (true);

create policy "Anyone can submit reports"
  on public.user_reports for insert
  with check (
    lat between 43.5 and 43.9
    and lng between -79.7 and -79.1
    and length(coalesce(description, '')) <= 500
    and length(offence) <= 100
    and length(location_type) <= 100
    and length(neighbourhood) <= 100
  );

create index user_reports_occurred_idx on public.user_reports (occurred_at desc);