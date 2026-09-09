"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Gavel, LogOut, Plus, ShieldCheck, Upload, UsersRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useLeague } from "@/components/league-provider";
import { BrandLogo } from "@/components/brand-logo";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { ramera } from "@/data/ramera";

type League = { id: string; name: string; season: string; mode: string; budget: number; roster_size: number; legacy_key: string | null };

export default function LeaguesPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { selectLeague, refreshLeagues } = useLeague();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"classic"|"mantra">("mantra");
  const [budget, setBudget] = useState(1000);
  const [rosterSize, setRosterSize] = useState(25);

  const loadLeagues = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data, error: loadError } = await supabase.from("leagues").select("id,name,season,mode,budget,roster_size,legacy_key").order("created_at", { ascending: false });
    if (loadError) setError(loadError.message);
    else setLeagues((data ?? []) as League[]);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user) loadLeagues();
  }, [loading, user, router, loadLeagues]);

  function openLeague(leagueId: string) {
    selectLeague(leagueId);
    router.push("/dashboard");
  }

  async function createLeague(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true); setError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data, error: leagueError } = await supabase.from("leagues").insert({
      owner_id: user.id, name, season: "2026/27", mode, budget, roster_size: rosterSize,
    }).select("id").single();
    if (leagueError) setError(leagueError.message);
    else {
      await supabase.from("league_members").insert({ league_id: data.id, user_id: user.id, team_name: user.user_metadata?.display_name || "La mia squadra", is_admin: true });
      selectLeague(data.id);
      setName(""); setShowCreate(false);
      await Promise.all([loadLeagues(), refreshLeagues()]);
      router.push("/dashboard");
    }
    setBusy(false);
  }

  async function importRamera() {
    if (!user) return;
    setBusy(true); setError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const existing = leagues.find(l => l.legacy_key === "ramera-2026-27");
    if (existing) { openLeague(existing.id); setBusy(false); return; }

    const { data: league, error: leagueError } = await supabase.from("leagues").insert({
      owner_id: user.id,
      name: ramera.name,
      season: "2026/27",
      mode: ramera.mode,
      budget: ramera.budget,
      roster_size: ramera.rosterSize,
      legacy_key: "ramera-2026-27",
      metadata: { formation: ramera.formation, minimums: ramera.minimums },
    }).select("id").single();
    if (leagueError || !league) { setError(leagueError?.message || "Impossibile creare RAMERA"); setBusy(false); return; }

    const memberRows = ramera.teams.map(team => ({
      league_id: league.id,
      user_id: team === "Jason" ? user.id : null,
      team_name: team,
      is_admin: team === "Jason",
      manager_note: (ramera.managerNotes as Record<string,string>)[team] ?? null,
      fan_of: (ramera.fanOf as Record<string,string>)[team] ?? null,
    }));
    const { error: membersError } = await supabase.from("league_members").insert(memberRows);
    if (membersError) { setError(membersError.message); setBusy(false); return; }

    const buyRows = Object.entries(ramera.rosters).flatMap(([team, roster]) =>
      roster.map(([playerName, price]) => ({
        league_id: league.id,
        team_name: team,
        player_name_snapshot: playerName,
        price,
      }))
    );
    const { error: buysError } = await supabase.from("auction_buys").insert(buyRows);
    if (buysError) { setError(buysError.message); setBusy(false); return; }

    const statusRows = Object.entries(ramera.unavailable).map(([player_name, note]) => ({
      league_id: league.id, player_name, status: "unavailable", note,
    }));
    const { error: statusError } = await supabase.from("player_status").upsert(statusRows, { onConflict: "league_id,player_name" });
    if (statusError) { setError(statusError.message); setBusy(false); return; }

    selectLeague(league.id);
    await Promise.all([loadLeagues(), refreshLeagues()]);
    setBusy(false);
    router.push("/dashboard");
  }

  if (loading || !user) return <main className="auth-page"><div className="auth-card"><strong>Caricamento account…</strong></div></main>;

  return (
    <main className="league-hub">
      <header className="hub-topbar">
        <Link href="/leagues" className="brand"><BrandLogo /></Link>
        <div className="hub-user"><span>{user.user_metadata?.display_name || user.email}</span><button onClick={async()=>{await signOut(); router.replace("/login");}}><LogOut size={16}/> Esci</button></div>
      </header>
      <section className="hub-content">
        <div className="hub-heading"><div><span className="eyebrow">CENTRO DI COMANDO</span><h1>Le mie aste</h1><p>Ogni lega ha nome, rosa e dati propri. Aprine una per renderla l'asta attiva.</p></div><button className="secondary-btn" onClick={()=>setShowCreate(!showCreate)}><Plus size={17}/> Nuova asta</button></div>

        {error && <div className="form-alert error">{error}</div>}

        {showCreate && <form className="create-league-card" onSubmit={createLeague}>
          <label><span>Nome asta</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Es. I Veterani" required/></label>
          <label><span>Modalità</span><select value={mode} onChange={e=>setMode(e.target.value as "classic"|"mantra")}><option value="mantra">Mantra</option><option value="classic">Classic</option></select></label>
          <label><span>Budget</span><input type="number" min={100} value={budget} onChange={e=>setBudget(Number(e.target.value))}/></label>
          <label><span>Rosa</span><input type="number" min={15} value={rosterSize} onChange={e=>setRosterSize(Number(e.target.value))}/></label>
          <button className="primary-btn" disabled={busy}>Crea asta</button>
        </form>}

        <div className="league-grid">
          {!leagues.some(l=>l.legacy_key==="ramera-2026-27") && <article className="league-tile import-tile"><div className="league-icon"><Upload/></div><span className="eyebrow">IMPORT PRONTO</span><h2>RAMERA 2026/27</h2><p>10 squadre · 273 acquisti · Mantra · budget 1000. Importa questa specifica asta dal backup reale.</p><div className="import-check"><ShieldCheck size={16}/> RAMERA resterà una lega separata dalle altre</div><button className="primary-btn" onClick={importRamera} disabled={busy}>{busy?"Importazione…":"Importa RAMERA"} <ArrowRight size={17}/></button></article>}
          {leagues.map(league => <article className="league-tile" key={league.id}><div className="league-icon"><Gavel/></div><span className="eyebrow">{league.mode.toUpperCase()} · {league.season}</span><h2>{league.name}</h2><p>Budget {league.budget} · rosa {league.roster_size}. Questa asta ha dati e gestione indipendenti.</p><div className="league-meta"><UsersRound size={16}/> {league.legacy_key ? "Asta importata" : "Asta personale"}</div><button className="primary-btn" onClick={()=>openLeague(league.id)}>Apri asta <ArrowRight size={17}/></button></article>)}
        </div>
      </section>
    </main>
  );
}
