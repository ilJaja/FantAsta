import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert, Sparkles, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { PlayerRow } from "@/components/player-row";
import { creditsOf, myRoster, myTeam } from "@/lib/ramera";
import { ramera } from "@/data/ramera";

export default function Dashboard() {
  const spent = ramera.budget - creditsOf(myTeam);
  const top = [...myRoster].sort((a,b)=>b.price-a.price).slice(0,5);
  return <AppShell active="/dashboard">
    <div className="page-head"><div><span className="eyebrow">COMMAND CENTER</span><h1>Ciao Jason, la RAMERA è pronta.</h1><p>Rosa importata dal backup reale. Da qui gestiamo asta, formazione, giornata e analisi della lega.</p></div><Link className="primary-btn" href="/formazione"><Sparkles size={17}/> Analizza formazione</Link></div>
    <section className="stats-grid">
      <StatCard label="CREDITI RESIDUI" value={`${creditsOf(myTeam)}`} sub={`${spent} / ${ramera.budget} spesi`} tone="green" />
      <StatCard label="ROSA" value={`${myRoster.length}/${ramera.rosterSize}`} sub="Rosa completa" />
      <StatCard label="MODULO" value={ramera.formation} sub="Modulo Mantra attivo" />
      <StatCard label="LEGA" value={`${ramera.teams.length}`} sub="fantallenatori" />
    </section>
    <section className="dashboard-grid">
      <article className="panel large"><div className="panel-head"><div><span className="eyebrow">ROSA</span><h2>I tuoi investimenti principali</h2></div><Link href="/rosa">Vedi rosa <ArrowRight size={15}/></Link></div><div className="player-list">{top.map(p=><PlayerRow key={`${p.n}-${p.price}`} name={p.n} price={p.price}/>)}</div></article>
      <div className="stack">
        <article className="panel ai-panel"><span className="eyebrow"><Sparkles size={13}/> AI BRIEFING</span><h2>3 priorità per la prossima fase</h2><div className="brief-line"><CheckCircle2/> Definisci l'XI base del 3-4-2-1</div><div className="brief-line"><ShieldAlert/> Controlla indisponibili prima della consegna</div><div className="brief-line"><UsersRound/> Confronta la rosa con le 9 avversarie</div><Link href="/giornata" className="inline-link">Apri briefing <ArrowRight size={15}/></Link></article>
        <article className="panel"><span className="eyebrow">DATI IMPORTATI</span><strong className="huge">273</strong><p>acquisti complessivi recuperati dal backup RAMERA.</p></article>
      </div>
    </section>
  </AppShell>;
}
