-- ============================================================
-- Equilibrio — supporto alle notifiche push
-- ============================================================

-- Traccia l'ultima volta che una famiglia è stata avvisata per una
-- specifica attività trascurata, per evitare di rimandare la stessa
-- notifica ad ogni tick del cron finché la situazione non cambia.
-- Scritta solo dall'Edge Function evaluate-balance (service role): RLS
-- abilitata senza policy nega l'accesso a qualunque client anon/authenticated.
create table neglected_notifications (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families(id) on delete cascade,
  activity_id  uuid not null references activities(id) on delete cascade,
  notified_at  timestamptz not null default now(),
  unique (family_id, activity_id)
);

alter table neglected_notifications enable row level security;

-- ============================================================
-- pg_cron / pg_net: valutazione periodica del bilancio per famiglia.
-- Entrambe le estensioni sono preinstallate sui progetti Supabase hosted
-- (schema `extensions`); l'abilitazione qui è idempotente per gli ambienti
-- locali/self-hosted che le supportano.
-- ============================================================
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- ============================================================
-- La schedulazione vera e propria NON viene creata da questa migration:
-- richiede l'URL della funzione Edge del progetto (che dipende dal project
-- ref, noto solo dopo la creazione del progetto Supabase) e la service_role
-- key, che non deve mai comparire in chiaro in un file versionato. Dopo il
-- deploy, esegui una tantum dal SQL editor di Supabase (o via una migration
-- locale non committata) qualcosa come:
--
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
--
--   select cron.schedule(
--     'evaluate-family-balance',
--     '*/30 * * * *', -- ogni 30 minuti
--     $$
--     select net.http_post(
--       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/evaluate-balance',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--       ),
--       body := '{}'::jsonb
--     );
--     $$
--   );
--
-- La service_role key resta così solo dentro Vault (cifrata), mai nel
-- codice o nella cronologia git.
-- ============================================================
