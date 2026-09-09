import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { myRoster, unavailableFor } from "@/lib/ramera";

export default function GiornataPage(){
 const outs=myRoster.map(p=>({name:p.n,note:unavailableFor(p.n)})).filter(x=>x.note);
 return <AppShell active="/giornata"><div className="page-head"><div><span className="eyebrow">BRIEFING GIORNATA</span><h1>Decisioni prima della consegna</h1><p>Questa pagina è già collegata alla tua rosa; i dati live verranno innestati sopra questo flusso.</p></div></div><div className="brief-grid"><article className="panel ai-panel"><span className="eyebrow"><Sparkles size={13}/> FANTASTA AI</span><h2>Checklist formazione</h2><div className="brief-line"><CheckCircle2/> Conferma i titolari certi</div><div className="brief-line"><CheckCircle2/> Valuta i due trequartisti in base al matchup</div><div className="brief-line"><CheckCircle2/> Mantieni una copertura Pc in panchina</div></article><article className="panel"><span className="eyebrow"><AlertTriangle size={13}/> INDISPONIBILI</span><h2>{outs.length} nella tua rosa</h2>{outs.length?outs.map(o=><div className="out-row" key={o.name}><strong>{o.name}</strong><span>{o.note}</span></div>):<p>Nessun indisponibile censito nel backup.</p>}</article></div></AppShell>
}
