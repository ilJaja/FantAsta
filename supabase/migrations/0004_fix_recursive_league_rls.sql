create schema if not exists private;

create or replace function private.is_league_owner(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.leagues l
    where l.id = target_league_id
      and l.owner_id = auth.uid()
  );
$$;

create or replace function private.is_league_member(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.league_members m
    where m.league_id = target_league_id
      and m.user_id = auth.uid()
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.is_league_owner(uuid) from public, anon;
revoke all on function private.is_league_member(uuid) from public, anon;
grant execute on function private.is_league_owner(uuid) to authenticated;
grant execute on function private.is_league_member(uuid) to authenticated;

drop policy if exists "league members can view league" on public.leagues;
drop policy if exists "owners manage leagues" on public.leagues;
drop policy if exists "members can view memberships" on public.league_members;
drop policy if exists "league owners manage memberships" on public.league_members;

create policy "league participants view league"
on public.leagues
for select
to authenticated
using (
  owner_id = auth.uid()
  or private.is_league_member(id)
);

create policy "owners insert leagues"
on public.leagues
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "owners update leagues"
on public.leagues
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owners delete leagues"
on public.leagues
for delete
to authenticated
using (owner_id = auth.uid());

create policy "members view memberships"
on public.league_members
for select
to authenticated
using (
  user_id = auth.uid()
  or private.is_league_owner(league_id)
);

create policy "league owners insert memberships"
on public.league_members
for insert
to authenticated
with check (private.is_league_owner(league_id));

create policy "league owners update memberships"
on public.league_members
for update
to authenticated
using (private.is_league_owner(league_id))
with check (private.is_league_owner(league_id));

create policy "league owners delete memberships"
on public.league_members
for delete
to authenticated
using (private.is_league_owner(league_id));
