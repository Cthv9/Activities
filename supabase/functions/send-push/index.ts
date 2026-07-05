// Invia una notifica di prova ai dispositivi dell'utente che chiama la
// funzione (usa il suo JWT, non la service role): rispetta le RLS, quindi
// può solo raggiungere le proprie push_subscriptions. Pensata per il
// pulsante "Invia notifica di prova" nelle Impostazioni.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendPushToAll } from '../_shared/webpush.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'missing Authorization header' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'non autenticato' }), { status: 401, headers: corsHeaders });
  }

  const { data: member } = await supabase.from('family_members').select('id').eq('user_id', user.id).maybeSingle();
  if (!member) {
    return new Response(JSON.stringify({ error: 'nessuna famiglia associata' }), {
      status: 404,
      headers: corsHeaders,
    });
  }

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('family_member_id', member.id)
    .eq('enabled', true);

  if (subsError) {
    return new Response(JSON.stringify({ error: subsError.message }), { status: 500, headers: corsHeaders });
  }
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ error: 'nessuna sottoscrizione push attiva su questo dispositivo' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { sent, staleIds } = await sendPushToAll(subs, {
    title: 'Equilibrio',
    body: 'Notifica di prova: le push funzionano su questo dispositivo.',
  });

  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds);
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
