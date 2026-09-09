"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, CalendarCheck, CheckCircle2, Coins, Gavel, ShieldAlert, Sparkles, Target, Trophy, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { useLeague } from "@/components/league-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { recommendedXI } from "@/lib/formation";
import { ramera } from "@/data/ramera";

type Buy = { team_name: string; player_name_snapshot: string; price: number };
type Member = { team_name: string; user_id: string | null };
type PlayerStatus = { player_name: string; status: string; note: string | null };

type DashboardData = {
  buys: Buy[];
  members: Member[];
  statuses: PlayerStatus[];
};

const emptyData: DashboardData = { buys: [], members: [], statuses: [] };

export default function Dashboard() {
  const { user } = useAuth();
  const { activeLeague } = useLeague();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!activeLeague || !user) return;
      setLoading(true);
      setError("");
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const [membersRes, buysRes, statusRes] = await Promise.all([
        supabase.from("league_members").select("team_name,user_id").eq("league_id", activeLeague.id),
        supabase.from("auction_buys").select("team_name,player_name_snapshot,price").eq("league_id", activeLeague.id),
        supabase.from("player_status").select("player_name,status,note").eq("league_id", activeLeague.id),
      ]);

      const firstError = membersRes.error || buysRes.error || statusRes.error;
      if (firstError) setError(firstError.message);
      setData({
        members: (membersRes.data ?? []) as Member[],
        buys: (buysRes.data ?? []) as Buy[],
        statuses: (statusRes.data ?? []) as PlayerStatus[],
      });
      setLoading(false);
    }
    load();
  }, [activeLeague, user]);

  const model = useMemo(() => {
    if (!activeLeague || !user) return null;
    const ownMembership = data.members.find((member) => member.user_id === user.id);
    const fallbackTeam = user.user_metadata?.display_name || user.email?.split("@")[0] || "La mia squadra";
    const teamName = ownMembership?.team_name ?? fallbackTeam;
    const myBuys = data.buys.filter((buy) => buy.team_name === teamName);
    const spent = myBuys.reduce((sum, buy) => sum + buy.price, 0);
    const credits = activeLeague.budget - spent;
    const statusMap = new Map(data.statuses.map((status) => [status.player_name, status]));
    const unavailable = myBuys.filter((buy) => statusMap.has(buy.player_name_snapshot));
    const rosterRatio = Math.min(1, myBuys.length / Math.max(1, activeLeague.roster_size));
    const isRamera = activeLeague.legacy_key === "ramera-2026-27";
    const formationReady = isRamera;
    const availabilityScore = myBuys.length ? Math.max(0, 10 - (unavailable.length / myBuys.length) * 20) : 0;
    const readiness = Math.round(rosterRatio * 70 + (formationReady ? 20 : 0) + availabilityScore);
    const uniqueTeams = new Set(data.buys.map((buy) => buy.team_name));
    const participants = uniqueTeams.size || new Set(data.members.map((member) => member.team_name)).size;

    const teamSpend = new Map<string, number>();
    for (const buy of data.buys) teamSpend.set(buy.team_name, (teamSpend.get(buy.team_name) ?? 0) + buy.price);
    const opponentBalances = Array.from(teamSpend.entries())
      .filter(([team]) => team !== teamName)
      .map(([team, teamSpent]) => ({ team, spent: teamSpent, credits: activeLeague.budget - teamSpent }))
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 5);

    const topLeagueBuys = [...data.buys].sort((a, b) => b.price - a.price).slice(0, 4);
    const topMine = [...myBuys].sort((a, b) => b.price - a.price).slice(0, 3);
    const metadata = (activeLeague.metadata ?? {}) as { formation?: string };
    const module = metadata.formation ?? (isRamera ? ramera.formation : "Da impostare");

    return { teamName, myBuys, spent, credits, unavailable, readiness, participants, opponentBalances, topLeagueBuys, topMine, module, isRamera, statusMap };
  }, [activeLeague, data, user]);

  if (!activeLeague || !model) return <AppShell active="/dashboard"><div className="dashboard-loading">Caricamento asta…</div></AppShell>;

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Manager";
  const meta = ramera.playerMeta as Record<string, { role: string; club: string }>;

  const briefing = model.myBuys.length === 0 ? [
    { icon: Gavel, title: "Asta appena creata", text: "Aggiungi i primi acquisti per attivare analisi e radar della rosa.", tone: "gold" },
    { icon: Target, title: "Imposta la struttura", text: `Modalità ${activeLeague.mode === "mantra" ? "Mantra" : "Classic"}, rosa obiettivo ${activeLeague.roster_size}.`, tone: "neutral" },
    { icon: Coins, title: "Budget disponibile", text: `${activeLeague.budget} crediti pronti per l'asta.`, tone: "neutral" },
  ] : [
    model.unavailable.length > 0
      ? { icon: ShieldAlert, title: `${model.unavailable[0].player_name_snapshot} da monitorare`, text: model.statusMap.get(model.unavailable[0].player_name_snapshot)?.note || "Indisponibilità registrata.", tone: "danger" }
      : { icon: CheckCircle2, title: "Nessun allarme principale", text: "Non risultano indisponibilità registrate nella tua rosa.", tone: "gold" },
    model.topMine[0]
      ? { icon: Trophy, title: `${model.topMine[0].player_name_snapshot} è l'investimento chiave`, text: `${model.topMine[0].price} crediti: è il giocatore su cui pesa di più la costruzione della rosa.`, tone: "neutral" }
      : { icon: Target, title: "Definisci i riferimenti", text: "Costruisci la gerarchia della rosa dopo i primi acquisti.", tone: "neutral" },
    { icon: UsersRound, title: model.myBuys.length >= activeLeague.roster_size ? "Rosa completata" : "Rosa in costruzione", text: `${model.myBuys.length}/${activeLeague.roster_size} slot occupati · ${model.credits} crediti residui.`, tone: "neutral" },
  ];

  return <AppShell active="/dashboard">
    <div className="command-dashboard">
      <section className="command-hero">
        <div>
          <span className="eyebrow">FANTASY FOOTBALL COMMAND CENTER</span>
          <h1>Dashboard</h1>
          <p>Ciao <strong>{displayName}</strong>. Stai gestendo <b>Asta: {activeLeague.name}</b> · {activeLeague.season}.</p>
        </div>
        <div className="command-hero-actions">
          <span className="auction-badge"><Gavel size={15}/> Asta: {activeLeague.name}</span>
          <Link className="primary-btn" href="/formazione"><Sparkles size={17}/> Analizza formazione</Link>
        </div>
      </section>

      {error && <div className="form-alert error">{error}</div>}

      <section className="command-stats">
        <article className="command-stat"><span className="command-stat-icon"><Coins/></span><div><small>Crediti residui</small><strong>{model.credits}<em> / {activeLeague.budget}</em></strong><span>{model.spent} crediti investiti</span></div></article>
        <article className="command-stat"><span className="command-stat-icon"><UsersRound/></span><div><small>Rosa</small><strong>{model.myBuys.length}<em> / {activeLeague.roster_size}</em></strong><span>{model.myBuys.length >= activeLeague.roster_size ? "Rosa completa" : `${activeLeague.roster_size - model.myBuys.length} slot disponibili`}</span></div></article>
        <article className="command-stat featured"><span className="command-stat-icon"><Trophy/></span><div><small>Indice prontezza</small><strong>{model.readiness}<em> / 100</em></strong><span>Basato su rosa, modulo e indisponibili</span></div></article>
        <article className="command-stat"><span className="command-stat-icon"><UsersRound/></span><div><small>Partecipanti</small><strong>{model.participants || "—"}</strong><span>{activeLeague.mode === "mantra" ? "Modalità Mantra" : "Modalità Classic"}</span></div></article>
      </section>

      <section className="command-main-grid">
        <article className="command-panel formation-command">
          <div className="command-panel-head">
            <div><span className="eyebrow">FORMAZIONE CONSIGLIATA</span><h2>{model.module}</h2></div>
            <Link href="/formazione" className="command-link">Gestisci formazione <ArrowRight size={15}/></Link>
          </div>
          {model.isRamera ? <div className="command-pitch">
            <div className="pitch-module"><strong>{model.module}</strong><span>XI base attuale</span></div>
            {recommendedXI.map((spot) => {
              const info = meta[spot.name] ?? { role: "—", club: "—" };
              const buy = model.myBuys.find((item) => item.player_name_snapshot === spot.name);
              const out = model.statusMap.has(spot.name);
              return <div key={spot.name} className={`command-player ${out ? "is-out" : ""}`} style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>
                <span className="command-player-role">{info.role}</span>
                <strong>{spot.name}</strong>
                <small>{info.club}{buy ? ` · ${buy.price} cr` : ""}</small>
              </div>;
            })}
            <span className="pitch-ai"><Bot size={14}/> FantAsta</span>
          </div> : <div className="command-empty">
            <Target size={34}/><h3>Formazione da costruire</h3><p>Questa asta è indipendente da RAMERA. Quando avrà rosa e ruoli completi, qui comparirà il suo XI consigliato.</p><Link href="/formazione" className="secondary-btn">Apri formazione</Link>
          </div>}
        </article>

        <aside className="command-side-stack">
          <article className="command-panel briefing-panel">
            <div className="command-panel-head"><div><span className="eyebrow"><Sparkles size={13}/> BRIEFING FANTASTA</span><h2>Priorità dell'asta</h2></div><span className="beta-chip">BETA</span></div>
            <div className="briefing-cards">{briefing.map(({icon: Icon,title,text,tone})=><div className={`briefing-card ${tone}`} key={title}><span><Icon/></span><div><strong>{title}</strong><p>{text}</p></div></div>)}</div>
            <Link href="/analisi" className="command-link">Analisi completa <ArrowRight size={15}/></Link>
          </article>

          <article className="command-panel monitor-panel">
            <div className="command-panel-head"><div><span className="eyebrow">DA MONITORARE</span><h2>Indisponibili rosa</h2></div><ShieldAlert size={18}/></div>
            {model.unavailable.length ? <div className="monitor-list">{model.unavailable.slice(0,3).map((buy)=><div className="monitor-row" key={buy.player_name_snapshot}><div><strong>{buy.player_name_snapshot}</strong><span>{model.statusMap.get(buy.player_name_snapshot)?.note}</span></div><b>ATTENZIONE</b></div>)}</div> : <div className="mini-empty"><CheckCircle2/> Nessun indisponibile registrato.</div>}
          </article>
        </aside>
      </section>

      <section className="command-bottom-grid">
        <article className="command-panel radar-panel">
          <div className="command-panel-head"><div><span className="eyebrow">RADAR AVVERSARI</span><h2>Chi ha più crediti residui</h2></div><Link href="/lega" className="command-link">Vedi lega <ArrowRight size={15}/></Link></div>
          {model.opponentBalances.length ? <div className="radar-table"><div className="radar-row header"><span>Squadra</span><span>Spesi</span><span>Residui</span></div>{model.opponentBalances.map((team,index)=><div className="radar-row" key={team.team}><span><i>{index+1}</i>{team.team}</span><span>{team.spent}</span><strong>{team.credits}</strong></div>)}</div> : <div className="mini-empty"><UsersRound/> Il radar si attiverà quando saranno registrati acquisti avversari.</div>}
        </article>

        <article className="command-panel market-panel">
          <div className="command-panel-head"><div><span className="eyebrow">MERCATO DELL'ASTA</span><h2>Acquisti più costosi</h2></div><Gavel size={18}/></div>
          {model.topLeagueBuys.length ? <div className="market-list">{model.topLeagueBuys.map((buy,index)=><div className="market-row" key={`${buy.team_name}-${buy.player_name_snapshot}`}><span className="market-rank">{index+1}</span><div><strong>{buy.player_name_snapshot}</strong><span>{buy.team_name}</span></div><b>{buy.price} cr</b></div>)}</div> : <div className="mini-empty"><CalendarCheck/> Nessun acquisto registrato in questa asta.</div>}
        </article>
      </section>
    </div>
  </AppShell>;
}
