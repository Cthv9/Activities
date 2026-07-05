import type { FamilyBalanceRow } from '../types/database';

export function NeglectedBanner({ activity }: { activity: FamilyBalanceRow | undefined }) {
  if (!activity) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-xl border border-state-neglected/40 bg-state-neglected/10 px-4 py-3"
    >
      <span aria-hidden className="text-xl">
        ⚠️
      </span>
      <p className="text-sm text-text-primary">
        <strong>{activity.activity_name}</strong> è l'attività più trascurata al momento ({activity.share_pct}%
        contro un ideale del {activity.ideal_pct}%).
      </p>
    </div>
  );
}
