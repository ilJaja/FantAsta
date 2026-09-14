"use client";

import { useLeague } from "@/components/league-provider";
import ClassicPage from "@/app/classic/page";
import { AppShell } from "@/components/app-shell";
import { creditsOf, rosterOf } from "@/lib/ramera";
import { ramera } from "@/data/ramera";

function MantraAstaPage(){return <AppShell active="/asta"><div className="page-head"><div><span className="eyebrow">ASTA</span><h1>Archivio asta RAMERA</h1><p>L'asta è conclusa: il backup è stato importato senza perdere acquisti, prezzi e indisponibili.</p></div></div><section className="auction-grid">{ramera.teams.map(team=><article className="team-card" key={team}><div><span>{team}</span><strong>{creditsOf(team)} cr</strong></div><div className="progress"><i style={{width:`${Math.min(100,(rosterOf(team).length/ramera.rosterSize)*100)}%`}}/></div><small>{rosterOf(team).length}/{ramera.rosterSize} giocatori</small></article>)}</section></AppShell>}


export default function AstaPage() {
  const { activeLeague } = useLeague();
  return activeLeague?.mode === "classic" ? <ClassicPage/> : <MantraAstaPage/>;
}
