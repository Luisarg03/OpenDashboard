import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Skeleton } from '@/components/ui/skeleton';
import { useRootSessions } from '@/lib/api/sessions';
import type { SessionSummary } from '@/lib/api/types';
import type { DashboardFilters } from '../types';
import { formatCurrency, toDayKey } from '../format';
import { DashboardEmpty, DashboardError } from './states';

const DAYS = 7;

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
};

/** Bucket session cost per local day over the last `days` calendar days. */
function buildDailyCost(
  sessions: SessionSummary[],
  days: number,
): { date: string; cost: number }[] {
  const today = new Date();
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.set(toDayKey(d.getTime()), 0);
  }
  for (const session of sessions) {
    const key = toDayKey(session.time_created);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + session.cost);
    }
  }
  return Array.from(buckets, ([date, cost]) => ({ date, cost }));
}

/** "2026-01-05" -> "01/05" */
function formatDateTick(value: string): string {
  return value.slice(5).replace('-', '/');
}

interface CostTimeseriesProps {
  filters: DashboardFilters;
}

export function CostTimeseries({ filters }: CostTimeseriesProps) {
  const params = useMemo(() => ({ ...filters, limit: 200 }), [filters]);
  const { data, isPending, isError, error, refetch } = useRootSessions(params);
  const chartData = useMemo(() => buildDailyCost(data?.sessions ?? [], DAYS), [data]);

  if (isPending) {
    return <Skeleton className="h-72" />;
  }

  if (isError) {
    return <DashboardError error={error} onRetry={() => void refetch()} />;
  }

  const hasCost = chartData.some((point) => point.cost > 0);

  return (
    <div data-testid="cost-timeseries" className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">Cost by day</p>
      {hasCost ? (
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={formatDateTick}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(Number(value))}
                width={56}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--muted-foreground))' }}
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(label) => formatDateTick(String(label))}
                formatter={(value) => [formatCurrency(Number(value)), 'cost']}
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="hsl(var(--status-info))"
                strokeWidth={2}
                fill="hsl(var(--status-info))"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <DashboardEmpty
          title="No data yet"
          description="Cost over time appears once sessions are recorded."
        />
      )}
    </div>
  );
}
