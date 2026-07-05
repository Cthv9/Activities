import webpush from 'npm:web-push@3.6.7';

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

function ensureConfigured() {
  if (configured) return;
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const contactEmail = Deno.env.get('VAPID_CONTACT_EMAIL') ?? 'mailto:admin@example.com';
  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY non configurate nei secrets della funzione');
  }
  webpush.setVapidDetails(contactEmail, publicKey, privateKey);
  configured = true;
}

/** Invia una notifica a ciascuna sottoscrizione, restituendo gli id delle
 * sottoscrizioni non più valide (endpoint scaduto/revocato: HTTP 404/410)
 * cosi il chiamante può rimuoverle dal database. */
export async function sendPushToAll(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
): Promise<{ sent: number; staleIds: string[] }> {
  ensureConfigured();
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
