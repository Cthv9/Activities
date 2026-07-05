import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Activity, FamilyBalanceRow } from '../types/database';
import { statusColorVar, STATUS_LABEL, tokenToVar } from '../lib/colors';
import { Button } from './ui/Button';

interface ActivityListItemProps {
  activity: Activity;
  balanceRow?: FamilyBalanceRow;
  onLog: (activityId: string, value: number) => Promise<unknown>;
}

export function ActivityListItem({ activity, balanceRow, onLog }: ActivityListItemProps) {
  const [quantityValue, setQuantityValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function flashSuccess() {
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 1500);
  }

  async function handleCheckin() {
    setError(null);
    setSubmitting(true);
    try {
      await onLog(activity.id, 1);
      await flashSuccess();
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
      await flashSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrazione non riuscita.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-1 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
          style={{ background: `color-mix(in srgb, ${tokenToVar(activity.color)} 25%, transparent)` }}
        >
          {activity.icon || '•'}
        </span>
        <div>
          <Link to={`/activities/${activity.id}`} className="font-medium text-text-primary hover:underline">
            {activity.name}
          </Link>
          {balanceRow && (
            <p className="text-xs text-text-secondary">
              <span style={{ color: statusColorVar(balanceRow.status) }}>{STATUS_LABEL[balanceRow.status]}</span>
              {' · '}
              {balanceRow.share_pct}% (ideale {balanceRow.ideal_pct}%)
            </p>
          )}
        </div>
      </div>

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
    </li>
  );
}
