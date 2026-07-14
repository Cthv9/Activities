-- ============================================================
-- Equilibrio — schema iniziale
-- ============================================================
-- Le funzioni helper referenziano tabelle definite più avanti nel file:
-- disattiva la validazione anticipata dei corpi funzione.
set check_function_bodies = off;

-- Estensioni necessarie per gen_random_uuid() / gen_random_bytes()
create extension if not exists pgcrypto;

-- ============================================================
-- ENUM TYPES
-- ============================================================
create type member_role      as enum ('owner', 'member');
create type member_auth_type as enum ('personal', 'pin');
create type activity_type    as enum ('checkin', 'quantity');
create type activity_status  as enum ('active', 'archived');
create type invite_status    as enum ('pending', 'accepted', 'expired', 'revoked');

-- ============================================================
-- FAMILIES
-- Entità che possiede il radar aggregato e le impostazioni condivise.
-- ============================================================
create table families (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 60),
  timezone        text not null default 'Europe/Rome',
  pin_hash        text,                    -- hash del PIN condiviso (bcrypt), null finché non impostato
  pin_updated_at  timestamptz,
  -- soglie relative all'ideale (100/n): sotto neglected_ratio = trascurata, sopra excess_ratio = eccessiva
  neglected_ratio numeric not null default 0.60 check (neglected_ratio > 0 and neglected_ratio < 1),
  excess_ratio    numeric not null default 1.60 check (excess_ratio > 1),
  created_at      timestamptz not null default now()
);

alter table families enable row level security;

-- ============================================================
-- HELPER FUNCTIONS (security definer: evitano ricorsione delle policy RLS
-- su family_members quando altre tabelle devono verificare l'appartenenza)
-- ============================================================
create function is_family_member(fam_id uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from family_members
    where family_id = fam_id and user_id = auth.uid()
  );
$$;

create function is_family_owner(fam_id uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from family_members
    where family_id = fam_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- id della riga family_members del chiamante per una data famiglia (o null se non membro)
create function my_member_id(fam_id uuid) returns uuid
  language sql security definer stable set search_path = public as $$
  select id from family_members
  where family_id = fam_id and user_id = auth.uid();
$$;

-- Policy su families: definite qui (dopo le funzioni helper, che le usano)
create policy families_select on families
  for select using (is_family_member(id));

create policy families_update on families
  for update using (is_family_owner(id));
-- Nessuna policy di insert diretta: la creazione di una famiglia avviene
-- esclusivamente tramite la RPC create_family() (security definer), che crea
-- atomicamente families + la prima riga family_members con role='owner'.

-- ============================================================
-- FAMILY_MEMBERS
-- Utenti (con account personale via Supabase Auth, oppure sessioni anonime
-- create da un accesso con PIN condiviso) collegati a una famiglia.
-- ============================================================
create table family_members (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 40),
  role          member_role not null default 'member',
  auth_type     member_auth_type not null,
  created_at    timestamptz not null default now(),
  unique (family_id, user_id)
);

alter table family_members enable row level security;

create policy family_members_select on family_members
  for select using (is_family_member(family_id));

-- un owner può modificare ruolo/rimuovere membri; ognuno può rinominare se stesso
create policy family_members_update on family_members
  for update using (is_family_owner(family_id) or user_id = auth.uid());

create policy family_members_delete on family_members
  for delete using (is_family_owner(family_id));
-- Nessuna policy di insert diretta: solo tramite RPC
-- (create_family, accept_invite, join_with_pin), che bypassano RLS come
-- security definer dopo aver validato l'operazione (token invito, PIN, ecc).

-- ============================================================
-- ACTIVITIES
-- Nome libero, tipo checkin/quantity, unità di misura per le quantità.
-- ============================================================
create table activities (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  type        activity_type not null,
  unit        text check (unit is null or char_length(unit) between 1 and 20),
  color       text not null,
  icon        text,
  status      activity_status not null default 'active',
  created_by  uuid not null references family_members(id),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint unit_matches_type check (
    (type = 'quantity' and unit is not null) or
    (type = 'checkin' and unit is null)
  )
);

alter table activities enable row level security;

create policy activities_select on activities
  for select using (is_family_member(family_id));

create policy activities_insert on activities
  for insert with check (is_family_member(family_id) and created_by = my_member_id(family_id));

create policy activities_update on activities
  for update using (is_family_member(family_id));

-- ============================================================
-- ACTIVITY_LOGS
-- Un log per occorrenza. is_shared_pin distingue i log fatti da un accesso
-- PIN condiviso (attribuzione anonima "Famiglia") da quelli di un account
-- personale (attribuzione nominale nel breakdown per membro).
-- ============================================================
create table activity_logs (
  id                uuid primary key default gen_random_uuid(),
  activity_id       uuid not null references activities(id) on delete cascade,
  family_id         uuid not null references families(id) on delete cascade,
  author_member_id  uuid not null references family_members(id),
  is_shared_pin     boolean not null default false,
  value             numeric not null check (value > 0),
  logged_at         timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create index activity_logs_family_time_idx on activity_logs (family_id, logged_at);
create index activity_logs_activity_time_idx on activity_logs (activity_id, logged_at);

alter table activity_logs enable row level security;

create policy activity_logs_select on activity_logs
  for select using (is_family_member(family_id));

create policy activity_logs_insert on activity_logs
  for insert with check (
    is_family_member(family_id)
    and author_member_id = my_member_id(family_id)
  );

create policy activity_logs_update on activity_logs
  for update using (author_member_id = my_member_id(family_id));

create policy activity_logs_delete on activity_logs
  for delete using (author_member_id = my_member_id(family_id));

-- Validazione server-side: un checkin vale sempre 1, una quantity deve essere > 0
-- (già garantito dal check su value); imposta anche is_shared_pin in modo
-- coerente con il tipo di autenticazione dell'autore, ignorando quanto
-- eventualmente inviato dal client.
create function validate_activity_log() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  act_type    activity_type;
  act_family  uuid;
  member_auth member_auth_type;
  member_family uuid;
begin
  select type, family_id into act_type, act_family from activities where id = new.activity_id;
  if act_family is null or act_family <> new.family_id then
    raise exception 'activity_id does not belong to family_id';
  end if;

  select auth_type, family_id into member_auth, member_family
    from family_members where id = new.author_member_id;
  if member_family is null or member_family <> new.family_id then
    raise exception 'author_member_id does not belong to family_id';
  end if;

  if act_type = 'checkin' and new.value <> 1 then
    raise exception 'checkin logs must have value = 1';
  end if;

  new.is_shared_pin := (member_auth = 'pin');
  return new;
end;
$$;

create trigger trg_validate_activity_log
  before insert or update on activity_logs
  for each row execute function validate_activity_log();

-- ============================================================
-- INVITES
-- Inviti pendenti via email con token a scadenza.
-- ============================================================
create table invites (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  status      invite_status not null default 'pending',
  invited_by  uuid not null references family_members(id),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now()
);

alter table invites enable row level security;

create policy invites_select on invites
  for select using (is_family_member(family_id));

create policy invites_insert on invites
  for insert with check (is_family_owner(family_id));

create policy invites_delete on invites
  for delete using (is_family_owner(family_id));
-- L'accettazione (accept_invite RPC) è security definer: il chiamante non è
-- ancora membro della famiglia quando accetta, quindi non potrebbe passare
-- le policy sopra come utente normale.

-- ============================================================
-- PIN_LOGIN_ATTEMPTS
-- Solo per rate limiting lato Edge Function (service role); mai esposta ai client.
-- ============================================================
create table pin_login_attempts (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families(id) on delete cascade,
  ip_hash      text not null,
  succeeded    boolean not null,
  attempted_at timestamptz not null default now()
);

create index pin_login_attempts_lookup_idx on pin_login_attempts (family_id, ip_hash, attempted_at);

alter table pin_login_attempts enable row level security;
-- Nessuna policy definita: RLS abilitata senza alcuna policy nega tutto
-- l'accesso ai client anon/authenticated. Solo la service_role key (usata
-- esclusivamente dalle Edge Functions) bypassa RLS e può leggerla/scriverla.

-- ============================================================
-- PUSH_SUBSCRIPTIONS
-- Sottoscrizioni Web Push (VAPID), una per dispositivo/membro.
-- ============================================================
create table push_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references families(id) on delete cascade,
  family_member_id  uuid not null references family_members(id) on delete cascade,
  endpoint          text not null unique,
  p256dh            text not null,
  auth_key          text not null,
  enabled           boolean not null default true,
  created_at        timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy push_subscriptions_all on push_subscriptions
  for all using (family_member_id = my_member_id(family_id))
  with check (family_member_id = my_member_id(family_id));

-- ============================================================
-- BILANCIO: funzione RPC che calcola la quota percentuale di occorrenze
-- per attività attiva nella finestra temporale richiesta, e lo stato
-- (ok / neglected / excess) rispetto all'ideale 100/n.
-- Dichiarata senza security definer: rispetta le RLS del chiamante.
-- ============================================================
create function get_family_balance(fam_id uuid, from_ts timestamptz, to_ts timestamptz)
  returns table (
    activity_id   uuid,
    activity_name text,
    log_count     bigint,
    share_pct     numeric,
    ideal_pct     numeric,
    status        text
  )
  language plpgsql stable security invoker set search_path = public as $$
declare
  n_activities int;
  total_logs   bigint;
begin
  select count(*) into n_activities from activities
    where family_id = fam_id and status = 'active';

  select count(*) into total_logs from activity_logs l
    join activities a on a.id = l.activity_id
    where l.family_id = fam_id and a.status = 'active'
      and l.logged_at >= from_ts and l.logged_at < to_ts;

  return query
  select
    a.id,
    a.name,
    coalesce(c.cnt, 0) as log_count,
    case when total_logs > 0 then round(100.0 * coalesce(c.cnt, 0) / total_logs, 2) else 0 end as share_pct,
    case when n_activities > 0 then round(100.0 / n_activities, 2) else 0 end as ideal_pct,
    case
      when total_logs = 0 or n_activities = 0 then 'ok'
      when (100.0 * coalesce(c.cnt, 0) / total_logs) < (100.0 / n_activities) * (select neglected_ratio from families where id = fam_id) then 'neglected'
      when (100.0 * coalesce(c.cnt, 0) / total_logs) > (100.0 / n_activities) * (select excess_ratio from families where id = fam_id) then 'excess'
      else 'ok'
    end as status
  from activities a
  left join (
    select activity_id, count(*) as cnt
    from activity_logs
    where family_id = fam_id and logged_at >= from_ts and logged_at < to_ts
    group by activity_id
  ) c on c.activity_id = a.id
  where a.family_id = fam_id and a.status = 'active';
end;
$$;

-- ============================================================
-- RPC: create_family
-- Crea famiglia + prima membership (owner, account personale) in transazione.
-- ============================================================
create function create_family(family_name text, creator_display_name text)
  returns uuid
  language plpgsql security definer set search_path = public as $$
declare
  new_family_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  insert into families (name) values (family_name) returning id into new_family_id;

  insert into family_members (family_id, user_id, display_name, role, auth_type)
  values (new_family_id, auth.uid(), creator_display_name, 'owner', 'personal');

  return new_family_id;
end;
$$;

-- ============================================================
-- RPC: accept_invite
-- Consuma un token di invito valido e crea la membership per l'utente
-- correntemente autenticato (deve aver già fatto login/magic link).
-- ============================================================
create function accept_invite(invite_token text, member_display_name text)
  returns uuid
  language plpgsql security definer set search_path = public as $$
declare
  inv invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into inv from invites
    where token = invite_token and status = 'pending' and expires_at > now();

  if inv.id is null then
    raise exception 'invito non valido o scaduto';
  end if;

  insert into family_members (family_id, user_id, display_name, role, auth_type)
  values (inv.family_id, auth.uid(), member_display_name, 'member', 'personal')
  on conflict (family_id, user_id) do nothing;

  update invites set status = 'accepted' where id = inv.id;

  return inv.family_id;
end;
$$;

-- ============================================================
-- RPC: join_with_pin
-- Il client deve prima ottenere una sessione anonima con
-- supabase.auth.signInAnonymously() (auth.uid() esiste già quando questa RPC
-- viene chiamata). La funzione stessa verifica il PIN e applica rate
-- limiting: unico punto di validazione, non aggirabile chiamando altre RPC,
-- perché è l'unica via per ottenere una riga family_members con auth_type='pin'.
-- L'IP del chiamante viene letto dagli header che PostgREST espone (impostati
-- dal proxy Supabase) solo per il rate limiting, mai salvato in chiaro.
-- ============================================================
create function join_with_pin(fam_id uuid, pin text, member_display_name text)
  returns uuid
  language plpgsql security definer set search_path = public as $$
declare
  new_id         uuid;
  v_stored_hash  text;
  v_client_ip    text;
  v_ip_hash      text;
  v_recent_fails int;
  max_attempts   constant int := 5;
  attempt_window constant interval := interval '10 minutes';
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  v_client_ip := coalesce(
    (current_setting('request.headers', true)::json ->> 'x-forwarded-for'),
    'unknown'
  );
  v_ip_hash := encode(digest(v_client_ip, 'sha256'), 'hex');

  select count(*) into v_recent_fails
    from pin_login_attempts
    where pin_login_attempts.family_id = fam_id
      and pin_login_attempts.ip_hash = v_ip_hash
      and succeeded = false
      and attempted_at > now() - attempt_window;

  if v_recent_fails >= max_attempts then
    raise exception 'troppi tentativi falliti, riprova più tardi';
  end if;

  select families.pin_hash into v_stored_hash from families where id = fam_id;

  if v_stored_hash is null or crypt(pin, v_stored_hash) <> v_stored_hash then
    insert into pin_login_attempts (family_id, ip_hash, succeeded) values (fam_id, v_ip_hash, false);
    raise exception 'PIN non valido';
  end if;

  insert into pin_login_attempts (family_id, ip_hash, succeeded) values (fam_id, v_ip_hash, true);

  insert into family_members (family_id, user_id, display_name, role, auth_type)
  values (fam_id, auth.uid(), member_display_name, 'member', 'pin')
  on conflict (family_id, user_id) do update set display_name = excluded.display_name
  returning id into new_id;

  return new_id;
end;
$$;

-- ============================================================
-- RPC: set_family_pin
-- Solo owner. L'hashing avviene qui con pgcrypto (bcrypt) cosi il PIN in
-- chiaro non lascia mai il client se non in transito HTTPS verso questa RPC.
-- ============================================================
create function set_family_pin(fam_id uuid, new_pin text)
  returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not is_family_owner(fam_id) then
    raise exception 'solo il proprietario della famiglia può impostare il PIN';
  end if;
  if new_pin !~ '^[0-9]{4,8}$' then
    raise exception 'il PIN deve essere numerico, tra 4 e 8 cifre';
  end if;

  update families
    set pin_hash = crypt(new_pin, gen_salt('bf')), pin_updated_at = now()
    where id = fam_id;
end;
$$;
