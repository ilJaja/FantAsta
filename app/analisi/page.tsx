import { AppShell } from "@/components/app-shell";
import { creditsOf, rosterOf, spentOf } from "@/lib/ramera";
import { ramera } from "@/data/ramera";

export default function AnalisiPage(){
 const avg=ramera.teams.reduce((s,t)=>s+spentOf(t),0)/ramera.teams.length;
 const richest=[...ramera.teams].sort((a,b)=>creditsOf(b)-creditsOf(a))[0];
 const fullest=[...ramera.teams].sort((a,b)=>rosterOf(b).length-rosterOf(a).length)[0];
 return <AppShell active="/analisi"><div className="page-head"><div><span className="eyebrow">ANALISI LEGA</span><h1>Snapshot RAMERA</h1><p>Metriche derivate direttamente dai dati d'asta importati.</p></div></div><section className="stats-grid"><article className="stat-card"><span>SPESA MEDIA</span><strong>{avg.toFixed(1)}</strong><small>crediti per squadra</small></article><article className="stat-card green"><span>PIÙ CREDITI</span><strong>{richest}</strong><small>{creditsOf(richest)} residui</small></article><article className="stat-card"><span>ROSA PIÙ PIENA</span><strong>{fullest}</strong><small>{rosterOf(fullest).length} giocatori</small></article><article className="stat-card amber"><span>ACQUISTI</span><strong>{ramera.totalBuys}</strong><small>importati</small></article></section><article className="panel"><h2>Prossimo livello di analisi</h2><p className="muted">La struttura è pronta per aggiungere forza per reparto, compatibilità Mantra, scambi consigliati, matchup e FantAsta Score settimanale senza cambiare modello dati.</p></article></AppShell>
}
