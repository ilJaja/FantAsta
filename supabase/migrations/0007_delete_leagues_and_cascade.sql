-- 0007_delete_leagues_and_cascade.sql
-- NOTA: nella migrazione 0001 esiste già la policy "owners manage leagues ... for all"
-- (che include il DELETE) e le foreign key figlie hanno già ON DELETE CASCADE.
-- Di conseguenza l'eliminazione di una lega da parte del proprietario funziona
-- anche SENZA applicare questa migrazione.
--
-- Questo file aggiunge policy di DELETE esplicite e idempotenti come rete di
-- sicurezza/documentazione, senza modificare i vincoli di foreign key esistenti.

-- Eliminazione della lega da parte del proprietario (esplicita)
drop policy if exists "league owners delete leagues" on public.leagues;
create policy "league owners delete leagues" on public.leagues
for delete to authenticated using (owner_id = auth.uid());

-- Eliminazione dei membri della lega da parte del proprietario (esplicita)
drop policy if exists "league owners delete members" on public.league_members;
create policy "league owners delete members" on public.league_members
for delete to authenticated using (
  exists(select 1 from public.leagues l where l.id = league_members.league_id and l.owner_id = auth.uid())
);

-- Eliminazione delle formazioni della lega da parte del proprietario (esplicita)
drop policy if exists "league owners delete lineups" on public.lineups;
create policy "league owners delete lineups" on public.lineups
for delete to authenticated using (
  exists(select 1 from public.leagues l where l.id = lineups.league_id and l.owner_id = auth.uid())
);
