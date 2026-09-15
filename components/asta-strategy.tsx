"use client";

import { useMemo, useState } from "react";
import {
  Brain, TrendingUp, Target, Search, ChevronDown, ChevronUp,
  Shield, Users, Activity, Star, RefreshCw,
} from "lucide-react";
import {
  LISTINO, REP_LABEL, BLOCCO_LABEL, BLOCCHI,
  creditiLive, suggerisciChiamata, inflazioneMercato,
  temperatura, ritmoSpesa, contoBlocco, creditsOf,
  rosterOf, countRep, findPlayer, repOf, prezzoOf,
  mandatoryLeft, fuori,
  type Buy, type LeagueConfig, type Rep,
} from "@/lib/asta-engine";
import { PIANO_ASTA } from "@/data/piano-asta";

// ─── Tipi ─────────────────────────────────────────────────────────────────────

interface Props {
  buys: Buy[];
  teams: string[];
  myTeam: string;
  cfg: LeagueConfig;
  unavailable?: Record<string, string>;
  onRefresh?: () => void;
}

type Tab = "situazione" | "listino" | "chichiamo" | "piano";

// ─── Colori fascia ────────────────────────────────────────────────────────────

function fasciaColor(f: string) {
  const map: Record<string, string> = {
    "Top": "#f59e0b", "Semi-top": "#6366f1", "Buono": "#22c55e",
    "Panchinaro": "#64748b", "Scommessa": "#ec4899",
  };
  return map[f] ?? "#94a3b8";
}

function fasciaLabel(f: string) {
  const map: Record<string, string> = {
    "Top": "Top", "Semi-top": "S-Top", "Buono": "Buono",
    "Panchinaro": "Panch.", "Scommessa": "Scom.",
  };
  return map[f] ?? f;
}

// ─── Componente Situazione ────────────────────────────────────────────────────

function SituazionePannel({ buys, teams, myTeam, cfg, currentBlock, unavailable }: Props & { currentBlock: Rep }) {
  const cr = creditsOf(myTeam, buys, cfg);
  const roster = rosterOf(myTeam, buys);
  const liberi = cfg.roster_size - roster.length;
  const perSlot = liberi > 0 ? Math.round(cr / liberi) : 0;
  const obb = mandatoryLeft(myTeam, buys, cfg);

  const infl = useMemo(() => inflazioneMercato(buys, teams, cfg), [buys, teams, cfg]);
  const temp = useMemo(() => temperatura(buys, teams, cfg, currentBlock), [buys, teams, cfg, currentBlock]);
  const ritmo = useMemo(() => ritmoSpesa(myTeam, buys, cfg), [myTeam, buys, cfg]);
  const cb = useMemo(() => contoBlocco(currentBlock, myTeam, buys, teams, cfg), [currentBlock, myTeam, buys, teams, cfg]);

  const tit = BLOCCHI.reduce((acc, rep) => {
    const min = cfg.minimums[rep] ?? 0;
    const have = countRep(myTeam, rep, buys);
    acc[rep] = { have, min };
    return acc;
  }, {} as Record<string, { have: number; min: number }>);

  const rosaOk = roster.length >= cfg.roster_size;

  return (
    <div className="strat-situazione">
      {/* Band principale */}
      <div className={`sit-band ${rosaOk ? "ok" : cr < 50 ? "warn" : ""}`}>
        <div className="sit-big">
          {cr}<span>cr</span>
        </div>
        <div className="sit-sub">
          {liberi} slot da riempire · {perSlot} a slot
          {obb > 0 && <b> · {obb} obbligatori</b>}
        </div>
        <div className="sit-reparti">
          {BLOCCHI.map(rep => (
            <span key={rep} className={`sit-rep ${(tit[rep]?.have ?? 0) >= (tit[rep]?.min ?? 0) ? "ok" : "miss"}`}>
              {rep} {tit[rep]?.have ?? 0}/{tit[rep]?.min ?? 0}
            </span>
          ))}
        </div>
      </div>

      {/* Blocco corrente */}
      <div className="sit-card">
        <div className="sit-card-head">
          <Shield size={14} /> Blocco {BLOCCO_LABEL[currentBlock]}
          <span className={`sit-badge ${cb.mieiMancanti > 0 ? "warn" : "ok"}`}>
            {cb.mieiMancanti > 0 ? `mi mancano ${cb.mieiMancanti}` : "coperto ✓"}
          </span>
        </div>
        <div className="sit-card-body">
          {cb.livello} di livello liberi per {cb.scoperte} squadre senza titolare
          {cb.rapporto < 0.8 && <b className="bad"> — non arrivare ultimo!</b>}
        </div>
      </div>

      {/* Ritmo di spesa */}
      <div className={`sit-card ${ritmo.stato === "troppi" ? "hot" : ritmo.stato === "pochi" ? "cold" : ""}`}>
        <div className="sit-card-head">
          <Activity size={14} /> Ritmo di spesa
          <span className={`sit-badge ${ritmo.stato === "troppi" ? "warn" : ritmo.stato === "pochi" ? "bad" : "ok"}`}>
            {ritmo.stato === "troppi" ? "troppi" : ritmo.stato === "pochi" ? "corti" : "ok"}
          </span>
        </div>
        <div
          className="sit-card-body"
          dangerouslySetInnerHTML={{ __html: ritmo.txt }}
        />
      </div>

      {/* Temperatura tavolo */}
      <div className={`sit-card ${temp.stato === "caldo" ? "hot" : temp.stato === "freddo" ? "cold" : ""}`}>
        <div className="sit-card-head">
          <TrendingUp size={14} /> Il tavolo
          <span className={`sit-badge ${temp.stato === "caldo" ? "bad" : temp.stato === "freddo" ? "ok" : "neutral"}`}>
            {temp.pronti ? temp.stato.toUpperCase() : "—"}
          </span>
        </div>
        <div
          className="sit-card-body"
          dangerouslySetInnerHTML={{ __html: temp.txt }}
        />
      </div>

      {/* Inflazione */}
      <div className="sit-card">
        <div className="sit-card-head">
          <TrendingUp size={14} /> Mercato
          <span className="sit-badge neutral">×{infl.f.toFixed(2)}</span>
        </div>
        <div className="sit-card-body">
          {infl.txt || "La lega sta spendendo in linea col listino."}
        </div>
      </div>

      {/* Rose avversari */}
      <div className="sit-card">
        <div className="sit-card-head"><Users size={14} /> Riepilogo squadre</div>
        <div className="sit-teams-grid">
          {teams.map(t => {
            const cr2 = creditsOf(t, buys, cfg);
            const n = rosterOf(t, buys).length;
            return (
              <div key={t} className={`sit-team-row ${t === myTeam ? "mine" : ""}`}>
                <span className="sit-team-name">{t}{t === myTeam ? " (io)" : ""}</span>
                <span className="sit-team-stat">{n}/{cfg.roster_size}</span>
                <span className={`sit-team-cr ${cr2 < 30 ? "bad" : ""}`}>{cr2} cr</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Componente Chi Chiamo ────────────────────────────────────────────────────

function ChiChiamoPannel({ buys, teams, myTeam, cfg, currentBlock, unavailable }: Props & { currentBlock: Rep }) {
  const result = useMemo(
    () => suggerisciChiamata(myTeam, buys, teams, cfg, currentBlock, unavailable ?? {}),
    [myTeam, buys, teams, cfg, currentBlock, unavailable]
  );

  return (
    <div className="strat-chichiamo">
      <div className="chi-header">
        <Brain size={18} />
        <div>
          <h3>Chi chiamo adesso?</h3>
          <p>{result.bloccoTxt}</p>
        </div>
      </div>

      <div className="chi-list">
        {result.candidati.length === 0 && (
          <div className="chi-empty">Nessun candidato disponibile per questo blocco.</div>
        )}
        {result.candidati.map(({ player: p, piano, cl }, idx) => (
          <div key={p.nome} className={`chi-card ${idx === 0 ? "top" : ""}`}>
            <div className="chi-rank">#{idx + 1}</div>
            <div className="chi-info">
              <div className="chi-name">
                {p.nome}
                <span className="chi-club">{p.squadra}</span>
                <span className="chi-ruolo">{p.ruolo}</span>
              </div>
              <div className="chi-motivo">{cl.needTxt}{cl.scarTxt ? ` · ${cl.scarTxt}` : ""}</div>
              {piano && (
                <div className="chi-piano">
                  Piano: <b>{piano.sl}</b> · max consigliato {piano.cr} cr
                </div>
              )}
            </div>
            <div className="chi-prices">
              <div className="chi-live">{cl.live} cr</div>
              <div className="chi-base">lista: {cl.base}</div>
              {cl.stop && <div className="chi-stop">⚠ {cl.stop}</div>}
            </div>
            <div className="chi-fascia" style={{ background: fasciaColor(p.fascia) }}>
              {fasciaLabel(p.fascia)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Componente Listino ───────────────────────────────────────────────────────

function ListinoPannel({ buys, teams, myTeam, cfg, currentBlock, unavailable }: Props & { currentBlock: Rep }) {
  const [search, setSearch] = useState("");
  const [repFilter, setRepFilter] = useState<Rep | "">("");
  const [sortBy, setSortBy] = useState<"live" | "prezzo" | "perf" | "nome">("live");
  const [showOnly, setShowOnly] = useState<"all" | "free" | "mine">("free");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const boughtMap = useMemo(() => {
    const m: Record<string, string> = {};
    buys.forEach(b => { m[b.player_name_snapshot] = b.team_name; });
    return m;
  }, [buys]);

  const filtered = useMemo(() => {
    let list = LISTINO;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.nome.toLowerCase().includes(q) || p.squadra.toLowerCase().includes(q));
    }
    if (repFilter) list = list.filter(p => repOf(p) === repFilter);
    if (showOnly === "free") list = list.filter(p => !boughtMap[p.nome]);
    if (showOnly === "mine") list = list.filter(p => boughtMap[p.nome] === myTeam);

    const withCl = list.map(p => {
      const cl = creditiLive(p, myTeam, buys, teams, cfg, currentBlock, unavailable ?? {});
      return { p, cl };
    });

    withCl.sort((a, b) => {
      if (sortBy === "live") return b.cl.live - a.cl.live;
      if (sortBy === "prezzo") return b.cl.base - a.cl.base;
      if (sortBy === "perf") return (b.p.st.perf ?? 0) - (a.p.st.perf ?? 0);
      return a.p.nome.localeCompare(b.p.nome);
    });

    return withCl.slice(0, 80); // max 80 per performance
  }, [search, repFilter, showOnly, sortBy, buys, teams, myTeam, cfg, currentBlock, unavailable]);

  return (
    <div className="strat-listino">
      {/* Filtri */}
      <div className="listino-filters">
        <div className="listino-search">
          <Search size={14} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca giocatore..."
          />
        </div>
        <select value={repFilter} onChange={e => setRepFilter(e.target.value as Rep | "")}>
          <option value="">Tutti i reparti</option>
          {BLOCCHI.map(r => <option key={r} value={r}>{REP_LABEL[r]}</option>)}
        </select>
        <select value={showOnly} onChange={e => setShowOnly(e.target.value as typeof showOnly)}>
          <option value="free">Solo liberi</option>
          <option value="mine">La mia rosa</option>
          <option value="all">Tutti</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
          <option value="live">↓ Crediti Live</option>
          <option value="prezzo">↓ Prezzo lista</option>
          <option value="perf">↓ Performance</option>
          <option value="nome">A-Z Nome</option>
        </select>
      </div>

      {/* Lista */}
      <div className="listino-table">
        <div className="listino-head">
          <span>Giocatore</span>
          <span>Ruolo</span>
          <span className="num">Lista</span>
          <span className="num">Live</span>
          <span className="num">Perf</span>
        </div>
        {filtered.map(({ p, cl }, idx) => {
          const owner = boughtMap[p.nome];
          const isMine = owner === myTeam;
          const isExpanded = expandedIdx === idx;
          const piano = PIANO_ASTA[p.nome];

          return (
            <div key={p.nome} className={`listino-row ${owner ? (isMine ? "mine" : "sold") : ""} ${cl.stop ? "ko" : ""}`}>
              <div className="listino-main" onClick={() => setExpandedIdx(isExpanded ? null : idx)}>
                <div className="listino-player">
                  <span
                    className="listino-fascia"
                    style={{ background: fasciaColor(p.fascia) }}
                    title={p.fascia}
                  >
                    {fasciaLabel(p.fascia)}
                  </span>
                  <span className="listino-nome">{p.nome}</span>
                  <span className="listino-club">{p.squadra}</span>
                  {owner && <span className="listino-owner">{isMine ? "io" : owner}</span>}
                </div>
                <span className="listino-ruolo">{p.ruolo}</span>
                <span className="num">{cl.base}</span>
                <span className={`num live-cr ${cl.stop ? "ko" : ""}`}>
                  {owner ? "—" : cl.live}
                </span>
                <span className="num">{p.st.perf ?? "—"}</span>
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>

              {isExpanded && (
                <div className="listino-detail">
                  {cl.stop && <div className="detail-alert">{cl.stop}</div>}
                  {!owner && (
                    <div className="detail-live">
                      <b>Crediti Live: {cl.live}</b>
                      <span className="detail-factors">
                        (base {cl.base} → mercato {cl.baseMerc}
                        · bisogno ×{cl.f.fNeed.toFixed(2)}
                        · scarsità ×{cl.f.fScar.toFixed(2)}
                        · rivali ×{cl.f.fPress.toFixed(2)}
                        · blocco ×{cl.f.fBloc.toFixed(2)})
                      </span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span>{cl.needTxt}</span>
                    {cl.scarTxt && <span> · {cl.scarTxt}</span>}
                  </div>
                  {cl.blocTxt && <div className="detail-row">{cl.blocTxt}</div>}
                  {cl.inflTxt && <div className="detail-row">Mercato: {cl.inflTxt}</div>}
                  {piano && (
                    <div className="detail-piano">
                      Piano: <b>{piano.sl}</b> · max {piano.cr} cr
                      {piano.ti ? " (titolare)" : " (riserva)"}
                    </div>
                  )}
                  <div className="detail-stats">
                    {p.st.partite !== undefined && <span>{p.st.partite} partite</span>}
                    {p.st.gol !== undefined && <span>{p.st.gol} gol</span>}
                    {p.st.assist !== undefined && <span>{p.st.assist} assist</span>}
                    {p.st.rating !== undefined && <span>rating {p.st.rating}</span>}
                    {p.st.tit !== undefined && <span>tit. {p.st.tit}%</span>}
                    {p.st.cont !== undefined && <span>cont. {p.st.cont}%</span>}
                  </div>
                  {p.note && <div className="detail-note">{p.note}</div>}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="listino-empty">Nessun giocatore trovato.</div>}
        <div className="listino-foot">
          {showOnly === "free"
            ? `${filtered.length} disponibili · clicca per dettaglio e Crediti Live`
            : `${filtered.length} giocatori`}
        </div>
      </div>
    </div>
  );
}

// ─── Componente Piano d'Asta ──────────────────────────────────────────────────

function PianoPannel({ buys, cfg }: Pick<Props, "buys" | "cfg">) {
  const boughtMap = useMemo(() => {
    const m: Record<string, { team: string; price: number }> = {};
    buys.forEach(b => { m[b.player_name_snapshot] = { team: b.team_name, price: b.price }; });
    return m;
  }, [buys]);

  // Raggruppa per slot
  const perSlot = useMemo(() => {
    const groups: Record<string, Array<{ nome: string; entry: typeof PIANO_ASTA[string]; buyInfo?: { team: string; price: number } }>> = {};
    Object.entries(PIANO_ASTA).forEach(([nome, entry]) => {
      if (!groups[entry.sl]) groups[entry.sl] = [];
      groups[entry.sl].push({ nome, entry, buyInfo: boughtMap[nome] });
    });
    // Ordina per crediti decrescenti
    Object.values(groups).forEach(g => g.sort((a, b) => a.entry.po - b.entry.po));
    return groups;
  }, [boughtMap]);

  const slotOrder = [
    "Portiere titolare", "Secondo portiere", "Terzo portiere",
    "Centrale di riferimento", "Centrale di mestiere", "Terzo centrale / braccetto",
    "Quarto centrale", "Quinto centrale", "Difensore di scorta", "Difensore da 1 credito",
    "Mediano", "Mediano o centrale", "Esterno", "Esterno o ala", "Trequartista",
    "Trequartista o attaccante", "Primo cambio a centrocampo", "Secondo cambio",
    "Terzo cambio", "Scommessa a centrocampo",
    "Punta titolare", "Seconda punta", "Terza punta", "Quarta punta", "Scommessa in attacco",
  ];

  return (
    <div className="strat-piano">
      <p className="piano-intro">
        Piano d'asta preparato a mente fredda: slot, crediti massimi e ordine di priorità.
        I giocatori già acquistati da qualcuno sono evidenziati.
      </p>
      {slotOrder.filter(sl => perSlot[sl]?.length).map(sl => {
        const players = perSlot[sl];
        const maxCr = players[0]?.entry.cr ?? 0;
        return (
          <div key={sl} className="piano-slot">
            <div className="piano-slot-head">
              <span className="piano-slot-name">{sl}</span>
              <span className="piano-slot-cr">max {maxCr} cr</span>
            </div>
            <div className="piano-players">
              {players.map(({ nome, entry, buyInfo }) => (
                <div key={nome} className={`piano-player ${buyInfo ? "taken" : ""}`}>
                  <span className="piano-rank">#{entry.po}</span>
                  <span className="piano-nome">{nome}</span>
                  {entry.ti && <span className="piano-tit">tit</span>}
                  {entry.alt?.map(a => (
                    <span key={a} className="piano-alt">{a}</span>
                  ))}
                  {buyInfo && (
                    <span className="piano-taken-by">
                      {buyInfo.team} · {buyInfo.price} cr
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────

export function AstaStrategy({ buys, teams, myTeam, cfg, unavailable = {}, onRefresh }: Props) {
  const [tab, setTab] = useState<Tab>("situazione");
  const [currentBlock, setCurrentBlock] = useState<Rep>("Por");

  const myCredits = useMemo(() => creditsOf(myTeam, buys, cfg), [myTeam, buys, cfg]);
  const myCount = useMemo(() => rosterOf(myTeam, buys).length, [myTeam, buys]);

  return (
    <div className="asta-strategy">
      {/* Header */}
      <div className="strat-header">
        <div className="strat-header-left">
          <span className="eyebrow">STRATEGIA LIVE</span>
          <h2>Piano d'asta</h2>
          <span className="strat-me">
            {myTeam} · {myCredits} cr · {myCount}/{cfg.roster_size} giocatori
          </span>
        </div>
        <div className="strat-header-right">
          {onRefresh && (
            <button className="secondary-btn strat-refresh" onClick={onRefresh} title="Ricarica dati acquisti">
              <RefreshCw size={14} /> Aggiorna
            </button>
          )}
          {/* Selettore blocco */}
          <div className="strat-blocco-sel">
            <span>Blocco:</span>
            {BLOCCHI.map(b => (
              <button
                key={b}
                className={`blocco-btn ${currentBlock === b ? "active" : ""}`}
                onClick={() => setCurrentBlock(b)}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="strat-tabs">
        <button
          className={`strat-tab ${tab === "situazione" ? "active" : ""}`}
          onClick={() => setTab("situazione")}
        >
          <Activity size={14} /> Situazione
        </button>
        <button
          className={`strat-tab ${tab === "chichiamo" ? "active" : ""}`}
          onClick={() => setTab("chichiamo")}
        >
          <Brain size={14} /> Chi chiamo
        </button>
        <button
          className={`strat-tab ${tab === "listino" ? "active" : ""}`}
          onClick={() => setTab("listino")}
        >
          <Star size={14} /> Listino
        </button>
        <button
          className={`strat-tab ${tab === "piano" ? "active" : ""}`}
          onClick={() => setTab("piano")}
        >
          <Target size={14} /> Piano
        </button>
      </div>

      {/* Contenuto */}
      <div className="strat-content">
        {tab === "situazione" && (
          <SituazionePannel
            buys={buys} teams={teams} myTeam={myTeam} cfg={cfg}
            unavailable={unavailable} currentBlock={currentBlock}
          />
        )}
        {tab === "chichiamo" && (
          <ChiChiamoPannel
            buys={buys} teams={teams} myTeam={myTeam} cfg={cfg}
            unavailable={unavailable} currentBlock={currentBlock}
          />
        )}
        {tab === "listino" && (
          <ListinoPannel
            buys={buys} teams={teams} myTeam={myTeam} cfg={cfg}
            unavailable={unavailable} currentBlock={currentBlock}
          />
        )}
        {tab === "piano" && (
          <PianoPannel buys={buys} cfg={cfg} />
        )}
      </div>
    </div>
  );
}
