"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { useLeague } from "@/components/league-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Buy = { team_name: string; price: number };
type Member = { team_name: string };

export default function AnalisiPage() {
  const { user } = useAuth();
  const { activeLeague } = useLeague();
  const [buys, setBuys] = useState<Buy[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!activeLeague || !user) return;
      setLoading(true);
      setError("");
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { setError("Supabase non configurato."); setLoading(false); return; }
      const [membersRes, buysRes] = await Promise.all([
        supabase.from("league_members").select("team_name").eq("league_id", activeLeague.id),
        supabase.from("auction_buys").select("team_name,price").eq("league_id", activeLeague.id),
      ]);
      const firstError = membersRes.error || buysRes.error;
      if (firstError) setError(firstError.message);
      setMembers((membersRes.data ?? []) as Member[]);
      setBuys((buysRes.data ?? []) as Buy[]);
      setLoading(false);
    }
    load();
  }, [activeLeague, user]);

  const stats = useMemo(() => {
    const budget = activeLeague?.budget ?? 0;
    const teamNames = Array.from(new Set([...members.map((m) => m.team_name), ...buys.map((b) => b.team_name)]));
    if (teamNames.length === 0) return null;
    const perTeam = teamNames.map((team) => {
      const teamBuys = buys.filter((b) => b.team_name === team);
      const spent = teamBuys.reduce((s, b) => s + b.price, 0);
      return { team, spent, credits: budget - spent, count: teamBuys.length };
    });
    const avg = perTeam.reduce((s, t) => s + t.spent, 0) / perTeam.length;
    const richest = [...perTeam].sort((a, b) => b.credits - a.credits)[0];
    const fullest = [...perTeam].sort((a, b) => b.count - a.count)[0];
    return { avg, richest, fullest, totalBuys: buys.length };
  }, [members, buys, activeLeague]);

  if (!activeLeague) return <AppShell active="/analisi"><div className="dashboard-loading">Nessuna asta selezionata.</div></AppShell>;

  return (
    <AppShell active="/analisi">
      <div className="page-head">
        <div>
          <span className="eyebrow">ANALISI LEGA</span>
          <h1>Snapshot {activeLeague.name}</h1>
          <p>Metriche derivate direttamente dagli acquisti registrati in questa asta.</p>
        </div>
      </div>
      {error && <div className="form-alert error">{error}</div>}
      {loading ? (
        <div className="dashboard-loading">Caricamento analisi…</div>
      ) : !stats ? (
        <section className="panel"><p className="asta-empty">Nessun dato disponibile: registra acquisti nell&apos;Asta per attivare l&apos;analisi.</p></section>
      ) : (
        <>
          <section className="stats-grid">
            <article className="stat-card"><span>SPESA MEDIA</span><strong>{stats.avg.toFixed(1)}</strong><small>crediti per squadra</small></article>
            <article className="stat-card green"><span>PIÙ CREDITI</span><strong>{stats.richest.team}</strong><small>{stats.richest.credits} residui</small></article>
            <article className="stat-card"><span>ROSA PIÙ PIENA</span><strong>{stats.fullest.team}</strong><small>{stats.fullest.count} giocatori</small></article>
            <article className="stat-card amber"><span>ACQUISTI</span><strong>{stats.totalBuys}</strong><small>registrati</small></article>
          </section>
          <article className="panel">
            <h2>Prossimo livello di analisi</h2>
            <p className="muted">La struttura è pronta per aggiungere forza per reparto, compatibilità Mantra, scambi consigliati, matchup e FantAsta Score settimanale senza cambiare modello dati.</p>
          </article>
        </>
      )}
    </AppShell>
  );
}
