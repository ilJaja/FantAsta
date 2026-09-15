"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { useLeague } from "@/components/league-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Buy = { team_name: string; price: number };
type Member = { team_name: string; user_id: string | null };

export default function LegaPage() {
  const { user } = useAuth();
  const { activeLeague } = useLeague();
  const [buys, setBuys] = useState<Buy[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!activeLeague || !user) return;
      setLoading(true);
      setError("");
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { setError("Supabase non configurato."); setLoading(false); return; }
      const [membersRes, buysRes] = await Promise.all([
        supabase.from("league_members").select("team_name,user_id").eq("league_id", activeLeague.id),
        supabase.from("auction_buys").select("team_name,price").eq("league_id", activeLeague.id),
      ]);
      const firstError = membersRes.error || buysRes.error;
      if (firstError) setError(firstError.message);
      setMembers((membersRes.data ?? []) as Member[]);
      setBuys((buysRes.data ?? []) as Buy[]);
      setLoading(false);
    }
    load();
  }, [activeLeague, user]);

  const ownTeam = useMemo(() => members.find((m) => m.user_id === user?.id)?.team_name ?? null, [members, user]);

  const rows = useMemo(() => {
    const teamNames = Array.from(new Set([...members.map((m) => m.team_name), ...buys.map((b) => b.team_name)]));
    const budget = activeLeague?.budget ?? 0;
    return teamNames
      .map((team) => {
        const teamBuys = buys.filter((b) => b.team_name === team);
        const spent = teamBuys.reduce((s, b) => s + b.price, 0);
        return { team, count: teamBuys.length, spent, credits: budget - spent };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [members, buys, activeLeague]);

  if (!activeLeague) return <AppShell active="/lega"><div className="dashboard-loading">Nessuna asta selezionata.</div></AppShell>;

  return (
    <AppShell active="/lega">
      <div className="page-head">
        <div>
          <span className="eyebrow">LEGA</span>
          <h1>{activeLeague.name}</h1>
          <p>Situazione economica e rose dei partecipanti, ricostruite dagli acquisti registrati.</p>
        </div>
      </div>
      {error && <div className="form-alert error">{error}</div>}
      {loading ? (
        <div className="dashboard-loading">Caricamento lega…</div>
      ) : rows.length === 0 ? (
        <section className="panel"><p className="asta-empty">Nessun partecipante o acquisto registrato in questa asta.</p></section>
      ) : (
        <section className="panel">
          <div className="league-table">
            <div className="table-row table-head"><span>Squadra</span><span>Giocatori</span><span>Spesi</span><span>Residui</span></div>
            {rows.map((r, i) => (
              <div className={`table-row ${r.team === ownTeam ? "me" : ""}`} key={r.team}>
                <span><b>{i + 1}</b> {r.team}{r.team === ownTeam ? " (io)" : ""}</span>
                <span>{r.count}/{activeLeague.roster_size}</span>
                <span>{r.spent}</span>
                <span className="credits">{r.credits}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
