import { supabase } from './supabase';

/** Invia un magic link Supabase Auth all'indirizzo indicato. L'utente torna
 * sull'app già autenticato quando clicca il link (redirectTo preserva i
 * query string, così possiamo far proseguire il flusso di onboarding/invito
 * esattamente da dove si era interrotto). */
export async function sendMagicLink(email: string, redirectTo: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

/** Crea una nuova famiglia con l'utente corrente (già autenticato via magic
 * link) come owner. */
export async function createFamily(familyName: string, displayName: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_family', {
    family_name: familyName,
    creator_display_name: displayName,
  });
  if (error) throw error;
  return data as string;
}

/** Consuma un token di invito valido per l'utente correntemente autenticato. */
export async function acceptInvite(token: string, displayName: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_invite', {
    invite_token: token,
    member_display_name: displayName,
  });
  if (error) throw error;
  return data as string;
}

/** Accesso con PIN condiviso: crea prima una sessione anonima (se non già
 * presente), poi verifica il PIN e crea la membership lato database in
 * un'unica RPC atomica (vedi join_with_pin nella migration). */
export async function joinWithPin(familyId: string, pin: string, displayName: string): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    const { error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) throw anonError;
  }

  const { data, error } = await supabase.rpc('join_with_pin', {
    fam_id: familyId,
    pin,
    member_display_name: displayName,
  });
  if (error) throw error;
  return data as string;
}
