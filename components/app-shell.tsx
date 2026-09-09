"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity, BarChart3, CalendarDays, Gavel, LayoutDashboard, LogOut, Shield, Sparkles, Trophy, UsersRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { BrandLogo } from "@/components/brand-logo";

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

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <main className="auth-page"><div className="auth-card"><strong>Caricamento sessione…</strong></div></main>;

  const name = user.user_metadata?.display_name || user.email?.split("@")[0] || "Account";

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand"><BrandLogo /></Link>
        <div className="league-card"><div><span className="live-dot" /> RAMERA</div><strong>2026/27</strong><small>Mantra · 10 squadre</small></div>
        <nav className="side-nav">
          <Link href="/leagues"><UsersRound size={18}/><span>Le mie leghe</span></Link>
          {nav.map(([href, label, Icon]) => (
            <Link key={href} href={href} className={active === href ? "active" : ""}><Icon size={18}/><span>{label}</span></Link>
          ))}
        </nav>
        <div className="side-bottom"><Activity size={16}/><span>Stagione attiva</span></div>
      </aside>
      <section className="main-area">
        <header className="topbar">
          <div><span className="kicker">LEGA</span><strong>RAMERA 2026/27</strong></div>
          <div className="top-actions"><span className="ai-pill"><Sparkles size={14}/> FantAsta AI</span><span className="user-pill">{name}</span><button className="logout-icon" title="Esci" onClick={async()=>{await signOut(); router.replace("/login");}}><LogOut size={17}/></button></div>
        </header>
        <main className="page-content">{children}</main>
      </section>
    </div>
  );
}
