import type { FamilyBalanceRow } from '../types/database';
import { statusColorVar } from '../lib/colors';

/** Visualizzazione del bilancio quando le attività sono meno di tre: un radar
 * con 1-2 vertici degenera (un punto o una linea), quindi mostriamo barre
 * orizzontali con la tacca tratteggiata sulla quota ideale. Dalla terza
 * attività in poi si usa BalanceRadar. */
export function BalanceBars({ rows }: { rows: FamilyBalanceRow[] }) {
  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((r) => Math.max(r.share_pct, r.ideal_pct)), 10) * 1.15;

  return (
    <div className="flex flex-col gap-5 px-1 py-4" role="img" aria-label="Bilancio delle attività a barre">
      {rows.map((r) => {
        const shareW = Math.min(100, (r.share_pct / max) * 100);
        const idealX = Math.min(100, (r.ideal_pct / max) * 100);
        return (
          <div key={r.activity_id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate text-text-primary">{r.activity_name}</span>
              <span className="shrink-0 font-medium" style={{ color: statusColorVar(r.status) }}>
                {r.share_pct}%
              </span>
            </div>
            <div className="relative h-3 rounded-full" style={{ background: 'var(--color-border-subtle)' }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width]"
                style={{ width: `${shareW}%`, background: statusColorVar(r.status) }}
              />
              {/* tacca dell'ideale (equivalente della linea tratteggiata del radar) */}
              <div
                aria-hidden
                className="absolute -inset-y-1 border-l-2 border-dashed"
                style={{ left: `${idealX}%`, borderColor: 'var(--color-text-muted)' }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-text-muted">
        La tacca tratteggiata è la quota ideale. Il radar compare dalla terza attività.
      </p>
    </div>
  );
}
