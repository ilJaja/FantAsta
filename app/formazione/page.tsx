import { AppShell } from "@/components/app-shell";
import { recommendedXI } from "@/lib/formation";
import { metadataFor, myRoster, unavailableFor } from "@/lib/ramera";

export default function FormazionePage(){
  const starters=new Set(recommendedXI.map(p=>p.name));
  const bench=myRoster.filter(p=>!starters.has(p.n)).slice(0,12);
  return <AppShell active="/formazione"><div className="page-head"><div><span className="eyebrow">FORMAZIONE</span><h1>3-4-2-1</h1><p>XI base costruito sulla rosa RAMERA. Il motore live aggiungerà titolarità, matchup e forma.</p></div><button className="primary-btn">Ottimizza XI</button></div><section className="formation-layout"><div className="pitch full">{recommendedXI.map(p=>{const meta=metadataFor(p.name); const out=unavailableFor(p.name); return <div className={`pitch-player ${out?'is-out':''}`} style={{left:`${p.x}%`,top:`${p.y}%`}} key={p.name}><span>{p.name}</span><small>{meta.role}</small></div>})}</div><aside className="panel bench"><span className="eyebrow">PANCHINA</span><h2>Alternative</h2>{bench.map(p=><div className="bench-row" key={p.n}><div><strong>{p.n}</strong><span>{metadataFor(p.n).role}</span></div><b>{p.price} cr</b></div>)}</aside></section></AppShell>;
}
