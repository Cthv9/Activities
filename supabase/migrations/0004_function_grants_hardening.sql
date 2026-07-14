-- ============================================================
-- Hardening dei permessi di esecuzione sulle funzioni di Equilibrio.
-- Postgres concede EXECUTE a PUBLIC di default: qui restringiamo.
-- Nota: le sessioni "anonime" di Supabase Auth (accesso PIN) usano il
-- ruolo `authenticated`, quindi revocare ad `anon` non rompe il flusso PIN.
-- ============================================================

-- Trigger function: mai richiamabile via /rest/v1/rpc da nessun client.
revoke all on function validate_activity_log() from public, anon, authenticated;

-- RPC che richiedono una sessione (auth.uid() non nullo): solo authenticated.
revoke all on function create_family(text, text) from public, anon;
revoke all on function accept_invite(text, text) from public, anon;
revoke all on function join_with_pin(uuid, text, text) from public, anon;
revoke all on function set_family_pin(uuid, text) from public, anon;
grant execute on function create_family(text, text) to authenticated;
grant execute on function accept_invite(text, text) to authenticated;
grant execute on function join_with_pin(uuid, text, text) to authenticated;
grant execute on function set_family_pin(uuid, text) to authenticated;

-- Helper usati nelle policy RLS: servono ad authenticated (le policy vengono
-- valutate coi privilegi del chiamante), mai ad anon.
revoke all on function is_family_member(uuid) from public, anon;
revoke all on function is_family_owner(uuid) from public, anon;
revoke all on function my_member_id(uuid) from public, anon;
grant execute on function is_family_member(uuid) to authenticated;
grant execute on function is_family_owner(uuid) to authenticated;
grant execute on function my_member_id(uuid) to authenticated;

-- Bilancio: usato dai client autenticati e dall'Edge Function evaluate-balance
-- (service_role), che avendo perso il default PUBLIC va riabilitata esplicitamente.
revoke all on function get_family_balance(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function get_family_balance(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function get_family_balance(uuid, timestamptz, timestamptz) to service_role;
