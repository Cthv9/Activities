import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { enqueueOfflineLog, isOnline } from '../lib/offlineQueue';

/** Registra un'occorrenza per un'attività. Se offline, il log viene messo in
 * coda locale (IndexedDB) e sincronizzato al ritorno della connessione (vedi
 * lib/offlineQueue.ts, step PWA). */
export function useActivityLogs() {
  const { family, member } = useAuth();

  const logActivity = useCallback(
    async (activityId: string, value: number) => {
      if (!family || !member) throw new Error('Nessuna famiglia attiva');

      const payload = {
        activity_id: activityId,
        family_id: family.id,
        author_member_id: member.id,
        value,
        logged_at: new Date().toISOString(),
      };

      if (!isOnline()) {
        await enqueueOfflineLog(payload);
        return { queued: true } as const;
      }

      const { error } = await supabase.from('activity_logs').insert(payload);
      if (error) {
        // Errore di rete (non un rifiuto del server): mettiamo in coda invece di perdere il log.
        if (error.message.toLowerCase().includes('fetch')) {
          await enqueueOfflineLog(payload);
          return { queued: true } as const;
        }
        throw error;
      }
      return { queued: false } as const;
    },
    [family, member],
  );

  return { logActivity };
}
