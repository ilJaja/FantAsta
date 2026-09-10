"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useLeague } from "@/components/league-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Starter = { name:string; role:string; club:string; opponent:string; venue:"Casa"|"Trasferta"; probability:number; reason:string };
type Bench = { order:number; name:string; role:string; probability:number; reason:string };
type Unavailable = { name:string; status:string; note:string };
type PlayerAnalysis = { name:string; role:string; club:string; opponent:string; venue:"Casa"|"Trasferta"; probability:number; verdict:"start"|"bench"|"avoid"; recommendation:string; note:string };
type Check = { label:string; detail:string; level?:string };
type Source = { name:string; url:string; updated_at?:string };
type Report = {
  id:string; matchday:number|null; competition:string; period_label:string|null; generated_at:string; kickoff_at:string|null;
  formation:string|null; summary:string|null; confidence:number|null; starters:Starter[]; bench:Bench[]; unavailable:Unavailable[];
  player_analysis:PlayerAnalysis[]; checks:Check[]; sources:Source[];
};

function probabilityClass(value:number){ return value >= 75 ? "probability" : value >= 45 ? "probability mid" : "probability low"; }
function verdictLabel(v:PlayerAnalysis["verdict"]){ return v === "start" ? "TITOLARE" : v === "bench" ? "PANCHINA" : "EVITA"; }

export default function GiornataPage(){
  const { activeLeague } = useLeague();
  const [report,setReport] = useState<Report|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [reloadKey,setReloadKey] = useState(0);

  useEffect(()=>{
    async function load(){
      if(!activeLeague) return;
      setLoading(true); setError("");
      const supabase=getSupabaseBrowserClient();
      if(!supabase){ setError("Supabase non configurato"); setLoading(false); return; }
      const {data,error}=await supabase.from("matchday_reports")
        .select("id,matchday,competition,period_label,generated_at,kickoff_at,formation,summary,confidence,starters,bench,unavailable,player_analysis,checks,sources")
        .eq("league_id",activeLeague.id).eq("status","published").order("generated_at",{ascending:false}).limit(1).maybeSingle();
      if(error) setError(error.message);
      setReport((data as Report|null) ?? null);
      setLoading(false);
    }
    void load();
  },[activeLeague,reloadKey]);

  const generated=useMemo(()=>report ? new Date(report.generated_at).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "",[report]);
  const kickoff=useMemo(()=>report?.kickoff_at ? new Date(report.kickoff_at).toLocaleString("it-IT",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : null,[report]);

  return <AppShell active="/giornata"><div className="matchday-center">
    <section className="matchday-hero"><div><span className="eyebrow">FANTASTA MATCHDAY CENTER</span><h1>{report?.matchday ? `Giornata ${report.matchday}` : "Giornata"}</h1><p>Asta: <strong>{activeLeague?.name}</strong> · analisi formazione, panchina e matchup raccolte in un unico posto.</p></div><div className="matchday-meta">{kickoff&&<span className="matchday-chip"><CalendarDays size={14}/> Inizio {kickoff}</span>}<span className="matchday-chip neutral"><Clock3 size={14}/> Aggiornato {generated||"—"}</span></div></section>

    {loading ? <article className="matchday-panel report-empty"><RefreshCw/><h2>Carico il report della giornata…</h2></article> : error ? <article className="matchday-panel report-empty"><AlertTriangle/><h2>Report non disponibile</h2><p>{error}</p><button className="secondary-btn" onClick={()=>setReloadKey(v=>v+1)}><RefreshCw size={15}/> Riprova</button></article> : !report ? <article className="matchday-panel report-empty"><Sparkles/><h2>Nessun report pubblicato</h2><p>Quando FantAsta completa l’analisi settimanale, la troverai qui con XI, panchina ordinata, probabilità di voto e matchup.</p></article> : <>
      <section className="matchday-summary"><div><span className="eyebrow">VERDETTO FANTASTA</span><h2>{report.formation || "Formazione consigliata"}</h2><p>{report.summary}</p></div><div className="confidence-ring"><div><strong>{report.confidence ?? "—"}%</strong><small>confidenza</small></div></div></section>

      <section className="matchday-grid"><div className="matchday-stack">
        <article className="matchday-panel"><div className="matchday-panel-head"><div><span className="eyebrow">XI CONSIGLIATO</span><h2>Formazione da schierare</h2></div><CheckCircle2 size={18}/></div><div className="lineup-grid">{report.starters.map(p=><div className="lineup-card" key={p.name}><span className="role">{p.role}</span><div><strong>{p.name}</strong><span>{p.club} · vs {p.opponent} · {p.venue}</span><small>{p.reason}</small></div><b className={probabilityClass(p.probability)}>{p.probability}%</b></div>)}</div></article>

        <article className="matchday-panel"><div className="matchday-panel-head"><div><span className="eyebrow">ANALISI ROSA</span><h2>Probabilità, avversario e verdetto</h2></div><span className="update-note">stima FantAsta</span></div><div className="report-table-wrap"><table className="report-table"><thead><tr><th>Giocatore</th><th>Ruolo</th><th>Match</th><th>Casa/Fuori</th><th>Titolarità</th><th>Scelta</th><th>Nota</th></tr></thead><tbody>{report.player_analysis.map(p=><tr key={p.name}><td>{p.name}</td><td>{p.role}</td><td>{p.club} - {p.opponent}</td><td className={p.venue==="Casa"?"venue-home":"venue-away"}>{p.venue}</td><td><span className={probabilityClass(p.probability)}>{p.probability}%</span></td><td><span className={`verdict ${p.verdict}`}>{verdictLabel(p.verdict)}</span></td><td>{p.recommendation}{p.note?` · ${p.note}`:""}</td></tr>)}</tbody></table></div></article>
      </div>

      <aside className="matchday-stack"><article className="matchday-panel"><div className="matchday-panel-head"><div><span className="eyebrow">PANCHINA</span><h2>Ordine di subentro</h2></div><Sparkles size={17}/></div><div className="bench-list">{report.bench.map(p=><div className="bench-row" key={`${p.order}-${p.name}`}><span className="bench-order">{p.order}</span><div><strong>{p.name} · {p.role}</strong><span>{p.reason}</span></div><b className={probabilityClass(p.probability)}>{p.probability}%</b></div>)}</div></article>

      <article className="matchday-panel"><div className="matchday-panel-head"><div><span className="eyebrow">DA MONITORARE</span><h2>Controlli pre-consegna</h2></div><ShieldAlert size={18}/></div><div className="checks-list">{report.checks.map(c=><div className="check-item" key={c.label}><strong>{c.label}</strong><span>{c.detail}</span></div>)}</div></article>

      <article className="matchday-panel"><div className="matchday-panel-head"><div><span className="eyebrow">OUT / SQUALIFICATI</span><h2>Non schierabili</h2></div><AlertTriangle size={18}/></div><div className="alert-list">{report.unavailable.length?report.unavailable.map(p=><div className="alert-item danger" key={p.name}><strong>{p.name} · {p.status}</strong><span>{p.note}</span></div>):<div className="mini-empty"><CheckCircle2/> Nessun indisponibile.</div>}</div></article></aside></section>

      <article className="matchday-panel"><div className="matchday-panel-head"><div><span className="eyebrow">FONTI</span><h2>Controlli incrociati</h2></div><span className="update-note">{report.period_label}</span></div><div className="sources-list">{report.sources.map(s=><div className="source-item" key={s.url}><span>{s.name}{s.updated_at?` · ${s.updated_at}`:""}</span><a href={s.url} target="_blank" rel="noreferrer">Apri fonte <ArrowUpRight size={13}/></a></div>)}</div></article>
    </>}
  </div></AppShell>;
}
