"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Download, Save, Sparkles } from 'lucide-react';
import { initialConfig, evaluate, parsePlan, ROLES, ROLE_LABELS, type Config, type Plan, type Player, type Role } from '@/lib/classic/engine';
import './classic.css';

const SIGNALS = { bonus: 'Bonus attesi', starter: 'Titolarità', penalties: 'Rigori', setPieces: 'Piazzati', rating: 'Qualità voto' } as const;
const WEIGHTS = { ...SIGNALS, defense: 'Premio voto difesa con modificatore', scarcity: 'Premio scarsità (massimo %)' };
const freshPlayer = (): Player => ({ id: '', name: '', role: 'A', bonus: null, starter: null, penalties: null, setPieces: null, rating: null, owner: null, price: null });
function NumberField({ label, value, change, min = 0, max = 100 }: { label: string; value: number | null; change: (n: number | null) => void; min?: number; max?: number }) {
  return <label><span>{label}</span><input type="number" min={min} max={max} step="1" value={value ?? ''} placeholder="Da configurare" onChange={e => change(e.target.value === '' ? null : Number(e.target.value))}/></label>;
}
export function ClassicWorkspace({ storageKey, name, budget = 500 }: { storageKey: string; name?: string; budget?: number }) {
  const [plan, setPlan] = useState<Plan>(() => ({ config: initialConfig(name, budget), players: [] }));
  const [loaded, setLoaded] = useState(false), [message, setMessage] = useState('');
  const [draft, setDraft] = useState<Player>(freshPlayer), [filter, setFilter] = useState('all');
  const [purchase, setPurchase] = useState({ id: '', owner: 1, price: 1 });
  const c = plan.config;
  const result = useMemo(() => evaluate(plan), [plan]);
  useEffect(() => {
    try { const raw = localStorage.getItem(storageKey); if (raw) setPlan(parsePlan(raw)); }
    catch { setMessage('Salvataggio non leggibile: non è stato sovrascritto. Puoi importare un backup valido.'); }
    setLoaded(true);
  }, [storageKey]);
  const config = (patch: Partial<Config>) => setPlan(p => ({ ...p, config: { ...p.config, ...patch } }));
  function apply(next: Plan, success: string) {
    try { const valid = parsePlan(JSON.stringify(next)); setPlan(valid); setMessage(success); return true; }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Dati non validi.'); return false; }
  }
  function save() {
    try { parsePlan(JSON.stringify(plan)); localStorage.setItem(storageKey, JSON.stringify(plan)); setMessage('Salvato su questo browser per questa asta e questo account.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Salvataggio non riuscito. Esporta un backup.'); }
  }
  function exportPlan() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'fantasta-classic.json'; a.click(); URL.revokeObjectURL(url);
  }
  function addPlayer(e: FormEvent) {
    e.preventDefault();
    const next = { ...draft, id: draft.id || crypto.randomUUID() };
    const players = plan.players.some(p => p.id === next.id) ? plan.players.map(p => p.id === next.id ? next : p) : [...plan.players, next];
    if (apply({ ...plan, players }, 'Giocatore aggiornato. Premi Salva piano per conservarlo.')) setDraft(freshPlayer());
  }
  function buy(e: FormEvent) {
    e.preventDefault();
    if (!plan.players.some(p => p.id === purchase.id && p.owner === null)) { setMessage('Scegli un giocatore libero.'); return; }
    if (!result.ready) { setMessage('Completa le regole prima di registrare acquisti.'); return; }
    apply({ ...plan, players: plan.players.map(p => p.id === purchase.id ? { ...p, owner: purchase.owner, price: purchase.price } : p) }, 'Acquisto registrato nel piano. Premi Salva piano.');
  }
  if (!loaded) return <p>Caricamento piano Classic…</p>;
  return <div className="classic-workspace">
    <div className="page-head"><div><span className="eyebrow">MOTORE CLASSIC · P / D / C / A</span><h1>Strategia asta Classic</h1><p>{c.name} · {c.budget} crediti · {c.teams} squadre</p></div><div className="classic-actions"><button className="primary-btn" onClick={save} disabled={result.errors.length > 0}><Save size={16}/> Salva piano</button><button className="secondary-btn" onClick={exportPlan}><Download size={16}/> Esporta</button></div></div>
    <p className="classic-note">Piano indipendente dalla rosa e dai dati Mantra. Salvataggio manuale su questo browser, separato per account e asta; usa Esporta / Importa per trasferirlo. Squadra 1 = la tua squadra. Le modifiche non ancora salvate restano solo in questa schermata.</p>
    {message && <div className="classic-notice" role="status">{message}</div>}
    {!result.ready && <div className="classic-notice">{result.errors.length ? result.errors.join(' ') : 'Regolamento da completare: indica i posti P/D/C/A e il modificatore. I tetti d’offerta rimangono sospesi.'}</div>}
    <section className="classic-kpis" aria-label="Riepilogo budget">
      <article className="panel"><span>Crediti residui</span><strong>{result.remaining}</strong></article>
      <article className="panel"><span>Posti da coprire</span><strong>{ROLES.every(r => c.slots[r] !== null) ? result.openSlots : '—'}</strong></article>
      <article className="panel"><span>Massimo legale prossimo acquisto</span><strong>{result.maxBid ?? '—'}</strong></article>
      <article className="panel"><span>Giocatori nel listino</span><strong>{plan.players.length}</strong></article>
    </section>
    <section className="panel"><span className="eyebrow">01 · REGOLE DELLA TUA ASTA</span><h2>Configurazione</h2>
      <div className="classic-fields"><label><span>Nome asta / piano</span><input value={c.name} onChange={e => config({ name: e.target.value })}/></label>
        <NumberField label="Budget per squadra" value={c.budget} min={1} max={1000000} change={n => config({ budget: n ?? 0 })}/>
        <NumberField label="Numero squadre" value={c.teams} min={2} change={n => config({ teams: n ?? 0 })}/>
        <NumberField label="Offerta minima (proposta: 1)" value={c.minimumBid} min={1} max={1000000} change={n => config({ minimumBid: n ?? 0 })}/>
        {ROLES.map(r => <NumberField key={r} label={`Posti ${ROLE_LABELS[r]}`} value={c.slots[r]} min={1} max={50} change={n => config({ slots: { ...c.slots, [r]: n } })}/>)}
        <label><span>Modificatore difesa</span><select value={c.modifier} onChange={e => config({ modifier: e.target.value as Config['modifier'] })}><option value="unknown">Da configurare</option><option value="off">Assente</option><option value="on">Presente — premio qualità voto</option></select></label>
      </div><p className="classic-note">Nessun numero di giocatori per ruolo presunto. Il modificatore influenza il peso del voto dei difensori: non simula le soglie punti del tuo regolamento.</p>
      <button className="secondary-btn" onClick={() => config({ slots: { P: 3, D: 8, C: 8, A: 6 } })}>Usa proposta rosa 3 / 8 / 8 / 6</button>
    </section>
    <section className="panel"><span className="eyebrow">02 · DISTRIBUZIONE CREDITI</span><h2>Budget e scarsità per reparto</h2><p>Proposta iniziale modificabile: 8% portieri, 12% difesa, 25% centrocampo, 55% attacco. Le quote devono sommare 100%.</p>
      <div className="classic-departments">{result.departments.map(d => <article key={d.role}><span className="eyebrow">{d.role} · {ROLE_LABELS[d.role]}</span><strong>{d.target} cr</strong><NumberField label={`Quota ${d.role} (%)`} value={c.allocation[d.role]} change={n => config({ allocation: { ...c.allocation, [d.role]: n ?? 0 } })}/><p>Spesi {d.spent} · residuo reparto {d.remaining}<br/>{d.owned} / {d.slots ?? '?'} posti occupati<br/>{d.available} liberi · {d.qualified} con titolarità ≥70<br/>Domanda residua lega: {d.demand ?? '—'}</p><small>{d.scarcity === null ? 'Scarsità non calcolabile' : `Pressione reparto: ${d.scarcity.toFixed(2)}×`}</small></article>)}</div>
      <p className="classic-note">Scarsità relativa al listino inserito: importa l’intero mercato per stime sensate. Una copertura parziale altera le valutazioni. I residui di reparto negativi indicano un superamento della quota: puoi riequilibrare le percentuali.</p>
    </section>
    <section className="panel"><span className="eyebrow"><Sparkles size={14}/> CRITERI CLASSIC</span><h2>Bonus e titolari prima della duttilità</h2><p>Investi sui bonus in attacco e a centrocampo; completa i reparti con titolari affidabili. Con modificatore attivo aumenta l’importanza del voto in difesa. Non inseguire un prezzo oltre il tetto solo perché restano poche alternative.</p>
      <details><summary>Pesi e metodo di calcolo</summary><div className="classic-fields">{Object.entries(WEIGHTS).map(([key, label]) => <NumberField key={key} label={label} value={c.weights[key as keyof Config['weights']]} change={n => config({ weights: { ...c.weights, [key]: n ?? 0 } })}/>)}</div><p className="classic-note">Media ponderata degli indici 0–100. Peso bonus ×1,25 per A e ×1,15 per C; nessun premio multiruolo. Scarsità = domanda / titolari disponibili (soglia 70), limitata tra 1 e 2. Il tetto distribuisce i crediti oltre il minimo sul valore sopra il giocatore marginale del reparto, applica il premio scarsità e rispetta quote e riserva rosa. È una stima strategica, non una quotazione ufficiale.</p></details>
    </section>
    <section className="panel"><span className="eyebrow">03 · LISTINO CLASSIC</span><h2>{draft.id ? 'Modifica giocatore' : 'Aggiungi giocatore'}</h2><p>Usa il ruolo Classic del tuo listino ufficiale. Inserisci indici di scouting da 0 a 100: 0 = assente / minimo, 100 = massimo. Lascia vuoto se non conosci il dato; non sarà inventato.</p>
      <form onSubmit={addPlayer}><div className="classic-fields"><label><span>Nome giocatore</span><input required value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}/></label><label><span>Ruolo Classic</span><select value={draft.role} onChange={e => setDraft(p => ({ ...p, role: e.target.value as Role }))}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></label>{Object.entries(SIGNALS).map(([key, label]) => <NumberField key={key} label={`${label} (0–100)`} value={draft[key as keyof typeof SIGNALS]} change={n => setDraft(p => ({ ...p, [key]: n }))}/>)}</div><div className="classic-actions"><button className="primary-btn">{draft.id ? 'Aggiorna giocatore' : 'Aggiungi al listino'}</button>{draft.id && <button type="button" className="secondary-btn" onClick={() => setDraft(freshPlayer())}>Annulla modifica</button>}</div></form>
      <details><summary>Importa piano / listino JSON</summary><p>L’importazione sostituisce solo questo piano Classic. Esporta prima se vuoi conservarne una copia. Struttura: config + players; puoi esportare il piano vuoto per ottenere la configurazione completa.</p><pre>{JSON.stringify({ players: [{ ...freshPlayer(), id: 'id-listino', name: 'Nome da listino' }] }, null, 2)}</pre><label><span>Importa piano Classic (JSON, massimo 2 MB)</span><input type="file" accept="application/json,.json" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { if (f.size > 2000000) throw new Error('File troppo grande (massimo 2 MB).'); const imported = parsePlan(await f.text()); setPlan(imported); setDraft(freshPlayer()); setPurchase({ id: '', owner: 1, price: 1 }); setMessage('Piano importato. Premi Salva piano per conservarlo.'); } catch (err) { setMessage(err instanceof Error ? err.message : 'Importazione non riuscita.'); } e.target.value = ''; }}/></label></details>
    </section>
    <section className="panel"><div className="classic-actions"><h2>Priorità e tetti d’offerta</h2><label><span>Filtra reparto</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Tutti</option>{ROLES.map(r => <option key={r}>{r}</option>)}</select></label></div>
      {!plan.players.length ? <p>Nessun giocatore inserito. Aggiungi il listino Classic per calcolare priorità e prezzi; i dati Mantra non vengono riutilizzati automaticamente.</p> : <div className="classic-table"><table><thead><tr><th>Giocatore</th><th>Ruolo</th><th>Indice</th><th>Priorità</th><th>Tetto cr</th><th>Stato / qualità dati</th><th>Azioni</th></tr></thead><tbody>{result.rankings.filter(p => filter === 'all' || p.role === filter).map(p => <tr key={p.id}><td>{p.name}</td><td>{p.role}</td><td>{p.score?.toFixed(1) ?? '—'}</td><td>{p.priority?.toFixed(1) ?? '—'}</td><td>{p.ceiling ?? '—'}</td><td>{p.owner ? `Squadra ${p.owner} · ${p.price} cr` : p.missing.length ? `Mancano: ${p.missing.map(k => SIGNALS[k]).join(', ')}` : result.ready ? 'Libero · stima sul listino inserito' : 'Libero · completa regolamento'}</td><td><button className="secondary-btn" onClick={() => setDraft(plan.players.find(q => q.id === p.id)!)}>Modifica</button>{p.owner !== null && <button className="secondary-btn" onClick={() => apply({ ...plan, players: plan.players.map(q => q.id === p.id ? { ...q, owner: null, price: null } : q) }, 'Acquisto annullato nel piano. Premi Salva piano.')}>Annulla acquisto</button>}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="panel"><span className="eyebrow">04 · DURANTE L’ASTA</span><h2>Registra acquisto</h2><p>Gli acquisti del piano aggiornano crediti, posti liberi e scarsità. Rimangono separati dall’archivio storico dell’app.</p><form onSubmit={buy}><div className="classic-fields"><label><span>Giocatore libero</span><select required value={purchase.id} onChange={e => setPurchase(p => ({ ...p, id: e.target.value }))}><option value="">Seleziona</option>{plan.players.filter(p => p.owner === null).map(p => <option value={p.id} key={p.id}>{p.name} · {p.role}</option>)}</select></label><NumberField label="Squadra (1 = mia)" min={1} max={c.teams} value={purchase.owner} change={n => setPurchase(p => ({ ...p, owner: n ?? 0 }))}/><NumberField label="Prezzo pagato" min={c.minimumBid} max={c.budget} value={purchase.price} change={n => setPurchase(p => ({ ...p, price: n ?? 0 }))}/></div><button className="primary-btn" disabled={!result.ready}>Registra nel piano</button></form></section>
  </div>;
}
