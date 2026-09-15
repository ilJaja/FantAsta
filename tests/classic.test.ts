import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate, initialConfig, parsePlan, score, validateConfig, validatePlayers, type Config, type Player } from '../lib/classic/engine';
const config = (): Config => ({ ...initialConfig(), slots: { P: 3, D: 8, C: 8, A: 6 }, modifier: 'off' });
const player = (id = 'one', patch: Partial<Player> = {}): Player => ({ id, name: id, role: 'A', bonus: 80, starter: 90, penalties: 80, setPieces: 40, rating: 60, owner: null, price: null, ...patch });
test('500/8 preset leaves unknown rules explicit', () => {
  const c = initialConfig(); assert.equal(c.budget, 500); assert.equal(c.teams, 8); assert.equal(c.slots.D, null); assert.equal(c.modifier, 'unknown');
  assert.equal(evaluate({ config: c, players: [player()] }).maxBid, null);
});
test('bonus, reliability, penalties and set pieces each increase value; no Mantra premium', () => {
  const c = config(); const p = player();
  for (const key of ['bonus', 'starter', 'penalties', 'setPieces'] as const) assert.ok(score(p, c).value! > score({ ...p, [key]: 0 }, c).value!);
  assert.equal(score(p, c).value, score({ ...p, ...{ mantraRoles: ['C', 'T', 'W'] } }, c).value);
  assert.ok(score(player('a', { bonus: 100, rating: 10 }), c).value! > score(player('d', { role: 'D', bonus: 100, rating: 10 }), c).value!);
});
test('modifier benefits high-vote defenders only', () => {
  const c = config(), on = { ...c, modifier: 'on' as const }, p = player('d', { role: 'D', rating: 100 });
  assert.ok(score(p, on).value! > score(p, c).value!); assert.equal(score(player(), on).value, score(player(), c).value);
});
test('missing scouting is unranked and not priced', () => {
  const r = evaluate({ config: config(), players: [player('x', { starter: null })] }).rankings[0];
  assert.equal(r.score, null); assert.equal(r.ceiling, null); assert.deepEqual(r.missing, ['starter']);
});
test('budget, teams, slots and market departures affect estimates', () => {
  const c = config(); const players = Array.from({ length: 60 }, (_, i) => player(String(i), { bonus: 100 - i }));
  const a = evaluate({ config: c, players }), b = evaluate({ config: { ...c, budget: 1000 }, players });
  assert.ok(b.rankings[0].ceiling! > a.rankings[0].ceiling!);
  const scarce = players.slice(0, 40);
  assert.notEqual(evaluate({ config: { ...c, teams: 4 }, players: scarce }).departments[3].scarcity, evaluate({ config: c, players: scarce }).departments[3].scarcity);
  assert.notEqual(evaluate({ config: { ...c, teams: 4 }, players }).rankings.find(p => p.id === '30')!.ceiling, a.rankings.find(p => p.id === '30')!.ceiling);
  assert.equal(evaluate({ config: c, players: [player('b', { owner: 2, price: 20 })] }).departments[3].demand, 47);
  assert.equal(evaluate({ config: { ...c, slots: { ...c.slots, A: 4 } }, players }).departments[3].demand, 32);
});
test('hard bid cap reserves every remaining slot and department quota', () => {
  const c = config(); const r = evaluate({ config: c, players: [player()] });
  assert.equal(r.maxBid, 476); assert.ok(r.rankings[0].ceiling! <= 270);
  const buys = Array.from({ length: 6 }, (_, i) => player(String(i), { owner: 1, price: 10 }));
  assert.equal(evaluate({ config: c, players: [...buys, player('free')] }).rankings.find(p => p.id === 'free')!.ceiling, 0);
  assert.ok(validatePlayers([player('x', { owner: 1, price: 490 })], c).length);
});
test('reject invalid config/imports, duplicate IDs, overspend and excess positions', () => {
  const c = config(); assert.ok(validateConfig({ ...c, allocation: { ...c.allocation, A: 90 } }).length);
  assert.ok(validatePlayers([player(), player()], c).length);
  assert.throws(() => parsePlan(JSON.stringify({ config: c, players: [player('bad', { role: 'Pc' as never })] })));
  assert.throws(() => parsePlan(JSON.stringify({ config: { ...c, teams: -1 }, players: [] })));
  assert.ok(validatePlayers(Array.from({ length: 7 }, (_, i) => player(String(i), { owner: 2, price: 1 })), c).length);
});
test('round trip is lossless; evaluation never mutates inputs', () => {
  const plan = { config: config(), players: [player()] }, before = JSON.stringify(plan);
  evaluate(plan); assert.equal(JSON.stringify(plan), before); assert.deepEqual(parsePlan(before), plan);
});
