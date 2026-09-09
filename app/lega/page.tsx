import { AppShell } from "@/components/app-shell";
import { creditsOf, rosterOf, spentOf } from "@/lib/ramera";
import { ramera } from "@/data/ramera";

export default function LegaPage(){
  const rows=ramera.teams.map(team=>({team,count:rosterOf(team).length,spent:spentOf(team),credits:creditsOf(team)})).sort((a,b)=>b.spent-a.spent);
  return <AppShell active="/lega"><div className="page-head"><div><span className="eyebrow">LEGA</span><h1>RAMERA</h1><p>Situazione economica e rose dei 10 partecipanti, ricostruite dai 273 acquisti.</p></div></div><section className="panel"><div className="league-table"><div className="table-row table-head"><span>Squadra</span><span>Giocatori</span><span>Spesi</span><span>Residui</span></div>{rows.map((r,i)=><div className={`table-row ${r.team==='Jason'?'me':''}`} key={r.team}><span><b>{i+1}</b> {r.team}</span><span>{r.count}/{ramera.rosterSize}</span><span>{r.spent}</span><span className="credits">{r.credits}</span></div>)}</div></section></AppShell>;
}
