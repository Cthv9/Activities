import { createClient } from 'npm:@supabase/supabase-js@2';

/** Client con service_role key: bypassa le RLS, da usare solo lato Edge
 * Function (mai esposto al browser). Le variabili SUPABASE_URL e
 * SUPABASE_SERVICE_ROLE_KEY sono iniettate automaticamente da Supabase in
 * ogni Edge Function, non vanno impostate manualmente. */
export function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non disponibili nell\'ambiente della funzione');
  }
  return createClient(url, serviceRoleKey);
}
