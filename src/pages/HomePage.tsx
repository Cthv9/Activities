import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useActivities } from '../hooks/useActivities';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { useBalance } from '../hooks/useBalance';
import { presetToWindow, customWindow, type TimeWindow } from '../lib/timeWindow';
import { TimeWindowSelector } from '../components/TimeWindowSelector';
import { NeglectedBanner } from '../components/NeglectedBanner';
import { BalanceBars } from '../components/BalanceBars';
import { StatusLegend } from '../components/StatusLegend';
import { ActivityListItem } from '../components/ActivityListItem';
import { NewActivityDialog } from '../components/NewActivityDialog';
import { SpaceSwitcher } from '../components/SpaceSwitcher';
import { Button } from '../components/ui/Button';

// Il radar è l'unico consumatore di recharts (~250 KB): caricato on-demand solo
// quando serve davvero (dalla terza attività). Sotto le 3 attività si mostrano
// le barre in CSS puro, quindi recharts non entra mai nel percorso di avvio.
const BalanceRadar = lazy(() =>
  import('../components/BalanceRadar').then((m) => ({ default: m.BalanceRadar })),
);

export default function HomePage() {
  const { activities, loading: activitiesLoading, error: activitiesError, createActivity } = useActivities();
  const { logActivity, undoLog } = useActivityLogs();

  const [timeWindow, setTimeWindow] = useState<TimeWindow>(() => presetToWindow('30d'));
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showNewActivity, setShowNewActivity] = useState(false);

  const { rows, loading: balanceLoading, error: balanceError, mostNeglected } = useBalance(timeWindow);

  const balanceByActivity = useMemo(() => {
    const map = new Map(rows.map((r) => [r.activity_id, r]));
    return map;
  }, [rows]);

  function applyCustomRange() {
    if (!customFrom || !customTo) return;
    setTimeWindow(customWindow(new Date(customFrom), new Date(`${customTo}T23:59:59`)));
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <SpaceSwitcher />
        <Link
          to="/settings"
          className="shrink-0 rounded-full border border-border-strong p-2 text-text-secondary hover:text-text-primary"
          aria-label="Impostazioni"
        >
          ⚙️
        </Link>
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
            <Button variant="secondary" onClick={applyCustomRange}>
              Applica
            </Button>
          </div>
        )}
      </div>

      <NeglectedBanner activity={mostNeglected} />

      {activitiesError && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Impossibile caricare le attività: {activitiesError}
        </p>
      )}

      {!activitiesLoading && activities.length === 0 ? (
        <EmptyState onCreate={() => setShowNewActivity(true)} />
      ) : (
        <>
          <section aria-label="Radar dell'equilibrio" className="glass rounded-2xl p-4">
            {balanceError ? (
              <p role="alert" className="p-8 text-center text-sm text-danger">
                Impossibile calcolare il bilancio: {balanceError}
              </p>
            ) : balanceLoading ? (
              <p className="p-8 text-center text-text-secondary">Caricamento del radar…</p>
            ) : rows.length < 3 ? (
              <BalanceBars rows={rows} />
            ) : (
              <Suspense
                fallback={<p className="p-8 text-center text-text-secondary">Caricamento del radar…</p>}
              >
                <BalanceRadar rows={rows} />
              </Suspense>
            )}
            <StatusLegend />
          </section>

          <section aria-label="Elenco attività" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">Attività</h2>
              <Button variant="secondary" onClick={() => setShowNewActivity(true)}>
                + Nuova attività
              </Button>
            </div>
            <ul className="flex flex-col gap-2">
              {activities.map((activity) => (
                <ActivityListItem
                  key={activity.id}
                  activity={activity}
                  balanceRow={balanceByActivity.get(activity.id)}
                  onLog={logActivity}
                  onUndo={undoLog}
                />
              ))}
            </ul>
          </section>
        </>
      )}

      {showNewActivity && (
        <NewActivityDialog onClose={() => setShowNewActivity(false)} onCreate={createActivity} />
      )}
    </main>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border-strong p-10 text-center">
      <p className="font-display text-xl">Il radar è ancora vuoto</p>
      <p className="max-w-sm text-sm text-text-secondary">
        Crea la prima attività di questo spazio: ogni attività aggiunge un vertice al radar dell'equilibrio.
      </p>
      <Button onClick={onCreate}>Crea la prima attività</Button>
    </div>
  );
}
