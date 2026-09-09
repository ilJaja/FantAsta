"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";

export type ActiveLeague = {
  id: string;
  name: string;
  season: string;
  mode: "classic" | "mantra";
  budget: number;
  roster_size: number;
  legacy_key: string | null;
  metadata: Record<string, unknown> | null;
};

type LeagueContextValue = {
  leagues: ActiveLeague[];
  activeLeague: ActiveLeague | null;
  loading: boolean;
  selectLeague: (leagueId: string) => void;
  refreshLeagues: () => Promise<void>;
};

const LeagueContext = createContext<LeagueContextValue>({
  leagues: [],
  activeLeague: null,
  loading: true,
  selectLeague: () => {},
  refreshLeagues: async () => {},
});

const STORAGE_KEY = "fantasta-active-league";

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [leagues, setLeagues] = useState<ActiveLeague[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshLeagues = useCallback(async () => {
    if (!user) {
      setLeagues([]);
      setActiveId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("leagues")
      .select("id,name,season,mode,budget,roster_size,legacy_key,metadata")
      .order("created_at", { ascending: false });

    const next = (data ?? []) as ActiveLeague[];
    setLeagues(next);

    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const validStored = stored && next.some((league) => league.id === stored) ? stored : null;
    const preferred = validStored ?? next.find((league) => league.legacy_key === "ramera-2026-27")?.id ?? next[0]?.id ?? null;
    setActiveId((current) => current && next.some((league) => league.id === current) ? current : preferred);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) refreshLeagues();
  }, [authLoading, refreshLeagues]);

  const selectLeague = useCallback((leagueId: string) => {
    setActiveId(leagueId);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, leagueId);
  }, []);

  const activeLeague = useMemo(
    () => leagues.find((league) => league.id === activeId) ?? null,
    [leagues, activeId],
  );

  const value = useMemo(() => ({ leagues, activeLeague, loading, selectLeague, refreshLeagues }), [leagues, activeLeague, loading, selectLeague, refreshLeagues]);

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}

export function useLeague() {
  return useContext(LeagueContext);
}
