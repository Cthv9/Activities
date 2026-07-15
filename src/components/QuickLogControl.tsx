import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Activity } from '../types/database';
import type { LogResult } from '../hooks/useActivityLogs';
import { Button } from './ui/Button';

interface QuickLogControlProps {
  activity: Activity;
  onLog: (activityId: string, value: number) => Promise<LogResult>;
  onUndo: (result: LogResult) => Promise<void>;
}

const UNDO_WINDOW_MS = 6000;

export function QuickLogControl({ activity, onLog, onUndo }: QuickLogControlProps) {
  const [quantityValue, setQuantityValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<LogResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  function armUndo(result: LogResult) {
    setLastResult(result);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setLastResult(null), UNDO_WINDOW_MS);
  }

  async function submit(value: number) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await onLog(activity.id, value);
      armUndo(result);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrazione non riuscita.');
      return false;
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
    if (await submit(parsed)) setQuantityValue('');
  }

  async function handleUndo() {
    if (!lastResult) return;
    clearTimeout(undoTimer.current);
    const toUndo = lastResult;
    setLastResult(null);
    try {
      await onUndo(toUndo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Annullamento non riuscito.');
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
      {lastResult && (
        <span className="flex items-center gap-1.5 text-sm text-state-ok" aria-live="polite">
          ✓ registrato
          <button
            type="button"
            onClick={handleUndo}
            className="rounded px-1 font-medium text-text-secondary underline hover:text-text-primary"
          >
            Annulla
          </button>
        </span>
      )}
      {activity.type === 'checkin' ? (
        <Button variant="secondary" onClick={() => submit(1)} loading={submitting}>
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
