# FantAsta 2.0

Applicazione Next.js multi-lega per asta e gestione stagionale del Fantacalcio.

## Stato attuale

- Dashboard RAMERA importata dal backup reale
- 273 acquisti e 10 squadre disponibili nell'app
- Rosa Jason con ruoli/squadre principali
- Modulo 3-4-2-1 e prima formazione base
- Asta, Rosa, Formazione, Giornata, Analisi e Lega
- API health check
- Client Supabase predisposto
- Migrazione PostgreSQL con RLS per utenti, leghe, membri, acquisti, status e formazioni

## Sviluppo

```bash
npm install
npm run dev
```

## Supabase

1. Applicare `supabase/migrations/0001_initial.sql`
2. Configurare `NEXT_PUBLIC_SUPABASE_URL`
3. Configurare `NEXT_PUBLIC_SUPABASE_ANON_KEY`

L'app funziona anche senza queste variabili in modalità RAMERA demo/importata.
