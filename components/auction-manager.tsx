"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Coins, Gavel, Pencil, Plus, RefreshCw, RotateCcw, Trash2, UsersRound, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { useLeague } from "@/components/league-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import "@/app/asta-manager.css";

type Member = { team_name: string; user_id: string | null; is_admin?: boolean };
type Buy = { id: string; team_name: string; player_name_snapshot: string; price: number };

export function AuctionManager() {
  const { user } = useAuth();
  const { activeLeague } = useLeague();

  const [members, setMembers] = useState<Member[]>([]);
  const [buys, setBuys] = useState<Buy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // add-buy form
  const [newTeam, setNewTeam] = useState("");
  const [newPlayer, setNewPlayer] = useState("");
  const [newPrice, setNewPrice] = useState<number>(1);

  // inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);

  // delete / reset confirms
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);

  const isOwner = useMemo(
    () => Boolean(activeLeague && user && activeLeague.owner_id === user.id),
    [activeLeague, user],
  );

  const load = useCallback(async () => {
    if (!activeLeague || !user) return;
    setLoading(true);
    setError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase non configurato.");
      setLoading(false);
      return;
    }
    const [membersRes, buysRes] = await Promise.all([
      supabase.from("league_members").select("team_name,user_id,is_admin").eq("league_id", activeLeague.id),
      supabase.from("auction_buys").select("id,team_name,player_name_snapshot,price").eq("league_id", activeLeague.id),
    ]);
    const firstError = membersRes.error || buysRes.error;
    if (firstError) setError(firstError.message);
    const nextMembers = (membersRes.data ?? []) as Member[];
    setMembers(nextMembers);
    setBuys((buysRes.data ?? []) as Buy[]);
    if (!newTeam && nextMembers.length) {
      const own = nextMembers.find((m) => m.user_id === user.id);
      setNewTeam(own?.team_name ?? nextMembers[0].team_name);
    }
    setLoading(false);
  }, [activeLeague, user, newTeam]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeague?.id, user?.id]);

  const teamNames = useMemo(() => {
    const fromMembers = members.map((m) => m.team_name);
    const fromBuys = buys.map((b) => b.team_name);
    return Array.from(new Set([...fromMembers, ...fromBuys])).sort((a, b) => a.localeCompare(b));
  }, [members, buys]);

  const ownTeam = useMemo(() => members.find((m) => m.user_id === user?.id)?.team_name ?? null, [members, user]);

  const budget = activeLeague?.budget ?? 0;
  const rosterSize = activeLeague?.roster_size ?? 0;

  const teamStats = useMemo(() => {
    const map = new Map<string, { spent: number; count: number }>();
    for (const name of teamNames) map.set(name, { spent: 0, count: 0 });
    for (const b of buys) {
      const cur = map.get(b.team_name) ?? { spent: 0, count: 0 };
      cur.spent += b.price;
      cur.count += 1;
      map.set(b.team_name, cur);
    }
    return map;
  }, [buys, teamNames]);

  function flash(msg: string) {
    setNotice(msg);
    setError("");
  }

  async function addBuy(e: FormEvent) {
    e.preventDefault();
    if (!activeLeague) return;
    const player = newPlayer.trim();
    if (!player) { setError("Inserisci il nome del giocatore."); return; }
    if (!newTeam) { setError("Seleziona la squadra acquirente."); return; }
    if (!Number.isFinite(newPrice) || newPrice < 0) { setError("Prezzo non valido."); return; }

    setBusy(true); setError(""); setNotice("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setError("Supabase non configurato."); setBusy(false); return; }

    const { data, error: insertError } = await supabase
      .from("auction_buys")
      .insert({ league_id: activeLeague.id, team_name: newTeam, player_name_snapshot: player, price: newPrice })
      .select("id,team_name,player_name_snapshot,price")
      .single();

    if (insertError || !data) {
      setError(insertError?.message || "Impossibile registrare l'acquisto. Verifica di essere il proprietario della lega.");
    } else {
      setBuys((prev) => [...prev, data as Buy]);
      setNewPlayer("");
      setNewPrice(1);
      flash(`${player} aggiunto a ${newTeam}.`);
    }
    setBusy(false);
  }

  function startEdit(b: Buy) {
    setEditingId(b.id);
    setEditPrice(b.price);
    setNotice("");
    setError("");
  }

  async function saveEdit(id: string) {
    if (!Number.isFinite(editPrice) || editPrice < 0) { setError("Prezzo non valido."); return; }
    setBusy(true); setError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setError("Supabase non configurato."); setBusy(false); return; }

    const { error: updateError } = await supabase
      .from("auction_buys")
      .update({ price: editPrice })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message || "Modifica non riuscita.");
    } else {
      setBuys((prev) => prev.map((b) => (b.id === id ? { ...b, price: editPrice } : b)));
      setEditingId(null);
      flash("Prezzo aggiornato.");
    }
    setBusy(false);
  }

  async function confirmDelete(id: string) {
    setBusy(true); setError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setError("Supabase non configurato."); setBusy(false); return; }

    const { error: deleteError } = await supabase.from("auction_buys").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message || "Eliminazione non riuscita.");
    } else {
      setBuys((prev) => prev.filter((b) => b.id !== id));
      flash("Acquisto eliminato.");
    }
    setDeletingId(null);
    setBusy(false);
  }

  async function resetAuction() {
    if (!activeLeague) return;
    setBusy(true); setError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setError("Supabase non configurato."); setBusy(false); return; }

    const { error: resetError } = await supabase.from("auction_buys").delete().eq("league_id", activeLeague.id);
    if (resetError) {
      setError(resetError.message || "Reset non riuscito.");
    } else {
      setBuys([]);
      flash("Asta azzerata: tutti gli acquisti sono stati rimossi e i budget ripristinati.");
    }
    setShowReset(false);
    setBusy(false);
  }

  const sortedBuys = useMemo(
    () => [...buys].sort((a, b) => a.team_name.localeCompare(b.team_name) || b.price - a.price),
    [buys],
  );

  return (
    <AppShell active="/asta">
      <div className="asta-manager">
        <div className="page-head">
          <div>
            <span className="eyebrow">ASTA · GESTIONE LIVE</span>
            <h1>{activeLeague?.name ?? "Asta"}</h1>
            <p>Registra gli acquisti, correggi i prezzi, rimuovi giocatori o azzera l'asta per ricominciare.</p>
          </div>
          <div className="asta-head-actions">
            <button className="secondary-btn" onClick={() => void load()} disabled={loading || busy}><RefreshCw size={16}/> Aggiorna</button>
            <button className="danger-btn" onClick={() => setShowReset(true)} disabled={busy || buys.length === 0}><RotateCcw size={16}/> Reset asta</button>
          </div>
        </div>

        {!isOwner && (
          <div className="asta-note warn"><AlertTriangle size={15}/> Solo il proprietario della lega può modificare l'asta. Puoi consultare i dati ma le modifiche verranno rifiutate.</div>
        )}
        {error && <div className="form-alert error">{error}</div>}
        {notice && <div className="form-alert success">{notice}</div>}

        <section className="asta-stats">
          <article className="asta-stat"><span className="asta-stat-icon"><Gavel/></span><div><small>Acquisti totali</small><strong>{buys.length}</strong></div></article>
          <article className="asta-stat"><span className="asta-stat-icon"><UsersRound/></span><div><small>Partecipanti</small><strong>{teamNames.length || "—"}</strong></div></article>
          <article className="asta-stat"><span className="asta-stat-icon"><Coins/></span><div><small>Budget iniziale</small><strong>{budget}</strong></div></article>
          {ownTeam && <article className="asta-stat featured"><span className="asta-stat-icon"><Coins/></span><div><small>I miei crediti ({ownTeam})</small><strong>{budget - (teamStats.get(ownTeam)?.spent ?? 0)}</strong></div></article>}
        </section>

        <section className="panel asta-add">
          <div className="panel-head"><h2>Registra acquisto</h2><Plus size={18}/></div>
          <form className="asta-add-form" onSubmit={addBuy}>
            <label><span>Giocatore</span><input value={newPlayer} onChange={(e) => setNewPlayer(e.target.value)} placeholder="Es. Lautaro" required /></label>
            <label><span>Squadra acquirente</span>
              <select value={newTeam} onChange={(e) => setNewTeam(e.target.value)}>
                {teamNames.length === 0 && <option value="">Nessuna squadra</option>}
                {teamNames.map((t) => <option key={t} value={t}>{t}{t === ownTeam ? " (io)" : ""}</option>)}
              </select>
            </label>
            <label><span>Prezzo</span><input type="number" min={0} max={budget || undefined} value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} /></label>
            <button className="primary-btn" disabled={busy || !isOwner}><Plus size={16}/> Aggiungi</button>
          </form>
          <p className="asta-note">Gli acquisti aggiornano automaticamente i crediti residui delle squadre. La rosa obiettivo è {rosterSize} giocatori.</p>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Acquisti registrati</h2><span>{buys.length}</span></div>
          {loading ? (
            <p className="asta-empty">Caricamento acquisti…</p>
          ) : sortedBuys.length === 0 ? (
            <p className="asta-empty">Nessun acquisto registrato in questa asta. Usa il modulo sopra per iniziare.</p>
          ) : (
            <div className="asta-table">
              <div className="asta-row asta-row-head"><span>Giocatore</span><span>Squadra</span><span>Prezzo</span><span>Azioni</span></div>
              {sortedBuys.map((b) => {
                const isEditing = editingId === b.id;
                const isDeleting = deletingId === b.id;
                return (
                  <div className={`asta-row ${b.team_name === ownTeam ? "mine" : ""}`} key={b.id}>
                    <span className="asta-player">{b.player_name_snapshot}</span>
                    <span className="asta-team">{b.team_name}</span>
                    <span className="asta-price">
                      {isEditing ? (
                        <input type="number" min={0} max={budget || undefined} value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} autoFocus />
                      ) : (
                        <b>{b.price} cr</b>
                      )}
                    </span>
                    <span className="asta-actions">
                      {isEditing ? (
                        <>
                          <button className="icon-btn ok" title="Salva" onClick={() => void saveEdit(b.id)} disabled={busy}><Check size={15}/></button>
                          <button className="icon-btn" title="Annulla" onClick={() => setEditingId(null)} disabled={busy}><X size={15}/></button>
                        </>
                      ) : isDeleting ? (
                        <>
                          <span className="asta-confirm">Eliminare?</span>
                          <button className="icon-btn danger" title="Conferma eliminazione" onClick={() => void confirmDelete(b.id)} disabled={busy}><Check size={15}/></button>
                          <button className="icon-btn" title="Annulla" onClick={() => setDeletingId(null)} disabled={busy}><X size={15}/></button>
                        </>
                      ) : (
                        <>
                          <button className="icon-btn" title="Modifica prezzo" onClick={() => startEdit(b)} disabled={busy || !isOwner}><Pencil size={15}/></button>
                          <button className="icon-btn danger" title="Elimina acquisto" onClick={() => { setDeletingId(b.id); setEditingId(null); }} disabled={busy || !isOwner}><Trash2 size={15}/></button>
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Riepilogo squadre</h2><UsersRound size={18}/></div>
          <div className="asta-table">
            <div className="asta-row asta-row-head summary"><span>Squadra</span><span>Giocatori</span><span>Spesi</span><span>Residui</span></div>
            {teamNames.map((t) => {
              const s = teamStats.get(t) ?? { spent: 0, count: 0 };
              return (
                <div className={`asta-row summary ${t === ownTeam ? "mine" : ""}`} key={t}>
                  <span className="asta-team">{t}{t === ownTeam ? " (io)" : ""}</span>
                  <span>{s.count}{rosterSize ? `/${rosterSize}` : ""}</span>
                  <span>{s.spent}</span>
                  <span className="asta-credits">{budget - s.spent}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {showReset && (
        <div className="asta-modal-backdrop" role="dialog" aria-modal="true" onClick={() => !busy && setShowReset(false)}>
          <div className="asta-modal" onClick={(e) => e.stopPropagation()}>
            <div className="asta-modal-icon"><RotateCcw/></div>
            <h3>Sei sicuro?</h3>
            <p>Questa operazione cancellerà <strong>tutti i dati dell'asta corrente</strong> ({buys.length} acquisti) e ripristinerà i budget di tutte le squadre al valore iniziale. L'azione non è reversibile.</p>
            <div className="asta-modal-actions">
              <button className="secondary-btn" onClick={() => setShowReset(false)} disabled={busy}>Annulla</button>
              <button className="danger-btn" onClick={() => void resetAuction()} disabled={busy}><RotateCcw size={16}/> {busy ? "Reset in corso…" : "Sì, azzera l'asta"}</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
