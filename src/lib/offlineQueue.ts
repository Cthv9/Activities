import { get, set } from 'idb-keyval';
import { supabase } from './supabase';

const QUEUE_KEY = 'equilibrio-offline-log-queue';
const QUEUE_CHANGED_EVENT = 'equilibrio-offline-queue-changed';

function notifyQueueChanged(): void {
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
}

export function onQueueChanged(listener: () => void): () => void {
  window.addEventListener(QUEUE_CHANGED_EVENT, listener);
  return () => window.removeEventListener(QUEUE_CHANGED_EVENT, listener);
}

export interface QueuedLog {
  localId: string;
  activity_id: string;
  family_id: string;
  author_member_id: string;
  value: number;
  logged_at: string;
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

async function readQueue(): Promise<QueuedLog[]> {
  return (await get<QueuedLog[]>(QUEUE_KEY)) ?? [];
}

async function writeQueue(queue: QueuedLog[]): Promise<void> {
  await set(QUEUE_KEY, queue);
}

export async function enqueueOfflineLog(payload: Omit<QueuedLog, 'localId'>): Promise<void> {
  const queue = await readQueue();
  queue.push({ localId: crypto.randomUUID(), ...payload });
  await writeQueue(queue);
  notifyQueueChanged();
}

export async function getQueuedLogs(): Promise<QueuedLog[]> {
  return readQueue();
}

export async function queueLength(): Promise<number> {
  return (await readQueue()).length;
}

/** Svuota la coda locale inviando ogni log a Supabase. "Ultimo scritto
 * vince": non c'è merge di conflitti, ogni log è un insert indipendente
 * quindi non esistono conflitti di scrittura concorrente da risolvere. */
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (!isOnline()) return { synced: 0, failed: 0 };

  const queue = await readQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  const remaining: QueuedLog[] = [];
  let synced = 0;

  for (const item of queue) {
    const { localId, ...payload } = item;
    const { error } = await supabase.from('activity_logs').insert(payload);
    if (error) {
      remaining.push(item);
    } else {
      synced++;
    }
    void localId;
  }

  await writeQueue(remaining);
  if (synced > 0) notifyQueueChanged();
  return { synced, failed: remaining.length };
}
