import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { pushSupported, urlBase64ToUint8Array } from '../lib/push';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function usePushSubscription() {
  const { family, member } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!pushSupported()) {
      setLoading(false);
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    setSubscribed(!!existing);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!family || !member) return;
    if (!pushSupported()) {
      setError('Le notifiche push non sono supportate su questo browser/dispositivo.');
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setError('Chiave VAPID pubblica non configurata (VITE_VAPID_PUBLIC_KEY).');
      return;
    }
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Permesso per le notifiche negato.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = subscription.toJSON();
      const { error: upsertError } = await supabase.from('push_subscriptions').upsert(
        {
          family_id: family.id,
          family_member_id: member.id,
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh ?? '',
          auth_key: json.keys?.auth ?? '',
          enabled: true,
        },
        { onConflict: 'endpoint' },
      );
      if (upsertError) throw upsertError;

      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Attivazione delle notifiche non riuscita.');
    }
  }, [family, member]);

  const unsubscribe = useCallback(async () => {
    setError(null);
    try {
      if (!pushSupported()) return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disattivazione delle notifiche non riuscita.');
    }
  }, []);

  const sendTestNotification = useCallback(async () => {
    setError(null);
    const { error: invokeError } = await supabase.functions.invoke('send-push', { method: 'POST' });
    if (invokeError) setError(invokeError.message);
  }, []);

  return { supported: pushSupported(), subscribed, loading, error, subscribe, unsubscribe, sendTestNotification };
}
