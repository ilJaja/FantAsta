create table if not exists public.matchday_reports (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  matchday integer,
  competition text not null default 'Serie A',
  period_label text,
  generated_at timestamptz not null default now(),
  kickoff_at timestamptz,
  status text not null default 'published' check (status in ('draft','published','superseded')),
  formation text,
  summary text,
  confidence integer check (confidence between 0 and 100),
  starters jsonb not null default '[]'::jsonb,
  bench jsonb not null default '[]'::jsonb,
  unavailable jsonb not null default '[]'::jsonb,
  player_analysis jsonb not null default '[]'::jsonb,
  checks jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists matchday_reports_league_matchday_unique
on public.matchday_reports(league_id, matchday)
where matchday is not null;

create index if not exists matchday_reports_league_generated_idx
on public.matchday_reports(league_id, generated_at desc);

alter table public.matchday_reports enable row level security;

drop policy if exists "participants view matchday reports" on public.matchday_reports;
create policy "participants view matchday reports" on public.matchday_reports
for select to authenticated using (
  private.is_league_owner(league_id) or private.is_league_member(league_id)
);

grant select on public.matchday_reports to authenticated;
revoke all on public.matchday_reports from anon;
