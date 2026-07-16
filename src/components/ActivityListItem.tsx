import { Link } from 'react-router-dom';
import type { Activity, FamilyBalanceRow } from '../types/database';
import type { LogResult } from '../hooks/useActivityLogs';
import { statusColorVar, STATUS_LABEL, tokenToVar } from '../lib/colors';
import { QuickLogControl } from './QuickLogControl';

interface ActivityListItemProps {
  activity: Activity;
  balanceRow?: FamilyBalanceRow;
  onLog: (activityId: string, value: number) => Promise<LogResult>;
  onUndo: (result: LogResult) => Promise<void>;
}

export function ActivityListItem({ activity, balanceRow, onLog, onUndo }: ActivityListItemProps) {
  return (
    <li className="glass flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
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

      <QuickLogControl activity={activity} onLog={onLog} onUndo={onUndo} />
    </li>
  );
}
