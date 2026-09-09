create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  season text not null,
  mode text not null check (mode in ('classic','mantra')),
  budget integer not null default 1000,
  roster_size integer not null default 25,
  created_at timestamptz not null default now()
);

create table if not exists public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  team_name text not null,
  is_admin boolean not null default false,
  primary key (league_id, team_name)
);

create table if not exists public.players (
  id bigint generated always as identity primary key,
  external_key text unique,
  name text not null,
  club text,
  mantra_role text,
  classic_role text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.auction_buys (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  team_name text not null,
  player_id bigint references public.players(id) on delete set null,
  player_name_snapshot text not null,
  price integer not null check (price >= 0),
  bought_at timestamptz,
  legacy_index integer,
  created_at timestamptz not null default now()
);

create table if not exists public.player_status (
  league_id uuid not null references public.leagues(id) on delete cascade,
  player_name text not null,
  status text not null,
  note text,
  updated_at timestamptz not null default now(),
  primary key (league_id, player_name)
);

create table if not exists public.lineups (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  matchday integer not null,
  module text not null,
  starters jsonb not null default '[]'::jsonb,
  bench jsonb not null default '[]'::jsonb,
  ai_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, user_id, matchday)
);

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.auction_buys enable row level security;
alter table public.player_status enable row level security;
alter table public.lineups enable row level security;

create policy "profiles own row" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "league members can view league" on public.leagues for select using (
  owner_id = auth.uid() or exists(select 1 from public.league_members m where m.league_id=id and m.user_id=auth.uid())
);
create policy "owners manage leagues" on public.leagues for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "members can view memberships" on public.league_members for select using (
  user_id=auth.uid() or exists(select 1 from public.leagues l where l.id=league_id and l.owner_id=auth.uid())
);
create policy "league owners manage memberships" on public.league_members for all using (
  exists(select 1 from public.leagues l where l.id=league_id and l.owner_id=auth.uid())
) with check (
  exists(select 1 from public.leagues l where l.id=league_id and l.owner_id=auth.uid())
);
create policy "members view buys" on public.auction_buys for select using (
  exists(select 1 from public.league_members m where m.league_id=auction_buys.league_id and m.user_id=auth.uid())
  or exists(select 1 from public.leagues l where l.id=auction_buys.league_id and l.owner_id=auth.uid())
);
create policy "members view status" on public.player_status for select using (
  exists(select 1 from public.league_members m where m.league_id=player_status.league_id and m.user_id=auth.uid())
  or exists(select 1 from public.leagues l where l.id=player_status.league_id and l.owner_id=auth.uid())
);
create policy "users manage own lineups" on public.lineups for all using (user_id=auth.uid()) with check (user_id=auth.uid());
