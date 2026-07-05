import {
  RadarChart as ReRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import type { FamilyBalanceRow } from '../types/database';
import { statusColorVar } from '../lib/colors';

interface BalanceRadarProps {
  rows: FamilyBalanceRow[];
}

interface VertexDotProps {
  cx?: number;
  cy?: number;
  payload?: FamilyBalanceRow;
}

function VertexDot({ cx, cy, payload }: VertexDotProps) {
  if (cx === undefined || cy === undefined || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={statusColorVar(payload.status)}
      stroke="var(--color-surface-0)"
      strokeWidth={2}
    />
  );
}

// Asse radiale nascosto: fissa il dominio (0..maxValue) in modo che una
// famiglia con molte attività (percentuali individuali basse) non produca un
// poligono minuscolo rispetto al riquadro del grafico.
function HiddenRadiusAxis({ max }: { max: number }) {
  return <PolarRadiusAxis angle={90} domain={[0, max]} tick={false} axisLine={false} />;
}

export function BalanceRadar({ rows }: BalanceRadarProps) {
  if (rows.length === 0) return null;

  const data = rows.map((r) => ({
    activity: r.activity_name,
    share: r.share_pct,
    ideal: r.ideal_pct,
    row: r,
  }));

  const maxValue = Math.max(...data.map((d) => Math.max(d.share, d.ideal)), 10) * 1.2;

  return (
    <div className="h-80 w-full sm:h-96" role="img" aria-label="Radar dell'equilibrio delle attività">
      <ResponsiveContainer width="100%" height="100%">
        <ReRadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="var(--color-border-subtle)" />
          <PolarAngleAxis dataKey="activity" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
          <Radar
            name="Ideale"
            dataKey="ideal"
            stroke="var(--color-text-muted)"
            strokeDasharray="4 4"
            fill="none"
            isAnimationActive={false}
          />
          <Radar
            name="Quota attuale"
            dataKey="share"
            stroke="var(--color-brand)"
            fill="var(--color-brand)"
            fillOpacity={0.18}
            dot={(props: VertexDotProps) => {
              const row = (props as unknown as { payload: { row: FamilyBalanceRow } }).payload.row;
              return <VertexDot cx={props.cx} cy={props.cy} payload={row} key={row.activity_id} />;
            }}
            isAnimationActive={false}
          />
          <HiddenRadiusAxis max={maxValue} />
        </ReRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
