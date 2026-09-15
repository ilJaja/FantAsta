// Motore di calcolo asta — porting da Asta-Fanta-2026-2027/index.html
// Adattato per usare dati Supabase invece di localStorage

import { LISTINO, Player } from "@/data/listino-mantra";
import { PIANO_ASTA } from "@/data/piano-asta";

// ─── Tipi ────────────────────────────────────────────────────────────────────

export type Rep = "Por" | "Dif" | "Cen" | "Att";

export interface Buy {
  id: string;
  team_name: string;
  player_name_snapshot: string;
  price: number;
}

export interface LeagueConfig {
  budget: number;
  roster_size: number;
  minimums: { Por: number; Dif: number; Cen: number; Att: number };
  mode: "mantra" | "classic";
  formation?: string;
  fan_of?: Record<string, string>; // team_name -> squadra di A
}

export interface AstaState {
  buys: Buy[];
  teams: string[];
  myTeam: string;
  cfg: LeagueConfig;
  currentBlock: Rep;
  unavailable: Record<string, string>; // nome -> motivo
}

// ─── Costanti ─────────────────────────────────────────────────────────────────

const BASE_LISTONE = 1000;
const BLOCCHI: Rep[] = ["Por", "Dif", "Cen", "Att"];

const REP_OF_M: Record<string, Rep> = {
  Por: "Por", Ds: "Dif", Dc: "Dif", Dd: "Dif", B: "Dif",
  E: "Cen", M: "Cen", C: "Cen", W: "Cen", T: "Cen", A: "Att", Pc: "Att",
};

export const REP_LABEL: Record<Rep, string> = {
  Por: "PORTIERI", Dif: "DIFENSORI", Cen: "CENTROCAMPISTI", Att: "ATTACCANTI",
};

const REP_PCT_M: Record<Rep, number> = { Por: 0.11, Dif: 0.18, Cen: 0.48, Att: 0.23 };

const FASCIA_W: Record<string, number> = {
  "Top": 3.0, "Semi-top": 1.8, "Buono": 1.0, "Panchinaro": 0.45, "Scommessa": 0.25,
};

export const BLOCCO_LABEL: Record<Rep, string> = {
  Por: "Portieri", Dif: "Difensori", Cen: "Centrocampisti", Att: "Attaccanti",
};

// ─── Lookup per nome ──────────────────────────────────────────────────────────

const byName: Record<string, Player> = {};
LISTINO.forEach(p => { byName[p.nome] = p; });

export function findPlayer(name: string): Player | undefined {
  return byName[name] ?? LISTINO.find(p => p.nome.toLowerCase() === name.toLowerCase());
}

// ─── Helper base ─────────────────────────────────────────────────────────────

export function rolesOf(p: Player): string[] {
  return p.ruolo.split(";").map(r => r.trim());
}

export function repOf(p: Player): Rep {
  const r0 = rolesOf(p)[0];
  return REP_OF_M[r0] ?? "Cen";
}

export function scala(cfg: LeagueConfig) {
  return cfg.budget / BASE_LISTONE;
}

export function prezzoOf(p: Player, cfg: LeagueConfig): number {
  const base = p.prezzo;
  return Math.max(1, Math.round(base * scala(cfg)));
}

// ─── Roster e crediti ─────────────────────────────────────────────────────────

export function rosterOf(who: string, buys: Buy[]): Array<{ player: Player; price: number }> {
  return buys
    .filter(b => b.team_name === who)
    .map(b => {
      const p = findPlayer(b.player_name_snapshot);
      if (!p) return null;
      return { player: p, price: b.price };
    })
    .filter((x): x is { player: Player; price: number } => x !== null);
}

export function spentOf(who: string, buys: Buy[]): number {
  return buys.filter(b => b.team_name === who).reduce((s, b) => s + b.price, 0);
}

export function creditsOf(who: string, buys: Buy[], cfg: LeagueConfig): number {
  return cfg.budget - spentOf(who, buys);
}

export function countRep(who: string, rep: Rep, buys: Buy[]): number {
  return rosterOf(who, buys).filter(x => repOf(x.player) === rep).length;
}

export function spentRep(who: string, rep: Rep, buys: Buy[]): number {
  return rosterOf(who, buys).filter(x => repOf(x.player) === rep).reduce((s, x) => s + x.price, 0);
}

export function mandatoryLeft(who: string, buys: Buy[], cfg: LeagueConfig): number {
  const perRosa = Math.max(0, cfg.roster_size - rosterOf(who, buys).length);
  const porMancanti = Math.max(0, (cfg.minimums.Por || 0) - countRep(who, "Por", buys));
  return Math.max(perRosa, porMancanti);
}

export function hardCap(who: string, buys: Buy[], cfg: LeagueConfig): number {
  const ml = mandatoryLeft(who, buys, cfg);
  return Math.max(1, creditsOf(who, buys, cfg) - Math.max(0, ml - 1));
}

export function fuori(nome: string, unavailable: Record<string, string>): string | undefined {
  return unavailable[nome];
}

// ─── Blocco attuale ────────────────────────────────────────────────────────────

export function nextBlock(current: Rep): Rep | null {
  const i = BLOCCHI.indexOf(current);
  return i >= 0 && i < BLOCCHI.length - 1 ? BLOCCHI[i + 1] : null;
}

export function inBlocco(p: Player, currentBlock: Rep): boolean {
  return repOf(p) === currentBlock;
}

// ─── Pool rilevante e inflazione ───────────────────────────────────────────────

function poolRilevante(buys: Buy[], teams: string[], cfg: LeagueConfig): Set<number> {
  const nP = Math.max(1, teams.length);
  const min = cfg.minimums;
  const somma = BLOCCHI.reduce((a, r) => a + (min[r] || 0), 0) || 1;
  const extra = Math.max(0, cfg.roster_size - somma);
  const q: Record<Rep, number> = { Por: 0, Dif: 0, Cen: 0, Att: 0 };
  BLOCCHI.forEach(r => { q[r] = (min[r] || 0) + Math.round(extra * (min[r] || 0) / somma); });

  const dentro = new Set<number>();
  const boughtNames = new Set(buys.map(b => b.player_name_snapshot));

  BLOCCHI.forEach(rep => {
    const quanti = nP * (q[rep] || 0);
    if (quanti <= 0) return;
    LISTINO
      .map((pl, i) => ({ i, pl, pr: prezzoOf(pl, cfg) }))
      .filter(x => repOf(x.pl) === rep && x.pr > 0)
      .sort((a, b) => b.pr - a.pr)
      .slice(0, quanti)
      .forEach(x => dentro.add(x.i));
  });
  return dentro;
}

export function inflazioneMercato(buys: Buy[], teams: string[], cfg: LeagueConfig) {
  try {
    const pool = poolRilevante(buys, teams, cfg);
    const boughtNames = new Set(buys.map(b => b.player_name_snapshot));

    let valoreTot = 0, valoreLibero = 0;
    pool.forEach(i => {
      const v = prezzoOf(LISTINO[i], cfg);
      valoreTot += v;
      if (!boughtNames.has(LISTINO[i].nome)) valoreLibero += v;
    });

    const creditiTot = teams.length * cfg.budget;
    let creditiRimasti = 0;
    teams.forEach(w => { creditiRimasti += Math.max(0, creditsOf(w, buys, cfg)); });

    if (valoreTot <= 0 || valoreLibero <= 0 || creditiTot <= 0) {
      return { f: 1, txt: "", pool: pool.size };
    }

    const partenza = creditiTot / valoreTot;
    const adesso = creditiRimasti / valoreLibero;
    const grezzo = partenza > 0 ? adesso / partenza : 1;
    const f = Math.min(1.8, Math.max(0.55, grezzo));
    const scarto = Math.round((f - 1) * 100);
    const txt = Math.abs(scarto) < 3 ? ""
      : scarto > 0
        ? `la lega ha speso sotto listino: quel che resta vale il ${scarto}% in più`
        : `la lega ha speso sopra listino: quel che resta vale il ${-scarto}% in meno`;

    return { f, txt, grezzo, pool: pool.size, creditiRimasti, valoreLibero };
  } catch {
    return { f: 1, txt: "", pool: 0 };
  }
}

// ─── Scarsità e rivali ─────────────────────────────────────────────────────────

export function remainingPeers(p: Player, buys: Buy[], cfg: LeagueConfig): number {
  const boughtNames = new Set(buys.map(b => b.player_name_snapshot));
  const target = prezzoOf(p, cfg);
  const rep = repOf(p);
  const fW = FASCIA_W[p.fascia] ?? 1.0;
  return LISTINO.filter(other => {
    if (boughtNames.has(other.nome) || other.nome === p.nome) return false;
    if (repOf(other) !== rep) return false;
    const fw2 = FASCIA_W[other.fascia] ?? 1.0;
    return Math.abs(fw2 - fW) <= 0.5;
  }).length;
}

function slotsNeededFor(p: Player, myTeam: string, buys: Buy[], cfg: LeagueConfig): number {
  const rep = repOf(p);
  if (rep === "Por") return Math.max(0, cfg.minimums.Por - countRep(myTeam, "Por", buys));
  const have = countRep(myTeam, rep, buys);
  const needed = cfg.minimums[rep] ?? 0;
  return Math.max(0, needed - have);
}

export function rivalsFor(p: Player, myTeam: string, buys: Buy[], teams: string[], cfg: LeagueConfig) {
  const rep = repOf(p);
  return teams
    .filter(w => w !== myTeam)
    .map(w => {
      const need = Math.max(0, (cfg.minimums[rep] ?? 0) - countRep(w, rep, buys));
      const full = rosterOf(w, buys).length >= cfg.roster_size;
      const cr = creditsOf(w, buys, cfg);
      const myCr = creditsOf(myTeam, buys, cfg);
      const threat = !full && need > 0 && cr > 1;
      const stronger = threat && cr > myCr;
      return { team: w, need, cr, threat, stronger };
    });
}

// ─── Conto blocco ──────────────────────────────────────────────────────────────

export interface ContoBlocco {
  livello: number;
  scoperte: number;
  rapporto: number;
  mieiMancanti: number;
}

export function contoBlocco(currentBlock: Rep, myTeam: string, buys: Buy[], teams: string[], cfg: LeagueConfig): ContoBlocco {
  const boughtNames = new Set(buys.map(b => b.player_name_snapshot));
  const minRep = cfg.minimums[currentBlock] ?? 0;

  // quante squadre non hanno ancora il minimo
  const scoperte = teams.filter(w => countRep(w, currentBlock, buys) < minRep).length;

  // quanti giocatori di livello (Top/Semi-top) sono ancora liberi
  const livello = LISTINO.filter(
    p => repOf(p) === currentBlock && !boughtNames.has(p.nome) &&
      (p.fascia === "Top" || p.fascia === "Semi-top")
  ).length;

  const rapporto = scoperte > 0 ? livello / scoperte : 99;
  const mieiMancanti = Math.max(0, minRep - countRep(myTeam, currentBlock, buys));

  return { livello, scoperte, rapporto, mieiMancanti };
}

// ─── Crediti Live ─────────────────────────────────────────────────────────────

export interface CreditiLive {
  live: number;
  cap: number;
  base: number;
  baseMerc: number;
  need: number;
  needTxt: string;
  peers: number;
  scarTxt: string;
  threats: number;
  stronger: number;
  rivals: ReturnType<typeof rivalsFor>;
  stop: string | null;
  blocTxt: string;
  inflTxt: string;
  inBlocco: boolean;
  f: {
    disp: number;
    target: number;
    fNeed: number;
    fScar: number;
    fPress: number;
    fBloc: number;
    fInfl: number;
    quotaRep: number;
    gia: number;
    riserva: number;
  };
}

export function creditiLive(
  p: Player,
  myTeam: string,
  buys: Buy[],
  teams: string[],
  cfg: LeagueConfig,
  currentBlock: Rep,
  unavailable: Record<string, string>,
): CreditiLive {
  const rep = repOf(p);
  const base = prezzoOf(p, cfg);
  const cap = hardCap(myTeam, buys, cfg);
  const rosaN = rosterOf(myTeam, buys).length;

  if (rosaN >= cfg.roster_size) {
    return {
      live: 0, cap, base, baseMerc: base, need: 0, needTxt: "rosa completa",
      peers: 0, scarTxt: "", threats: 0, stronger: 0, rivals: [], stop: `Rosa completa`,
      blocTxt: "", inflTxt: "", inBlocco: false,
      f: { disp: 0, target: 0, fNeed: 0, fScar: 0, fPress: 0, fBloc: 0, fInfl: 1, quotaRep: 0, gia: 0, riserva: 0 },
    };
  }

  // fattore 1: necessità
  let need: number, fNeed: number, needTxt: string;
  if (rep === "Por") {
    const have = countRep(myTeam, "Por", buys);
    need = Math.max(0, cfg.minimums.Por - have);
    if (have === 0) { fNeed = 1.20; needTxt = "sarà il tuo portiere titolare"; }
    else if (have === 1) { fNeed = 0.48; needTxt = "secondo portiere, ti serve ma non svenarti"; }
    else if (have === 2) { fNeed = 0.34; needTxt = "terzo portiere, prendilo a pochi crediti"; }
    else { fNeed = 0.18; needTxt = "hai già 3 portieri"; }
  } else {
    need = slotsNeededFor(p, myTeam, buys, cfg);
    if (need === 0) {
      const mandatory = Math.max(0, (cfg.minimums[rep] ?? 0) - countRep(myTeam, rep, buys));
      if (mandatory > 0) { fNeed = 0.45; needTxt = "non copre slot scoperti, serve solo a riempire il reparto"; }
      else { fNeed = 0.25; needTxt = "titolari già coperti in questo ruolo"; }
    } else if (need === 1) { fNeed = 1.20; needTxt = "copre l'ultimo slot scoperto del modulo"; }
    else { fNeed = 1.08; needTxt = `copre ${need} slot ancora scoperti`; }
  }

  // fattore 2: scarsità
  const peers = remainingPeers(p, buys, cfg);
  const nP = Math.max(1, teams.length);
  const soglia = (x: number) => Math.max(1, Math.round(x * nP / 10));
  let fScar = 1.0, scarTxt = "";
  if (need > 0) {
    if (peers <= soglia(1)) { fScar = 1.40; scarTxt = "è l'ultimo del suo livello"; }
    else if (peers <= soglia(3)) { fScar = 1.22; scarTxt = `restano solo ${peers} pari livello`; }
    else if (peers <= soglia(6)) { fScar = 1.09; scarTxt = `${peers} alternative simili`; }
    else if (peers > soglia(12)) { fScar = 0.88; scarTxt = `mercato pieno, ${peers} simili`; }
    else { scarTxt = `${peers} alternative`; }
  } else { scarTxt = `${peers} simili ancora liberi`; }

  // fattore 3: pressione avversari
  const rv = rivalsFor(p, myTeam, buys, teams, cfg);
  const threats = rv.filter(r => r.threat).length;
  const stronger = rv.filter(r => r.stronger).length;
  const fPress = 1 + Math.min(stronger, 8) * 0.028;

  // fattore 4: blocco
  let fBloc = 1.0, blocTxt = "";
  if (inBlocco(p, currentBlock)) {
    const cb = contoBlocco(currentBlock, myTeam, buys, teams, cfg);
    if (cb.mieiMancanti > 0) {
      if (cb.rapporto < 0.8) { fBloc = 1.25; blocTxt = `restano ${cb.livello} di livello per ${cb.scoperte} squadre senza titolare: non arrivare ultimo`; }
      else if (cb.rapporto < 1.3) { fBloc = 1.12; blocTxt = `${cb.livello} di livello per ${cb.scoperte} squadre senza titolare`; }
      else { blocTxt = `ce n'è per tutti: ${cb.livello} di livello per ${cb.scoperte} squadre senza titolare`; }
    } else {
      fBloc = 0.85;
      blocTxt = "hai già il minimo di questo reparto: i crediti valgono di più nel blocco dopo";
    }
  } else {
    fBloc = 0.80;
    blocTxt = "non è il suo blocco: se lo compri adesso paghi un turno che non è il suo";
  }

  // fattore 0: inflazione
  const infl = inflazioneMercato(buys, teams, cfg);
  const baseMerc = Math.max(1, base * infl.f);
  const target = baseMerc * fNeed * fScar * fPress * fBloc;

  // vincolo A: budget per reparto
  const quotaRep = cfg.budget * REP_PCT_M[rep];
  const gia = spentRep(myTeam, rep, buys);
  const slotRepLeft = Math.max(0, (cfg.minimums[rep] ?? 0) - countRep(myTeam, rep, buys));
  const filler = rep === "Att" ? 12 : rep === "Cen" ? 10 : rep === "Dif" ? 8 : 4;
  const riserva = Math.max(0, slotRepLeft - 1) * filler;
  let disp = Math.max(0, quotaRep - gia - riserva);
  if (disp < target) {
    const globale = Math.max(0, creditsOf(myTeam, buys, cfg) - Math.max(0, mandatoryLeft(myTeam, buys, cfg) - 1) * filler);
    disp = Math.max(disp, globale * 0.40);
  }

  let live = Math.round(Math.min(target, disp, cap));
  live = Math.max(1, live);

  let stop: string | null = null;
  const ko = fuori(p.nome, unavailable);
  if (ko) {
    live = Math.max(1, Math.round(live * 0.15));
    stop = `INDISPONIBILE — ${ko}`;
  }
  if (need === 0 && countRep(myTeam, rep, buys) >= (cfg.minimums[rep] ?? 0) && rosaN >= cfg.roster_size - 1) {
    stop = "Non ti serve e non hai più slot liberi";
  }

  return {
    live, cap, base, baseMerc: Math.round(baseMerc), need, needTxt, peers, scarTxt,
    threats, stronger, rivals: rv, stop, blocTxt, inBlocco: inBlocco(p, currentBlock),
    inflTxt: infl.txt,
    f: {
      disp: Math.round(disp), target: Math.round(target), fNeed, fScar, fPress, fBloc,
      fInfl: infl.f, quotaRep: Math.round(quotaRep), gia, riserva,
    },
  };
}

// ─── Temperatura mercato ────────────────────────────────────────────────────────

function mediana(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function temperatura(buys: Buy[], teams: string[], cfg: LeagueConfig, currentBlock: Rep) {
  const scarti = buys.map(b => {
    const pl = findPlayer(b.player_name_snapshot);
    if (!pl) return null;
    const base = prezzoOf(pl, cfg);
    if (!base || base < 1) return null;
    return (b.price || 0) / base;
  }).filter((x): x is number => x !== null && isFinite(x));

  const cb = contoBlocco(currentBlock, teams[0] ?? "", buys, teams, cfg);
  const rivali = Math.max(1, teams.length - 1);

  if (scarti.length < 4) {
    return {
      pronti: false, n: scarti.length, stato: "presto",
      puoiAspettare: cb.rapporto >= 1.3,
      txt: "Troppo pochi acquisti per leggere il tavolo: servono almeno 4 prezzi.",
    };
  }

  const recenti = scarti.slice(-8);
  const rec = mediana(recenti);
  const tut = mediana(scarti);
  const stato = rec >= 1.25 ? "caldo" : rec <= 0.95 ? "freddo" : "normale";
  const puoiAspettare = cb.rapporto >= 1.3;
  const sopra = Math.round((rec - 1) * 100);

  let txt: string;
  if (stato === "caldo") {
    txt = puoiAspettare
      ? `Gli ultimi acquisti sono andati <b>${sopra}% sopra listino</b>. Restano ${cb.livello} di livello per ${cb.scoperte} squadre: <b>puoi aspettare</b>.`
      : `Gli ultimi acquisti sono andati <b>${sopra}% sopra listino</b>, ma restano solo ${cb.livello} di livello per ${cb.scoperte} squadre: <b>la valle non arriverà</b>.`;
  } else if (stato === "freddo") {
    txt = `Gli ultimi acquisti sono andati ${sopra >= 0 ? "in linea col" : `${Math.abs(sopra)}% sotto il`} listino. <b>È il momento</b>: se hai un obiettivo, chiamalo ora.`;
  } else {
    txt = `Tavolo regolare: ${sopra > 0 ? sopra + "% sopra" : "in linea con"} il listino.`;
  }

  return { pronti: true, n: scarti.length, rec, tut, stato, sopra, puoiAspettare, txt };
}

// ─── Ritmo di spesa ────────────────────────────────────────────────────────────

export function ritmoSpesa(myTeam: string, buys: Buy[], cfg: LeagueConfig) {
  const slot = Math.max(0, cfg.roster_size - rosterOf(myTeam, buys).length);
  const cr = creditsOf(myTeam, buys, cfg);
  if (slot <= 0) return { slot: 0, crPerSlot: 0, stato: "finita", txt: "Rosa completa." };

  const crPerSlot = cr / slot;
  const boughtNames = new Set(buys.map(b => b.player_name_snapshot));
  const liberi = LISTINO
    .filter(p => !boughtNames.has(p.nome))
    .map(p => prezzoOf(p, cfg))
    .sort((a, b) => b - a)
    .slice(0, slot * Math.max(1, 10));

  if (!liberi.length) return { slot, crPerSlot, stato: "finita", txt: "Non è rimasto nessuno." };

  const med = liberi[Math.floor(liberi.length / 2)] || 1;
  const costoMigliori = liberi.slice(0, slot).reduce((t, x) => t + x, 0) || 1;
  const rapporto = cr / costoMigliori;
  const stato = rapporto >= 1.2 ? "troppi" : crPerSlot <= med * 0.9 ? "pochi" : "giusto";

  const txt = stato === "troppi"
    ? `Hai <b>${cr} cr per ${slot} slot</b> e i ${slot} migliori liberi costano <b>${costoMigliori}</b> totali: <b>stai tenendo troppo</b>. I crediti non spesi valgono zero.`
    : stato === "pochi"
      ? `Hai <b>${cr} cr per ${slot} slot</b> (${Math.round(crPerSlot)} a slot) contro una mediana di ${med}: <b>sei corto</b>.`
      : `Hai ${cr} cr per ${slot} slot, ${Math.round(crPerSlot)} a slot: <b>in linea</b> con quel che resta.`;

  return { slot, crPerSlot, mediana: med, costoMigliori, rapporto, stato, txt };
}

// ─── Chi chiamo ───────────────────────────────────────────────────────────────

export interface ChiChiamoResult {
  candidati: Array<{
    player: Player;
    piano: typeof PIANO_ASTA[string] | undefined;
    cl: CreditiLive;
    score: number;
    motivo: string;
  }>;
  bloccoTxt: string;
}

export function suggerisciChiamata(
  myTeam: string,
  buys: Buy[],
  teams: string[],
  cfg: LeagueConfig,
  currentBlock: Rep,
  unavailable: Record<string, string>,
): ChiChiamoResult {
  const boughtNames = new Set(buys.map(b => b.player_name_snapshot));
  const cb = contoBlocco(currentBlock, myTeam, buys, teams, cfg);

  const candidati = LISTINO
    .filter(p => !boughtNames.has(p.nome) && inBlocco(p, currentBlock))
    .map(p => {
      const piano = PIANO_ASTA[p.nome];
      const cl = creditiLive(p, myTeam, buys, teams, cfg, currentBlock, unavailable);
      const fW = FASCIA_W[p.fascia] ?? 1.0;
      const urgenza = cl.need > 0 ? 2 : 1;
      // score: considera fascia, urgenza, rivalità, scarsità
      const score = fW * urgenza * (1 + cl.f.fScar * 0.3) * (1 + cl.f.fPress * 0.2);
      const motivo = cl.needTxt
        ? `${cl.needTxt}${cl.scarTxt ? ` · ${cl.scarTxt}` : ""}`
        : cl.scarTxt || "da valutare";
      return { player: p, piano, cl, score, motivo };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const bloccoTxt = cb.mieiMancanti > 0
    ? `Ti mancano ${cb.mieiMancanti} nel blocco ${BLOCCO_LABEL[currentBlock]}. Restano ${cb.livello} di livello per ${cb.scoperte} squadre senza titolare.`
    : `Hai già il minimo per ${BLOCCO_LABEL[currentBlock]}.`;

  return { candidati, bloccoTxt };
}

// ─── Export utilità ────────────────────────────────────────────────────────────

export { LISTINO, PIANO_ASTA, BLOCCHI, REP_PCT_M };
