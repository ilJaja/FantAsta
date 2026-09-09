grant select, insert, update, delete on table
  public.profiles,
  public.leagues,
  public.league_members,
  public.auction_buys,
  public.player_status,
  public.lineups
to authenticated;

grant select on table public.players to authenticated;

revoke select, insert, update, delete on table
  public.profiles,
  public.leagues,
  public.league_members,
  public.auction_buys,
  public.player_status,
  public.lineups,
  public.players
from anon;
