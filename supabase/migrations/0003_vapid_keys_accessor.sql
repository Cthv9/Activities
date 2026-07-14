-- ============================================================
-- Accessor per le chiavi VAPID salvate in Vault.
-- Le chiavi vengono inserite una tantum (fuori migration, mai committate):
--   select vault.create_secret('<PUBLIC_KEY>',  'vapid_public_key');
--   select vault.create_secret('<PRIVATE_KEY>', 'vapid_private_key');
--   select vault.create_secret('mailto:<EMAIL>', 'vapid_contact_email');
--
-- Eseguibile SOLO dalla service_role (usata dalle Edge Function):
-- revoca esplicita per anon/authenticated/public, cosi nessun client
-- browser può mai leggere la chiave privata.
-- ============================================================
create function get_vapid_keys()
  returns table (public_key text, private_key text, contact_email text)
  language sql security definer set search_path = '' as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private_key'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_contact_email');
$$;

revoke all on function get_vapid_keys() from public;
revoke all on function get_vapid_keys() from anon;
revoke all on function get_vapid_keys() from authenticated;
grant execute on function get_vapid_keys() to service_role;
