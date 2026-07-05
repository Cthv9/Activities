import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DailyPoint } from '../hooks/useActivityDetail';
import type { ActivityType } from '../types/database';

interface ActivityTimeSeriesProps {
  data: DailyPoint[];
  type: ActivityType;
}

export function ActivityTimeSeries({ data, type }: ActivityTimeSeriesProps) {
  if (data.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-text-secondary">
        Nessuna registrazione in questa finestra temporale.
      </p>
    );
  }

  const dataKey = type === 'checkin' ? 'count' : 'quantity';

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => format(parseISO(d), 'd MMM', { locale: it })}
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
          />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
          <Tooltip
            labelFormatter={(d) => (typeof d === 'string' ? format(parseISO(d), 'd MMMM yyyy', { locale: it }) : '')}
            contentStyle={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 8,
              color: 'var(--color-text-primary)',
            }}
          />
          <Bar dataKey={dataKey} fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
