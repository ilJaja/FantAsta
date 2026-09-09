import { ArrowRight, Bot, Gavel, ShieldCheck, Sparkles, Trophy, Users } from "lucide-react";

const features = [
  { icon: Gavel, title: "Asta intelligente", text: "Budget, slot, chiamate e strategie in tempo reale." },
  { icon: Trophy, title: "Gestione stagione", text: "La tua rosa continua a vivere dopo l'asta, giornata dopo giornata." },
  { icon: Bot, title: "Consigli AI", text: "Formazione, ballottaggi, matchup e motivazioni delle scelte." },
  { icon: Users, title: "Leghe multiple", text: "Crea le tue leghe e invita gli amici in uno spazio condiviso." },
];

export default function Home() {
  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand"><span className="brandMark">FA</span><span>FantAsta</span></div>
        <div className="navActions"><button className="ghost">Accedi</button><button className="primary small">Crea account</button></div>
      </nav>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={15}/> ASTA. STAGIONE. UNA SOLA APP.</div>
        <h1>Il tuo <span>fantacalcio</span>,<br/>con un assistente in panchina.</h1>
        <p>FantAsta ti accompagna dalla preparazione dell'asta fino all'ultima giornata: costruisci la rosa, gestisci la lega e ricevi consigli ragionati su chi schierare.</p>
        <div className="heroActions"><button className="primary">Inizia una nuova lega <ArrowRight size={18}/></button><button className="secondary">Importa un'asta</button></div>
        <div className="trust"><ShieldCheck size={16}/> Progettato per Classic e Mantra · dati separati per ogni lega</div>
      </section>

      <section className="preview">
        <div className="previewTop"><div><span className="dot"></span> RAMERA 2026/27</div><span>GIORNATA 3</span></div>
        <div className="previewGrid">
          <div className="scoreCard"><span>FORMAZIONE</span><strong>3-4-2-1</strong><p>XI consigliato pronto per la prossima giornata.</p><div className="pitch"><div className="player p1">89<small>Malen</small></div><div className="player p2">82<small>Isaksen</small></div><div className="player p3">76<small>Pasalic</small></div><div className="player p4">85<small>Svilar</small></div></div></div>
          <div className="sideCards"><div className="mini"><span>FANTASTA SCORE</span><strong>84<span>/100</span></strong><p>Rosa competitiva</p></div><div className="mini accent"><span>AI BRIEFING</span><strong>3 scelte chiave</strong><p>Analizza titolarità, matchup e rischio prima di consegnare la formazione.</p><button>Apri briefing <ArrowRight size={15}/></button></div></div>
        </div>
      </section>

      <section className="features">{features.map(({icon: Icon,title,text}) => <article key={title}><div className="icon"><Icon size={20}/></div><h3>{title}</h3><p>{text}</p></article>)}</section>
    </main>
  );
}
