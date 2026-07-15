import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { enqueueOfflineLog, removeQueuedLog, isOnline } from '../lib/offlineQueue';

/** Riferimento a un log appena creato, per poterlo annullare subito dopo.
 * - online: { queued: false, id } → si elimina la riga su Supabase;
 * - offline: { queued: true, localId } → si toglie dalla coda locale. */
export type LogResult = { queued: false; id: string } | { queued: true; localId: string };

/** Registra un'occorrenza per un'attività. Se offline, il log viene messo in
 * coda locale (IndexedDB) e sincronizzato al ritorno della connessione. */
export function useActivityLogs() {
  const { family, member } = useAuth();

  const logActivity = useCallback(
    async (activityId: string, value: number): Promise<LogResult> => {
      if (!family || !member) throw new Error('Nessuna famiglia attiva');

      const payload = {
        activity_id: activityId,
        family_id: family.id,
        author_member_id: member.id,
        value,
        logged_at: new Date().toISOString(),
      };

      if (!isOnline()) {
        const localId = await enqueueOfflineLog(payload);
        return { queued: true, localId };
      }

      const { data, error } = await supabase.from('activity_logs').insert(payload).select('id').single();
      if (error) {
        // Errore di rete (non un rifiuto del server): mettiamo in coda invece di perdere il log.
        if (error.message.toLowerCase().includes('fetch')) {
          const localId = await enqueueOfflineLog(payload);
          return { queued: true, localId };
        }
        throw error;
      }
      return { queued: false, id: data.id as string };
    },
    [family, member],
  );

  /** Annulla un log appena registrato (elimina la riga se online, o la toglie
   * dalla coda se era offline). */
  const undoLog = useCallback(async (result: LogResult): Promise<void> => {
    if (result.queued) {
      await removeQueuedLog(result.localId);
      return;
    }
    const { error } = await supabase.from('activity_logs').delete().eq('id', result.id);
    if (error) throw error;
  }, []);

  return { logActivity, undoLog };
}
