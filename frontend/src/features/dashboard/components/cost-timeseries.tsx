import { useMemo } from 'react';
import { AreaChart, Card, Title } from '@tremor/react';

import { Skeleton } from '@/components/ui/skeleton';
import { useRootSessions } from '@/lib/api/sessions';
import type { SessionSummary } from '@/lib/api/types';
import type { DashboardFilters } from '../types';
import { formatCurrency, toDayKey } from '../format';
import { DashboardEmpty, DashboardError } from './states';

const DAYS = 7;

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
    <Card data-testid="cost-timeseries" className="bg-card text-card-foreground ring-border">
      <Title>Cost by day</Title>
      {hasCost ? (
        <AreaChart
          className="mt-4 h-72"
          data={chartData}
          index="date"
          categories={['cost']}
          colors={['indigo']}
          valueFormatter={formatCurrency}
          showLegend={false}
          showGridLines={false}
          autoMinValue
        />
      ) : (
        <DashboardEmpty
          title="No data yet"
          description="Cost over time appears once sessions are recorded."
        />
      )}
    </Card>
  );
}
