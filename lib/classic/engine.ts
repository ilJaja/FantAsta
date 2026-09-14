/** Independent Classic engine. Never imports or converts Mantra valuations/roles. */
export const ROLES = ['P', 'D', 'C', 'A'] as const;
export type Role = typeof ROLES[number];
export const ROLE_LABELS: Record<Role, string> = { P: 'Portieri', D: 'Difensori', C: 'Centrocampisti', A: 'Attaccanti' };
export type Config = {
  version: 1; mode: 'classic'; name: string; budget: number; teams: number;
  slots: Record<Role, number | null>; modifier: 'unknown' | 'off' | 'on';
  minimumBid: number; allocation: Record<Role, number>;
  weights: { bonus: number; starter: number; penalties: number; setPieces: number; rating: number; defense: number; scarcity: number };
};
export type Player = {
  id: string; name: string; role: Role;
  /** User-supplied scouting indices 0–100; null means unknown, never inferred. */
  bonus: number | null; starter: number | null; penalties: number | null;
  setPieces: number | null; rating: number | null;
  owner: number | null; price: number | null; // team 1 = user's team
};
export type Plan = { config: Config; players: Player[] };
export function initialConfig(name = 'Asta Classic sabato', budget = 500): Config {
  return { version: 1, mode: 'classic', name, budget, teams: 8,
    slots: { P: null, D: null, C: null, A: null }, modifier: 'unknown', minimumBid: 1,
    allocation: { P: 8, D: 12, C: 25, A: 55 },
    weights: { bonus: 45, starter: 30, penalties: 10, setPieces: 5, rating: 10, defense: 15, scarcity: 25 } };
}
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const integer = (n: unknown, min: number, max: number) => finite(n) && Number.isInteger(n) && n >= min && n <= max;
export function validateConfig(c: Config): string[] {
  const errors: string[] = [];
  if (c.version !== 1 || c.mode !== 'classic') errors.push('Formato Classic non supportato.');
  if (typeof c.name !== 'string' || !c.name.trim()) errors.push('Inserisci il nome dell’asta.');
  if (!integer(c.budget, 1, 1000000)) errors.push('Budget: intero da 1 a 1.000.000.');
  if (!integer(c.teams, 2, 100)) errors.push('Squadre: intero da 2 a 100.');
  if (!integer(c.minimumBid, 1, c.budget)) errors.push('Offerta minima non valida.');
  if (!['unknown', 'on', 'off'].includes(c.modifier)) errors.push('Modificatore non valido.');
  for (const r of ROLES) {
    if (c.slots[r] !== null && !integer(c.slots[r], 1, 50)) errors.push(`${r}: posti da 1 a 50 oppure da configurare.`);
    if (!finite(c.allocation[r]) || c.allocation[r] < 0 || c.allocation[r] > 100) errors.push(`${r}: quota budget non valida.`);
  }
  if (Math.abs(ROLES.reduce((s, r) => s + c.allocation[r], 0) - 100) > 0.001) errors.push('Le quote dei reparti devono sommare 100%.');
  for (const k of ['bonus', 'starter', 'penalties', 'setPieces', 'rating', 'defense', 'scarcity'] as const) {
    if (!finite(c.weights[k]) || c.weights[k] < 0 || c.weights[k] > 100) errors.push(`Peso ${k}: da 0 a 100.`);
  }
  if (['bonus', 'starter', 'penalties', 'setPieces', 'rating'].reduce((s, k) => s + c.weights[k as keyof Config['weights']], 0) <= 0) errors.push('Almeno un peso di valutazione deve essere positivo.');
  if (ROLES.reduce((s, r) => s + (c.slots[r] ?? 0), 0) * c.minimumBid > c.budget) errors.push('Budget insufficiente per completare la rosa all’offerta minima.');
  return errors;
}
export function validatePlayers(players: Player[], c: Config): string[] {
  const errors: string[] = [], ids = new Set<string>();
  if (!integer(c.teams, 2, 100)) return ["Numero squadre non valido."];
  for (const p of players) {
    if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || !ROLES.includes(p.role)) { errors.push('Giocatore non valido o ID duplicato.'); continue; }
    ids.add(p.id);
    for (const k of ['bonus', 'starter', 'penalties', 'setPieces', 'rating'] as const) if (p[k] !== null && (!finite(p[k]) || p[k]! < 0 || p[k]! > 100)) errors.push(`${p.name}: ${k} deve essere 0–100 o null.`);
    if (p.owner === null ? p.price !== null : !integer(p.owner, 1, c.teams) || !integer(p.price, c.minimumBid, c.budget)) errors.push(`${p.name}: squadra/prezzo non validi.`);
  }
  for (let team = 1; team <= c.teams; team++) {
    const buys = players.filter(p => p?.owner === team);
    const spent = buys.reduce((s, p) => s + (p.price ?? 0), 0);
    if (spent > c.budget) errors.push(`Squadra ${team}: budget superato.`);
    for (const r of ROLES) if (c.slots[r] !== null && buys.filter(p => p.role === r).length > c.slots[r]!) errors.push(`Squadra ${team}: troppi ${r}.`);
    if (ROLES.every(r => c.slots[r] !== null) && spent + Math.max(0, ROLES.reduce((s, r) => s + c.slots[r]!, 0) - buys.length) * c.minimumBid > c.budget) errors.push(`Squadra ${team}: mancano crediti per completare la rosa.`);
  }
  return errors;
}
export function parsePlan(raw: string): Plan {
  const p = JSON.parse(raw) as Plan;
  if (!p?.config?.slots || !p.config.allocation || !p.config.weights || !Array.isArray(p.players)) throw new Error('File non valido: servono config e players.');
  const errors = [...validateConfig(p.config), ...validatePlayers(p.players, p.config)];
  if (errors.length) throw new Error(errors.join(' '));
  return p;
}
export function score(p: Player, c: Config) {
  const w = c.weights;
  const weights = { bonus: w.bonus * (p.role === 'A' ? 1.25 : p.role === 'C' ? 1.15 : 1), starter: w.starter,
    penalties: w.penalties, setPieces: w.setPieces, rating: w.rating + (p.role === 'D' && c.modifier === 'on' ? w.defense : 0) };
  const entries = Object.entries(weights) as [keyof typeof weights, number][];
  const totalWeight = entries.reduce((s, [, weight]) => s + weight, 0);
  const missing = entries.filter(([k, weight]) => weight > 0 && p[k] === null).map(([k]) => k);
  // No invented estimates or substitution of Mantra values for missing scouting data.
  return { value: missing.length || totalWeight <= 0 ? null : entries.reduce((s, [k, weight]) => s + (p[k] ?? 0) * weight, 0) / totalWeight, missing };
}
export function evaluate(plan: Plan) {
  const { config: c, players } = plan;
  const errors = [...validateConfig(c), ...validatePlayers(players, c)];
  const ready = !errors.length && c.modifier !== 'unknown' && ROLES.every(r => c.slots[r] !== null);
  const mine = players.filter(p => p.owner === 1);
  const remaining = c.budget - mine.reduce((s, p) => s + (p.price ?? 0), 0);
  const openSlots = ROLES.reduce((s, r) => s + Math.max(0, (c.slots[r] ?? 0) - mine.filter(p => p.role === r).length), 0);
  const maxBid = ready && openSlots > 0 ? Math.max(0, remaining - (openSlots - 1) * c.minimumBid) : null;
  const departments = ROLES.map(role => {
    const group = players.filter(p => p.role === role);
    const available = group.filter(p => p.owner === null);
    const slots = c.slots[role];
    const demand = slots === null ? null : c.teams * slots - group.filter(p => p.owner !== null).length;
    const qualified = available.filter(p => p.starter !== null && p.starter >= 70).length;
    const scarcity = demand === null ? null : Math.min(2, Math.max(1, demand / Math.max(1, qualified)));
    const target = Math.floor(c.budget * c.allocation[role] / 100);
    const spent = mine.filter(p => p.role === role).reduce((s, p) => s + p.price!, 0);
    return { role, target, spent, remaining: target - spent, slots, owned: mine.filter(p => p.role === role).length, available: available.length, qualified, demand, scarcity };
  });
  const rankings = players.map(p => {
    const s = score(p, c), d = departments.find(d => d.role === p.role)!;
    const uplift = 1 + ((d.scarcity ?? 1) - 1) * c.weights.scarcity / 100;
    const rating = s.value === null ? null : s.value * uplift;
    const pool = players.filter(q => q.role === p.role && q.owner === null).map(q => score(q, c).value).filter((v): v is number => v !== null).sort((a, b) => b - a);
    // Compare quality with the marginal player needed to fill this department league-wide.
    const replacement = pool[Math.min(pool.length - 1, Math.max(0, (d.demand ?? 1) - 1))] ?? 0;
    const edge = s.value === null ? 0 : Math.max(0, s.value - replacement);
    const totalEdge = pool.reduce((sum, v) => sum + Math.max(0, v - replacement), 0);
    const leagueSpent = players.filter(q => q.role === p.role && q.owner !== null).reduce((sum, q) => sum + q.price!, 0);
    const surplus = Math.max(0, d.target * c.teams - leagueSpent - (d.demand ?? 0) * c.minimumBid);
    const market = c.minimumBid + (totalEdge > 0 ? surplus * edge / totalEdge : 0);
    const left = (d.slots ?? 0) - d.owned;
    const departmentCap = Math.max(0, d.remaining - Math.max(0, left - 1) * c.minimumBid);
    const ceiling = !ready || s.value === null || p.owner !== null ? null : left <= 0 ? 0 : Math.max(0, Math.min(maxBid!, departmentCap, Math.floor(market * uplift)));
    return { ...p, score: s.value, priority: rating, ceiling, missing: s.missing };
  }).sort((a, b) => (b.priority ?? -1) - (a.priority ?? -1) || a.name.localeCompare(b.name));
  return { ready, errors, remaining, openSlots, maxBid, departments, rankings };
}
