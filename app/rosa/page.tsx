"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Gavel } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PlayerRow } from "@/components/player-row";
import { useAuth } from "@/components/auth-provider";
import { useLeague } from "@/components/league-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { departmentFor } from "@/lib/ramera";

type Buy = { team_name: string; player_name_snapshot: string; price: number };
type Member = { team_name: string; user_id: string | null };

const REPARTI = ["Por", "Dif", "Cen", "Att"] as const;

export default function RosaPage() {
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
        supabase.from("auction_buys").select("team_name,player_name_snapshot,price").eq("league_id", activeLeague.id),
      ]);
      const firstError = membersRes.error || buysRes.error;
      if (firstError) setError(firstError.message);
      setMembers((membersRes.data ?? []) as Member[]);
      setBuys((buysRes.data ?? []) as Buy[]);
      setLoading(false);
    }
    load();
  }, [activeLeague, user]);

  const teamName = useMemo(() => {
    const own = members.find((m) => m.user_id === user?.id);
    return own?.team_name ?? user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "La mia squadra";
  }, [members, user]);

  const myRoster = useMemo(
    () => buys.filter((b) => b.team_name === teamName),
    [buys, teamName],
  );

  const spent = myRoster.reduce((sum, b) => sum + b.price, 0);
  const credits = (activeLeague?.budget ?? 0) - spent;

  const groups = REPARTI.map((rep) => ({
    rep,
    players: myRoster.filter((p) => departmentFor(p.player_name_snapshot) === rep),
  }));

  if (!activeLeague) return <AppShell active="/rosa"><div className="dashboard-loading">Nessuna asta selezionata.</div></AppShell>;

  return (
    <AppShell active="/rosa">
      <div className="page-head">
        <div>
          <span className="eyebrow">LA MIA ROSA</span>
          <h1>{teamName}</h1>
          <p>{myRoster.length}/{activeLeague.roster_size} giocatori · {credits} crediti residui · Asta: {activeLeague.name}</p>
        </div>
        <Link className="primary-btn" href="/asta"><Gavel size={16} /> Modifica acquisti nell&apos;Asta</Link>
      </div>
      {error && <div className="form-alert error">{error}</div>}
      {loading ? (
        <div className="dashboard-loading">Caricamento rosa…</div>
      ) : myRoster.length === 0 ? (
        <section className="panel"><p className="asta-empty">Nessun giocatore in rosa per questa asta. Vai all&apos;<Link href="/asta">Asta</Link> per registrare i tuoi acquisti.</p></section>
      ) : (
        <div className="roster-columns">
          {groups.map((g) => (
            <section className="panel" key={g.rep}>
              <div className="panel-head"><h2>{g.rep}</h2><span>{g.players.length}</span></div>
              <div className="player-list">
                {g.players.length === 0 ? (
                  <p className="asta-empty">Nessun giocatore in questo reparto.</p>
                ) : (
                  g.players.map((p) => <PlayerRow key={`${p.player_name_snapshot}-${p.price}`} name={p.player_name_snapshot} price={p.price} />)
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
