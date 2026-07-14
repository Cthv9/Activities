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
-- Entrambe le estensioni sono preinstallate sui progetti Supabase hosted;
-- l'abilitazione qui è idempotente.
-- ============================================================
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- ============================================================
-- La schedulazione vera e propria NON viene creata da questa migration
-- perché dipende dall'URL del progetto (project ref). Va eseguita una
-- tantum dal SQL editor dopo il deploy della funzione evaluate-balance:
--
--   select cron.schedule(
--     'equilibrio-evaluate-balance',
--     '*/30 * * * *', -- ogni 30 minuti
--     $$
--     select net.http_post(
--       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/evaluate-balance',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer <ANON_KEY>'
--       ),
--       body := '{}'::jsonb
--     );
--     $$
--   );
--
-- Nota: la anon key è sufficiente (e pubblica per progettazione): serve solo
-- a superare il verify_jwt della funzione, che al suo interno usa la
-- service_role iniettata automaticamente nell'ambiente. La funzione non
-- accetta input pericolosi e il cooldown di 24h la rende innocua anche se
-- invocata da terzi.
-- ============================================================
