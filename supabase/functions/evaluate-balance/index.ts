// Edge Function invocata periodicamente da pg_cron (vedi commento in
// supabase/migrations/0002_notifications.sql). Per ogni famiglia valuta
// quali attività sono "trascurate" nella finestra degli ultimi 30 giorni e
// invia una notifica push ai dispositivi abilitati, con un cooldown di 24h
// per evitare di rimandare lo stesso avviso ad ogni tick.
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { sendPushToAll } from '../_shared/webpush.ts';
import { corsHeaders } from '../_shared/cors.ts';

const WINDOW_DAYS = 30;
const NOTIFICATION_COOLDOWN_HOURS = 24;

interface BalanceRow {
  activity_id: string;
  activity_name: string;
  status: 'ok' | 'neglected' | 'excess';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const from = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const cooldownCutoff = new Date(now.getTime() - NOTIFICATION_COOLDOWN_HOURS * 60 * 60 * 1000);

  const { data: families, error: familiesError } = await supabase.from('families').select('id');
  if (familiesError) {
    return new Response(JSON.stringify({ error: familiesError.message }), { status: 500 });
  }

  let notified = 0;
  let staleRemoved = 0;

  for (const family of families ?? []) {
    const { data: balance, error: balanceError } = await supabase.rpc('get_family_balance', {
      fam_id: family.id,
      from_ts: from.toISOString(),
      to_ts: now.toISOString(),
    });
    if (balanceError) continue;

    const neglected = ((balance ?? []) as BalanceRow[]).filter((r) => r.status === 'neglected');
    if (neglected.length === 0) continue;

    for (const activity of neglected) {
      const { data: existingNotif } = await supabase
        .from('neglected_notifications')
        .select('notified_at')
        .eq('family_id', family.id)
        .eq('activity_id', activity.activity_id)
        .maybeSingle();

      if (existingNotif && new Date(existingNotif.notified_at) > cooldownCutoff) {
        continue; // già avvisata di recente, aspettiamo il cooldown
      }

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth_key')
        .eq('family_id', family.id)
        .eq('enabled', true);

      if (!subs || subs.length === 0) continue;

      const { sent, staleIds } = await sendPushToAll(subs, {
        title: 'Equilibrio',
        body: `"${activity.activity_name}" è rimasta indietro rispetto alle altre attività.`,
        url: '/',
      });
      notified += sent;

      if (staleIds.length > 0) {
        await supabase.from('push_subscriptions').delete().in('id', staleIds);
        staleRemoved += staleIds.length;
      }

      await supabase
        .from('neglected_notifications')
        .upsert(
          { family_id: family.id, activity_id: activity.activity_id, notified_at: now.toISOString() },
          { onConflict: 'family_id,activity_id' },
        );
    }
  }

  return new Response(JSON.stringify({ notified, staleRemoved }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
