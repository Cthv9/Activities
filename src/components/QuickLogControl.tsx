import { useState, type FormEvent } from 'react';
import type { Activity } from '../types/database';
import { Button } from './ui/Button';

interface QuickLogControlProps {
  activity: Activity;
  onLog: (activityId: string, value: number) => Promise<unknown>;
}

export function QuickLogControl({ activity, onLog }: QuickLogControlProps) {
  const [quantityValue, setQuantityValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function flashSuccess() {
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 1500);
  }

  async function handleCheckin() {
    setError(null);
    setSubmitting(true);
    try {
      await onLog(activity.id, 1);
      flashSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrazione non riuscita.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuantitySubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number(quantityValue.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Inserisci un numero maggiore di zero.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onLog(activity.id, parsed);
      setQuantityValue('');
      flashSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrazione non riuscita.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
      {justLogged && (
        <span className="text-sm text-state-ok" aria-live="polite">
          ✓ registrato
        </span>
      )}
      {activity.type === 'checkin' ? (
        <Button variant="secondary" onClick={handleCheckin} loading={submitting}>
          Registra
        </Button>
      ) : (
        <form onSubmit={handleQuantitySubmit} className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={quantityValue}
            onChange={(e) => setQuantityValue(e.target.value)}
            placeholder={activity.unit ?? ''}
            aria-label={`Quantità per ${activity.name} (${activity.unit})`}
            className="w-24 rounded-lg border border-border-strong bg-surface-2 px-2.5 py-2 text-sm text-text-primary"
          />
          <Button type="submit" variant="secondary" loading={submitting}>
            OK
          </Button>
        </form>
      )}
    </div>
  );
}
