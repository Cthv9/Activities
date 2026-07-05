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
policy RLS definite in `supabase/migrations/*.sql`. Le chiavi `service_role`
e VAPID private vivono solo nei secrets delle Edge Functions, mai nel codice
o in `.env`.

### Notifiche push (VAPID)

```bash
npx web-push generate-vapid-keys        # una tantum per progetto
cp supabase/functions/.env.example supabase/functions/.env
# compila supabase/functions/.env con le chiavi generate, poi:
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy send-push evaluate-balance
```

La chiave pubblica VAPID va anche in `.env` come `VITE_VAPID_PUBLIC_KEY` (è
quella che il browser usa per la sottoscrizione, non è un segreto). La
valutazione periodica del bilancio (`evaluate-balance`) va poi schedulata
con `pg_cron`: il comando esatto, che richiede il project ref e la
service_role key salvata in Vault, è documentato in
`supabase/migrations/0002_notifications.sql`.

## Struttura

```
src/
  pages/        pagine di primo livello (routing, lazy-loaded)
  components/   componenti riusabili (radar, card attività, ecc.)
  contexts/      stato di autenticazione/famiglia
  hooks/         data-fetching verso Supabase
  lib/           client Supabase, coda offline, push, calcolo colori/soglie
  sw.ts          service worker custom (precache + eventi push/notificationclick)
supabase/
  migrations/    schema SQL + RLS
  functions/     Edge Functions (send-push, evaluate-balance, _shared)
```

## Limiti noti

- Le notifiche push su iOS funzionano solo dopo aver installato la PWA sulla
  home screen (Safari non supporta Web Push per pagine aperte nel browser).
