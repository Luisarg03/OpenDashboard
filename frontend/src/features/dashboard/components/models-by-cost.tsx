import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ModelTags from '@/components/ui/model-tags';
import { getAgentColor } from '@/features/session/lib/agent-colors';
import type { DashboardFilters } from '../types';
import { formatCurrency } from '../format';
import { useModelMetrics } from '../hooks/use-model-metrics';
import { DashboardEmpty, DashboardError } from './states';

const TOP_N = 5;

interface ModelsByCostTableProps {
  filters: DashboardFilters;
}

export default function ModelsByCostTable({ filters }: ModelsByCostTableProps) {
  const { data, isPending, isError, error, refetch } = useModelMetrics(filters);
  const [showAll, setShowAll] = useState(false);

  const items = useMemo(() => {
    if (!data) return [];
    const sorted = Array.from(data.values()).sort((a, b) => b.cost - a.cost);
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
    <div data-testid="models-by-cost" className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">Cost by model</p>
      {items.length === 0 ? (
        <DashboardEmpty
          title="No model data yet"
          description="Model distribution appears once sessions are recorded."
        />
      ) : (
        <>
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 text-left font-medium">Model</th>
                <th className="pb-2 text-right font-medium">Sessions</th>
                <th className="pb-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.model} className="border-t border-border">
                  <td className="py-2 pr-2">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${getAgentColor(item.model).dot}`} />
                      <ModelTags model={item.modelRaw} size="xs" />
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">{item.sessions}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(item.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
