import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

let configured = false;

/** Configura web-push con le chiavi VAPID. Ordine di ricerca:
 * 1. secrets della Edge Function (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY);
 * 2. Vault del progetto, letto tramite la RPC get_vapid_keys() che è
 *    eseguibile solo dalla service_role (mai dai client browser). */
async function ensureConfigured(): Promise<void> {
  if (configured) return;

  let publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  let privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  let contactEmail = Deno.env.get('VAPID_CONTACT_EMAIL');

  if (!publicKey || !privateKey) {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data, error } = await admin.rpc('get_vapid_keys').single();
    if (error || !data) {
      throw new Error('Chiavi VAPID non trovate né nei secrets né nel Vault: ' + (error?.message ?? ''));
    }
    const row = data as { public_key: string | null; private_key: string | null; contact_email: string | null };
    publicKey = row.public_key ?? undefined;
    privateKey = row.private_key ?? undefined;
    contactEmail = contactEmail ?? row.contact_email ?? undefined;
  }

  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY non configurate');
  }

  webpush.setVapidDetails(contactEmail ?? 'mailto:admin@example.com', publicKey, privateKey);
  configured = true;
}

/** Invia una notifica a ciascuna sottoscrizione, restituendo gli id delle
 * sottoscrizioni non più valide (endpoint scaduto/revocato: HTTP 404/410)
 * cosi il chiamante può rimuoverle dal database. */
export async function sendPushToAll(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
): Promise<{ sent: number; staleIds: string[] }> {
  await ensureConfigured();
  const body = JSON.stringify(payload);
  let sent = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          body,
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        }
      }
    }),
  );

  return { sent, staleIds };
}
