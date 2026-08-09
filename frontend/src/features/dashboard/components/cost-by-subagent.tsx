import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { DashboardFilters } from '../types';
import { formatCurrency } from '../format';
import { getAgentBarColor } from '../lib/agent-bar-color';
import { useSubagentMetrics } from '../hooks/use-subagent-metrics';
import { DashboardEmpty, DashboardError } from './states';

const TOP_N = 5;

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
};

interface CostBySubagentCardProps {
  filters: DashboardFilters;
}

export default function CostBySubagentCard({ filters }: CostBySubagentCardProps) {
  const { data, isPending, isError, error, refetch } = useSubagentMetrics(filters);
  const [showAll, setShowAll] = useState(false);

  const items = useMemo(() => {
    if (!data) return [];
    const sorted = Array.from(data, ([agent, totals]) => ({
      agent,
      value: totals.cost,
      color: getAgentBarColor(agent),
      isParent: totals.isParent,
    }))
      .filter((item) => !item.isParent)
      .sort((a, b) => b.value - a.value);
    return showAll ? sorted : sorted.slice(0, TOP_N);
  }, [data, showAll]);

  if (isPending) {
    return <Skeleton className="h-72" />;
  }

  if (isError) {
    return <DashboardError error={error} onRetry={refetch} />;
  }

  const hasMore = Boolean(data && data.size > TOP_N);

  return (
    <div data-testid="cost-by-subagent" className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">Cost by sub-agent</p>
      {items.length === 0 ? (
        <DashboardEmpty
          title="No sub-agent spend yet"
          description="Sub-agent distribution appears once delegations are recorded."
        />
      ) : (
        <>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={items}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                barCategoryGap="20%"
              >
                <XAxis
                  type="number"
                  tickFormatter={(value) => formatCurrency(Number(value))}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="agent"
                  width={140}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [formatCurrency(Number(value)), 'cost']}
                />
                <Bar dataKey="value" radius={4}>
                  <LabelList
                    dataKey="agent"
                    position="insideLeft"
                    className="fill-card-foreground font-medium"
                    fontSize={12}
                    formatter={(value: unknown) => String(value)}
                  />
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(value: unknown) => formatCurrency(Number(value))}
                    className="fill-muted-foreground"
                    fontSize={11}
                  />
                  {items.map((item) => (
                    <Cell key={item.agent} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? 'Show less' : 'Show all'}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
