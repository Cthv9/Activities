import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useActivityDetail } from '../hooks/useActivityDetail';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { presetToWindow, customWindow, type TimeWindow } from '../lib/timeWindow';
import { TimeWindowSelector } from '../components/TimeWindowSelector';
import { ActivityTimeSeries } from '../components/ActivityTimeSeries';
import { QuickLogControl } from '../components/QuickLogControl';
import { tokenToVar } from '../lib/colors';

export default function ActivityDetailPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(() => presetToWindow('30d'));
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const { logActivity } = useActivityLogs();

  const { activity, dailySeries, stats, memberBreakdown, loading, error } = useActivityDetail(
    activityId ?? '',
    timeWindow,
  );

  function applyCustomRange() {
    if (!customFrom || !customTo) return;
    setTimeWindow(customWindow(new Date(customFrom), new Date(`${customTo}T23:59:59`)));
  }

  if (loading && !activity) {
    return <div className="p-6 text-text-secondary">Caricamento…</div>;
  }

  if (error || !activity) {
    return (
      <div className="p-6">
        <p role="alert" className="text-danger">
          Attività non trovata o non accessibile.
        </p>
        <Link to="/" className="text-brand underline">
          Torna alla home
        </Link>
      </div>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <Link to="/" className="text-sm text-text-secondary hover:text-text-primary">
        ← Torna alla home
      </Link>

      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl"
            style={{ background: `color-mix(in srgb, ${tokenToVar(activity.color)} 25%, transparent)` }}
          >
            {activity.icon || '•'}
          </span>
          <div>
            <h1 className="font-display text-2xl">{activity.name}</h1>
            <p className="text-sm text-text-secondary">
              {activity.type === 'checkin' ? 'Check-in' : `Quantità (${activity.unit})`}
            </p>
          </div>
        </div>
        <QuickLogControl activity={activity} onLog={logActivity} />
      </header>

      <div className="flex flex-col gap-2">
        <TimeWindowSelector
          preset={timeWindow.preset}
          onChangePreset={(p) => setTimeWindow(presetToWindow(p))}
          onOpenCustom={() => setTimeWindow((w) => ({ ...w, preset: 'custom' }))}
        />
        {timeWindow.preset === 'custom' && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-xs text-text-secondary">
              Dal
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-border-strong bg-surface-1 px-2 py-1.5 text-text-primary"
              />
            </label>
            <label className="flex flex-col text-xs text-text-secondary">
              Al
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-border-strong bg-surface-1 px-2 py-1.5 text-text-primary"
              />
            </label>
            <button
              type="button"
              onClick={applyCustomRange}
              className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-text-primary hover:bg-surface-3"
            >
              Applica
            </button>
          </div>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Registrazioni" value={stats.count.toString()} />
        {activity.type === 'quantity' && (
          <StatCard label={`Totale (${activity.unit})`} value={stats.totalQuantity.toString()} />
        )}
      </section>

      <section className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
        <h2 className="mb-2 font-display text-lg">Andamento</h2>
        <ActivityTimeSeries data={dailySeries} type={activity.type} />
      </section>

      <section className="rounded-2xl border border-border-subtle bg-surface-1 p-4">
        <h2 className="mb-3 font-display text-lg">Chi ha contribuito</h2>
        {memberBreakdown.length === 0 ? (
          <p className="text-sm text-text-secondary">Nessuna registrazione in questa finestra temporale.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {memberBreakdown.map((row) => (
              <li key={row.key} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{row.label}</span>
                <span className="text-text-secondary">
                  {row.count} {row.count === 1 ? 'volta' : 'volte'}
                  {activity.type === 'quantity' && ` · ${row.quantity} ${activity.unit}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}
