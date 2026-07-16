import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createFamily } from '../lib/authFlows';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';

/** Crea un nuovo spazio (Casa, Lavoro, …) per l'utente già autenticato e lo
 * rende quello attivo. Riusa la RPC create_family. */
export function NewSpaceDialog({ onClose }: { onClose: () => void }) {
  const { activeMember, refreshMemberships, setActiveSpace } = useAuth();
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState(activeMember?.display_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const newId = await createFamily(name.trim(), displayName.trim());
      await refreshMemberships();
      setActiveSpace(newId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creazione non riuscita.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-space-title"
      onClick={onClose}
    >
      <div
        className="glass-strong w-full max-w-sm rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="new-space-title" className="font-display text-xl">
          Nuovo spazio
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Uno spazio è una dashboard a sé: attività, radar e membri separati (es. Casa, Lavoro, Palestra).
        </p>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <TextField
            label="Nome dello spazio"
            required
            autoFocus
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Palestra"
          />
          <TextField
            label="Il tuo nome in questo spazio"
            required
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" loading={submitting}>
              Crea spazio
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
