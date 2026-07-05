import { useOfflineSync } from '../hooks/useOfflineSync';

export function OfflineStatusBanner() {
  const { isOnline, pending, syncing } = useOfflineSync();

  if (isOnline && pending === 0) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-surface-3 px-4 py-2 text-center text-xs text-text-secondary"
    >
      {!isOnline && <span>Sei offline: i log verranno sincronizzati al ritorno della connessione.</span>}
      {isOnline && pending > 0 && (
        <span>
          {syncing
            ? 'Sincronizzazione in corso…'
            : `${pending} ${pending === 1 ? 'registrazione' : 'registrazioni'} in attesa di sincronizzazione.`}
        </span>
      )}
    </div>
  );
}
