import Link from "next/link";
import { Activity, BarChart3, CalendarDays, CircleUserRound, Gavel, LayoutDashboard, Shield, Sparkles, Trophy, UsersRound } from "lucide-react";

const nav = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/asta", "Asta", Gavel],
  ["/rosa", "Rosa", Shield],
  ["/formazione", "Formazione", Trophy],
  ["/giornata", "Giornata", CalendarDays],
  ["/analisi", "Analisi", BarChart3],
  ["/lega", "Lega", UsersRound],
] as const;

export function AppShell({ children, active }: { children: React.ReactNode; active: string }) {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand"><span className="brandMark">FA</span><span>FantAsta</span></Link>
        <div className="league-card"><div><span className="live-dot" /> RAMERA</div><strong>2026/27</strong><small>Mantra · 10 squadre</small></div>
        <nav className="side-nav">
          {nav.map(([href, label, Icon]) => (
            <Link key={href} href={href} className={active === href ? "active" : ""}><Icon size={18}/><span>{label}</span></Link>
          ))}
        </nav>
        <div className="side-bottom"><Activity size={16}/><span>Stagione attiva</span></div>
      </aside>
      <section className="main-area">
        <header className="topbar">
          <div><span className="kicker">LEGA</span><strong>RAMERA 2026/27</strong></div>
          <div className="top-actions"><span className="ai-pill"><Sparkles size={14}/> FantAsta AI</span><Link href="/login" className="user-pill"><CircleUserRound size={17}/> Jason</Link></div>
        </header>
        <main className="page-content">{children}</main>
      </section>
    </div>
  );
}
