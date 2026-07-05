import { useEffect, useState, type FormEvent } from 'react';
import type { ActivityType } from '../types/database';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';

interface NewActivityDialogProps {
  onClose: () => void;
  onCreate: (input: { name: string; type: ActivityType; unit?: string | null }) => Promise<void>;
}

export function NewActivityDialog({ onClose, onCreate }: NewActivityDialogProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [name, setName] = useState('');
  const [type, setType] = useState<ActivityType>('checkin');
  const [unit, setUnit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (type === 'quantity' && !unit.trim()) {
      setError('Indica un\'unità di misura per le attività a quantità.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onCreate({ name, type, unit: type === 'quantity' ? unit : null });
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
      aria-labelledby="new-activity-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border-strong bg-surface-1 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="new-activity-title" className="font-display text-xl">
          Nuova attività
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <TextField
            label="Nome"
            required
            autoFocus
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Lettura, Corsa, Chitarra…"
          />

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-text-secondary">Tipo</legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="radio"
                  name="activity-type"
                  checked={type === 'checkin'}
                  onChange={() => setType('checkin')}
                />
                Check-in (fatto/non fatto)
              </label>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="radio"
                  name="activity-type"
                  checked={type === 'quantity'}
                  onChange={() => setType('quantity')}
                />
                Quantità
              </label>
            </div>
          </fieldset>

          {type === 'quantity' && (
            <TextField
              label="Unità di misura"
              required
              maxLength={20}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="minuti, pagine, km…"
            />
          )}

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
              Crea attività
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
