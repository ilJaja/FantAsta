"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { useLeague } from "@/components/league-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { recommendedXI } from "@/lib/formation";
import { departmentFor, metadataFor } from "@/lib/ramera";

type Buy = { team_name: string; player_name_snapshot: string; price: number };
type Member = { team_name: string; user_id: string | null };
type Status = { player_name: string };

export default function FormazionePage() {
  const { user } = useAuth();
  const { activeLeague } = useLeague();
  const [buys, setBuys] = useState<Buy[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!activeLeague || !user) return;
      setLoading(true);
      setError("");
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { setError("Supabase non configurato."); setLoading(false); return; }
      const [membersRes, buysRes, statusRes] = await Promise.all([
        supabase.from("league_members").select("team_name,user_id").eq("league_id", activeLeague.id),
        supabase.from("auction_buys").select("team_name,player_name_snapshot,price").eq("league_id", activeLeague.id),
        supabase.from("player_status").select("player_name").eq("league_id", activeLeague.id),
      ]);
      const firstError = membersRes.error || buysRes.error || statusRes.error;
      if (firstError) setError(firstError.message);
      setMembers((membersRes.data ?? []) as Member[]);
      setBuys((buysRes.data ?? []) as Buy[]);
      setStatuses((statusRes.data ?? []) as Status[]);
      setLoading(false);
    }
    load();
  }, [activeLeague, user]);

  const teamName = useMemo(() => {
    const own = members.find((m) => m.user_id === user?.id);
    return own?.team_name ?? user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "La mia squadra";
  }, [members, user]);

  const myRoster = useMemo(() => buys.filter((b) => b.team_name === teamName), [buys, teamName]);
  const outSet = useMemo(() => new Set(statuses.map((s) => s.player_name)), [statuses]);
  const isRamera = activeLeague?.legacy_key === "ramera-2026-27";

  if (!activeLeague) return <AppShell active="/formazione"><div className="dashboard-loading">Nessuna asta selezionata.</div></AppShell>;

  if (loading) return <AppShell active="/formazione"><div className="dashboard-loading">Caricamento formazione…</div></AppShell>;

  // Vista RAMERA: XI base statico + panchina dalla rosa reale
  if (isRamera) {
    const starters = new Set(recommendedXI.map((p) => p.name));
    const bench = myRoster.filter((p) => !starters.has(p.player_name_snapshot)).slice(0, 12);
    return (
      <AppShell active="/formazione">
        <div className="page-head">
          <div><span className="eyebrow">FORMAZIONE</span><h1>3-4-2-1</h1><p>XI base costruito sulla rosa RAMERA. Il motore live aggiungerà titolarità, matchup e forma.</p></div>
          <button className="primary-btn">Ottimizza XI</button>
        </div>
        {error && <div className="form-alert error">{error}</div>}
        <section className="formation-layout">
          <div className="pitch full">
            {recommendedXI.map((p) => {
              const meta = metadataFor(p.name);
              const out = outSet.has(p.name);
              return <div className={`pitch-player ${out ? "is-out" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} key={p.name}><span>{p.name}</span><small>{meta.role}</small></div>;
            })}
          </div>
          <aside className="panel bench">
            <span className="eyebrow">PANCHINA</span><h2>Alternative</h2>
            {bench.length === 0 ? <p className="asta-empty">Nessuna alternativa in rosa.</p> : bench.map((p) => <div className="bench-row" key={p.player_name_snapshot}><div><strong>{p.player_name_snapshot}</strong><span>{metadataFor(p.player_name_snapshot).role}</span></div><b>{p.price} cr</b></div>)}
          </aside>
        </section>
      </AppShell>
    );
  }

  // Vista lega generica: nessun XI RAMERA, si usa solo la rosa reale
  const REPARTI = ["Por", "Dif", "Cen", "Att"] as const;
  const groups = REPARTI.map((rep) => ({ rep, players: myRoster.filter((p) => departmentFor(p.player_name_snapshot) === rep) }));
  const enough = myRoster.length >= 11;

  return (
    <AppShell active="/formazione">
      <div className="page-head">
        <div><span className="eyebrow">FORMAZIONE</span><h1>{teamName}</h1><p>Formazione basata sulla rosa reale di questa asta.</p></div>
      </div>
      {error && <div className="form-alert error">{error}</div>}
      {myRoster.length === 0 ? (
        <section className="panel"><div className="command-empty"><Target size={34} /><h3>Rosa da costruire</h3><p>Non hai ancora giocatori in questa asta. Registra gli acquisti nell&apos;Asta per generare la formazione.</p><Link href="/asta" className="secondary-btn">Vai all&apos;Asta</Link></div></section>
      ) : (
        <>
          {!enough && <div className="asta-note warn">Servono almeno 11 giocatori per un XI completo. Attualmente in rosa: {myRoster.length}. L&apos;XI consigliato automatico si attiverà al completamento.</div>}
          <div className="roster-columns">
            {groups.map((g) => (
              <section className="panel" key={g.rep}>
                <div className="panel-head"><h2>{g.rep}</h2><span>{g.players.length}</span></div>
                <div className="player-list">
                  {g.players.length === 0 ? <p className="asta-empty">Nessun giocatore.</p> : g.players.map((p) => (
                    <div className={`bench-row ${outSet.has(p.player_name_snapshot) ? "is-out" : ""}`} key={`${p.player_name_snapshot}-${p.price}`}>
                      <div><strong>{p.player_name_snapshot}</strong><span>{metadataFor(p.player_name_snapshot).role}</span></div><b>{p.price} cr</b>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
