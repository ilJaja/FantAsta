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
  error: string | null;
  selectLeague: (leagueId: string) => void;
  refreshLeagues: () => Promise<void>;
};

const LeagueContext = createContext<LeagueContextValue>({
  leagues: [],
  activeLeague: null,
  loading: true,
  error: null,
  selectLeague: () => {},
  refreshLeagues: async () => {},
});

const STORAGE_KEY = "fantasta-active-league";

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [leagues, setLeagues] = useState<ActiveLeague[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLeagues = useCallback(async () => {
    if (!user) {
      setLeagues([]);
      setActiveId(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase non configurato");
      setLoading(false);
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      setError(sessionError?.message || "Sessione non disponibile");
      setLoading(false);
      return;
    }

    async function fetchLeagues() {
      return supabase!
        .from("leagues")
        .select("id,name,season,mode,budget,roster_size,legacy_key,metadata")
        .order("created_at", { ascending: false });
    }

    let result = await fetchLeagues();
    if (!result.error && (result.data ?? []).length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 180));
      result = await fetchLeagues();
    }

    if (result.error) {
      console.error("FantAsta: impossibile caricare le aste", result.error);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    const next = (result.data ?? []) as ActiveLeague[];
    setLeagues(next);

    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const validStored = stored && next.some((league) => league.id === stored) ? stored : null;
    const preferred = validStored ?? next.find((league) => league.legacy_key === "ramera-2026-27")?.id ?? next[0]?.id ?? null;

    setActiveId((current) => {
      const selected = current && next.some((league) => league.id === current) ? current : preferred;
      if (selected && typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, selected);
      return selected;
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) void refreshLeagues();
  }, [authLoading, refreshLeagues]);

  const selectLeague = useCallback((leagueId: string) => {
    setActiveId(leagueId);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, leagueId);
  }, []);

  const activeLeague = useMemo(
    () => leagues.find((league) => league.id === activeId) ?? null,
    [leagues, activeId],
  );

  const value = useMemo(
    () => ({ leagues, activeLeague, loading, error, selectLeague, refreshLeagues }),
    [leagues, activeLeague, loading, error, selectLeague, refreshLeagues],
  );

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}

export function useLeague() {
  return useContext(LeagueContext);
}
