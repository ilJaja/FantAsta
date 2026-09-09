import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase";

export default function LoginPage(){return <main className="auth-page"><div className="auth-card"><Link href="/dashboard" className="brand"><span className="brandMark">FA</span><span>FantAsta</span></Link><span className="eyebrow">ACCOUNT</span><h1>Accesso FantAsta</h1><p>Il frontend di autenticazione è pronto per Supabase Auth. Finché le variabili ambiente non sono configurate, RAMERA resta disponibile in modalità locale/demo.</p><div className={`config-state ${supabaseConfigured?'ready':'pending'}`}><ShieldCheck size={18}/><div><strong>{supabaseConfigured?'Supabase configurato':'Supabase da collegare'}</strong><span>{supabaseConfigured?'Autenticazione pronta.':'Schema e client sono già predisposti nel repository.'}</span></div></div><Link className="primary-btn center" href="/dashboard">Entra in RAMERA</Link></div></main>}
