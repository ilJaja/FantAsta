alter table public.leagues add column if not exists legacy_key text;
alter table public.leagues add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.league_members add column if not exists manager_note text;
alter table public.league_members add column if not exists fan_of text;

create unique index if not exists leagues_owner_legacy_key_unique
on public.leagues(owner_id, legacy_key)
where legacy_key is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

alter table public.players enable row level security;

drop policy if exists "authenticated read players" on public.players;
create policy "authenticated read players" on public.players
for select to authenticated using (true);

drop policy if exists "league owners insert buys" on public.auction_buys;
create policy "league owners insert buys" on public.auction_buys
for insert to authenticated with check (
  exists(select 1 from public.leagues l where l.id=auction_buys.league_id and l.owner_id=auth.uid())
);

drop policy if exists "league owners update buys" on public.auction_buys;
create policy "league owners update buys" on public.auction_buys
for update to authenticated using (
  exists(select 1 from public.leagues l where l.id=auction_buys.league_id and l.owner_id=auth.uid())
) with check (
  exists(select 1 from public.leagues l where l.id=auction_buys.league_id and l.owner_id=auth.uid())
);

drop policy if exists "league owners delete buys" on public.auction_buys;
create policy "league owners delete buys" on public.auction_buys
for delete to authenticated using (
  exists(select 1 from public.leagues l where l.id=auction_buys.league_id and l.owner_id=auth.uid())
);

drop policy if exists "league owners insert status" on public.player_status;
create policy "league owners insert status" on public.player_status
for insert to authenticated with check (
  exists(select 1 from public.leagues l where l.id=player_status.league_id and l.owner_id=auth.uid())
);

drop policy if exists "league owners update status" on public.player_status;
create policy "league owners update status" on public.player_status
for update to authenticated using (
  exists(select 1 from public.leagues l where l.id=player_status.league_id and l.owner_id=auth.uid())
) with check (
  exists(select 1 from public.leagues l where l.id=player_status.league_id and l.owner_id=auth.uid())
);

drop policy if exists "league owners delete status" on public.player_status;
create policy "league owners delete status" on public.player_status
for delete to authenticated using (
  exists(select 1 from public.leagues l where l.id=player_status.league_id and l.owner_id=auth.uid())
);
