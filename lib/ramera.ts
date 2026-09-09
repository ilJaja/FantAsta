import { ramera } from "@/data/ramera";

export type TeamName = (typeof ramera.teams)[number];
export type RosterEntry = { n: string; price: number };

export function rosterOf(team: string): RosterEntry[] {
  const all = ramera.rosters as Record<string, readonly (readonly [string, number])[]>;
  return (all[team] ?? []).map(([n, price]) => ({ n, price }));
}

export function spentOf(team: string) {
  return rosterOf(team).reduce((sum, buy) => sum + buy.price, 0);
}

export function creditsOf(team: string) {
  return ramera.budget - spentOf(team);
}

export function metadataFor(name: string) {
  const meta = ramera.playerMeta as Record<string, { role: string; club: string }>;
  return meta[name] ?? { role: "—", club: "—" };
}

export function unavailableFor(name: string) {
  const out = ramera.unavailable as Record<string, string>;
  return out[name] ?? null;
}

export function departmentFor(name: string) {
  const role = metadataFor(name).role;
  if (role === "Por") return "Por";
  if (role.includes("Pc") || role === "A" || role.endsWith("/A") || role.startsWith("A/")) return "Att";
  if (/(^|\/)D[cds]/.test(role) || role.startsWith("Dd")) return "Dif";
  return "Cen";
}

export const myTeam = ramera.teams[ramera.meIndex];
export const myRoster = rosterOf(myTeam);
