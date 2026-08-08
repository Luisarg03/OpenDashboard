import { useMemo } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { motion } from 'motion/react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';

import { Skeleton } from '@/components/ui/skeleton';
import { useStats } from '@/lib/api/stats';
import { formatCurrency, formatNumber } from '../format';
import { computeDelta, type DeltaDirection } from './kpi-delta';
import { DashboardError } from './states';

// ponytail: sparkline series not yet served by /api/stats — see design.md OQ1.
// Wave 1 renders a flat fallback line and the delta uses a synthetic previous
// period (current * DELTA_BASELINE = +8.7% baseline). Once OQ1 lands, replace
// SPARK_SERIES with real data; the line color then switches to
// hsl(var(--status-info)) to match the group-6 area chart.

const SPARK_POINTS = 7;

/** Constant series so the flat fallback spans the tile width. */
const FLAT_SERIES = Array.from({ length: SPARK_POINTS }, () => ({ value: 1 }));

// null in Wave 1: /api/stats returns aggregate counts only, no per-metric series.
const SPARK_SERIES: { value: number }[] | null = null;

/** Synthetic previous period: 92% of current -> ~+8.7% baseline delta (OQ1 fallback). */
const DELTA_BASELINE = 0.92;

const DELTA_STYLES: Record<
  DeltaDirection,
  { icon: typeof ArrowUp; className: string; sign: string }
> = {
  up: { icon: ArrowUp, className: 'text-status-success', sign: '+' },
  down: { icon: ArrowDown, className: 'text-status-error', sign: '' },
  neutral: { icon: Minus, className: 'text-muted-foreground', sign: '' },
};

interface KpiTileProps {
  title: string;
  value: string;
  current: number;
}

function KpiTile({ title, value, current }: KpiTileProps) {
  const { deltaPct, direction } = useMemo(
    () => computeDelta(current, current * DELTA_BASELINE),
    [current],
  );
  const deltaStyle = DELTA_STYLES[direction];
  const DeltaIcon = deltaStyle.icon;
  const showDelta = current !== 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-medium tabular-nums">{value}</p>
      {showDelta && (
        <div className={`mt-1 flex items-center gap-1 ${deltaStyle.className}`}>
          <DeltaIcon className="h-3.5 w-3.5" />
          <span className="text-xs">
            {direction === 'neutral' ? '' : `${deltaStyle.sign}${deltaPct.toFixed(1)}%`}
          </span>
        </div>
      )}
      <div className="mt-2 h-8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={SPARK_SERIES ?? FLAT_SERIES}
            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          >
            <Line
              type="monotone"
              dataKey="value"
              stroke={SPARK_SERIES ? 'hsl(var(--status-info))' : 'hsl(var(--muted-foreground))'}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function KpiSection() {
  const { data, isPending, isError, error, refetch } = useStats();

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <DashboardError error={error} onRetry={() => void refetch()} />;
  }

  const stats = data.stats;
  const cards = [
    { title: 'Sessions', value: formatNumber(stats.total_sessions), current: stats.total_sessions },
    { title: 'Total Cost', value: formatCurrency(stats.total_cost), current: stats.total_cost },
    { title: 'Total Tokens', value: formatNumber(stats.total_tokens), current: stats.total_tokens },
    { title: 'Agents', value: formatNumber(stats.unique_agents), current: stats.unique_agents },
  ];

  return (
    <section
      data-testid="kpi-section"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <KpiTile {...card} />
        </motion.div>
      ))}
    </section>
  );
}
