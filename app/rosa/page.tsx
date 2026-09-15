import Link from "next/link";
import { Gavel } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PlayerRow } from "@/components/player-row";
import { creditsOf, departmentFor, myRoster, myTeam } from "@/lib/ramera";
import { ramera } from "@/data/ramera";

export default function RosaPage(){
  const groups = ["Por","Dif","Cen","Att"].map(rep=>({rep, players: myRoster.filter(p=>departmentFor(p.n)===rep)}));
  return <AppShell active="/rosa"><div className="page-head"><div><span className="eyebrow">LA MIA ROSA</span><h1>{myTeam}</h1><p>{myRoster.length}/{ramera.rosterSize} giocatori · {creditsOf(myTeam)} crediti residui</p></div><Link className="primary-btn" href="/asta"><Gavel size={16}/> Modifica acquisti nell'Asta</Link></div><div className="roster-columns">{groups.map(g=><section className="panel" key={g.rep}><div className="panel-head"><h2>{g.rep}</h2><span>{g.players.length}</span></div><div className="player-list">{g.players.map(p=><PlayerRow key={`${p.n}-${p.price}`} name={p.n} price={p.price}/>)}</div></section>)}</div></AppShell>;
}
