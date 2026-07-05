# Equilibrio

PWA familiare per tracciare attività personalizzate e visualizzarne l'equilibrio
relativo tramite un radar chart dinamico. Ogni attività registrata (check-in o
quantità) aggiunge peso alla propria quota percentuale sul totale dei log della
famiglia in una finestra temporale scelta; l'obiettivo è mantenere il poligono
il più regolare possibile.

## Stack

- **Frontend**: React + Vite, TypeScript, Tailwind CSS v4, Recharts, React Router.
- **Backend**: Supabase (Postgres + Row Level Security, Auth ibrida account/PIN, Edge Functions).
- **PWA**: manifest installabile, service worker con cache offline, coda di sincronizzazione IndexedDB per i log registrati offline.
- **Notifiche**: Web Push standard (VAPID) via Edge Function, valutazione periodica via `pg_cron`.

## Setup locale

```bash
npm install
cp .env.example .env   # compila con i valori del tuo progetto Supabase
npm run dev
```

### Supabase

```bash
npx supabase start          # ambiente locale (richiede Docker)
npx supabase db push        # applica le migration in supabase/migrations
```

Nessun segreto è committato nel repository: la `anon key` in `.env` è pubblica
per progettazione, la sicurezza dei dati è garantita esclusivamente dalle
policy RLS definite in `supabase/migrations/0001_init.sql`. Le chiavi
`service_role` e VAPID private vivono solo nei secrets delle Edge Functions
(`npx supabase secrets set ...`), mai nel codice o in `.env`.

## Struttura

```
src/
  pages/        pagine di primo livello (routing)
  components/   componenti riusabili (radar, card attività, ecc.)
  contexts/      stato di autenticazione/famiglia
  hooks/         data-fetching verso Supabase
  lib/           client Supabase, coda offline, calcolo colori/soglie
  types/         tipi condivisi che rispecchiano lo schema Postgres
supabase/
  migrations/    schema SQL + RLS
  functions/     Edge Functions (verify-pin, send-push, evaluate-balance)
```

## Limiti noti

- Le notifiche push su iOS funzionano solo dopo aver installato la PWA sulla
  home screen (Safari non supporta Web Push per pagine aperte nel browser).
