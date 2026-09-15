# Strategia Classic

Implementazione separata in `lib/classic/engine.ts`, raggiungibile da **Strategia Classic** (`/classic`). Aprendo **Asta** in una lega Classic si usa la nuova vista; il ramo Mantra conserva l’archivio originale.

## Configurazione iniziale

Il piano per sabato parte da 500 crediti e 8 squadre. In una lega Classic esistente eredita nome e budget della lega. Budget, squadre, offerta minima, posti per reparto, modificatore e pesi sono modificabili nel piano. Queste impostazioni non modificano il regolamento della lega nel database.

I posti P/D/C/A restano vuoti e il modificatore è “Da configurare”. La proposta 3/8/8/6 si applica solo premendo il pulsante dedicato. Finché le regole non sono complete non vengono emessi tetti d’offerta né registrati acquisti.

Ripartizione iniziale proposta: P 8%, D 12%, C 25%, A 55%. Per 500 crediti: 40 / 60 / 125 / 275. Le quote sono modificabili e devono sommare 100%.

## Valutazione

Il ruolo Classic deve provenire dal listino adottato dalla lega. Nessun ruolo o prezzo è convertito automaticamente dal Mantra. Nessun riferimento a una lega specifica entra nel nuovo motore.

Ogni giocatore ha cinque indici di scouting 0–100: bonus attesi, titolarità, rigori, piazzati e qualità del voto. Non sono statistiche ufficiali o probabilità verificate. Un dato sconosciuto è `null`; se il suo peso è positivo sospende la valutazione. Uno zero indica invece un dato noto al minimo.

Pesi iniziali: bonus 45, titolarità 30, rigori 10, piazzati 5, voto 10. Il peso bonus viene moltiplicato per 1,25 per A e 1,15 per C. La duttilità Mantra non conta. Il modificatore attivo aggiunge un peso voto difesa di 15, personalizzabile: non calcola i punti delle specifiche fasce del regolamento.

La domanda di reparto è posti × squadre meno gli acquisti del reparto. La pressione confronta domanda e titolari disponibili (indice almeno 70), con moltiplicatore limitato tra 1 e 2; il premio massimo iniziale è 25%. Listini parziali alterano questa stima: l’interfaccia lo segnala.

Il prezzo teorico ripartisce il budget di reparto ancora disponibile sul valore sopra il giocatore marginale necessario a completare le rose della lega. Il tetto personale rispetta sia la quota di reparto sia la riserva minima per tutti i posti ancora aperti. Reparti completi hanno tetto zero. Acquisti e modifiche sono rifiutati se superano budget, posti o riserva minima. I prezzi pagati possono eccedere il suggerimento strategico, senza superare i limiti del regolamento configurato.

## Dati e salvataggio

Il piano JSON contiene `config` (versione 1, modalità classic) e `players`. La squadra 1 è la propria; le altre sono numerate fino al numero configurato. I giocatori liberi hanno `owner: null` e `price: null`.

Salvataggio manuale locale sotto `fantasta:classic:v1:<userId>:<leagueId>`. Cambiare account o lega separa i piani. L’esportazione scarica il piano completo; l’importazione valida il file e sostituisce solo il piano visualizzato. Il limite di importazione è 2 MB. Esportare prima di importare se si vuole conservare la versione precedente.

Non è prevista sincronizzazione Supabase in questa implementazione: gli acquisti Classic del piano non scrivono nelle rose storiche. I file Mantra, i report, le migrazioni e i dati esistenti sono preservati. L’app originaria contiene ancora altre pagine collegate al backup storico: non sono state convertite in pagine Classic da questo intervento.

## Verifica

- `pnpm run test:classic`: test del motore, validazione, prezzi, scarsità, modificatore, round trip e assenza di mutazioni degli input.
- `pnpm build`: compilazione e controllo tipi di tutte le pagine, inclusa `/classic`.
- Build locale eseguita con configurazione Supabase fittizia esclusivamente per compilazione: nessun accesso ai dati di produzione.
- Verifica interattiva non completata: la sessione locale impedisce l’apertura del server (`listen EPERM`); non è stato dichiarato un test visivo superato.
