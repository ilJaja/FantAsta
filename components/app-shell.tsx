"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity, BarChart3, CalendarDays, Gavel, LayoutDashboard, LogOut, Shield, Sparkles, Trophy, UsersRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import { useLeague } from "@/components/league-provider";

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
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { activeLeague, leagues, loading: leagueLoading, selectLeague } = useLeague();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && !leagueLoading && leagues.length === 0) router.replace("/leagues");
  }, [loading, user, leagueLoading, leagues.length, router]);

  if (loading || !user || leagueLoading) return <main className="auth-page"><div className="auth-card"><strong>Caricamento sessione…</strong></div></main>;
  if (!activeLeague) return <main className="auth-page"><div className="auth-card"><strong>Seleziona una lega per continuare.</strong><Link className="primary-btn center" href="/leagues">Le mie leghe</Link></div></main>;

  const name = user.user_metadata?.display_name || user.email?.split("@")[0] || "Account";
  const mode = activeLeague.mode === "mantra" ? "Mantra" : "Classic";

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand"><BrandLogo /></Link>
        <div className="league-card">
          <div><span className="live-dot" /> ASTA ATTIVA</div>
          <strong>{activeLeague.name}</strong>
          <small>{activeLeague.season} · {mode}</small>
        </div>
        <nav className="side-nav">
          <Link href="/leagues"><UsersRound size={18}/><span>Le mie aste</span></Link>
          {nav.map(([href, label, Icon]) => (
            <Link key={href} href={href} className={active === href ? "active" : ""}><Icon size={18}/><span>{label}</span></Link>
          ))}
        </nav>
        <div className="side-bottom"><Activity size={16}/><span>Asta: {activeLeague.name}</span></div>
      </aside>
      <section className="main-area">
        <header className="topbar">
          <div className="league-switcher-wrap">
            <span className="kicker">ASTA</span>
            {leagues.length > 1 ? (
              <select className="league-switcher" value={activeLeague.id} onChange={(e)=>selectLeague(e.target.value)} aria-label="Seleziona asta">
                {leagues.map((league)=><option key={league.id} value={league.id}>{league.name} · {league.season}</option>)}
              </select>
            ) : <strong>{activeLeague.name} · {activeLeague.season}</strong>}
          </div>
          <div className="top-actions"><span className="ai-pill"><Sparkles size={14}/> FantAsta AI</span><span className="user-pill">{name}</span><button className="logout-icon" title="Esci" onClick={async()=>{await signOut(); router.replace("/login");}}><LogOut size={17}/></button></div>
        </header>
        <main className="page-content">{children}</main>
      </section>
    </div>
  );
}
