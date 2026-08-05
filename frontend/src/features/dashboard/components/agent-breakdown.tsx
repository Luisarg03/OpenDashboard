import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarList, Card, Title } from '@tremor/react';

import { Skeleton } from '@/components/ui/skeleton';
import { useRootSessions } from '@/lib/api/sessions';
import type { SessionSummary } from '@/lib/api/types';
import { getAgentColor } from '@/features/session/lib/agent-colors';
import type { DashboardFilters } from '../types';
import { formatNumber } from '../format';
import { DashboardEmpty, DashboardError } from './states';

const TOP_N = 5;

/** Map agent color family to Tremor color prop. */
const TREMOR_COLOR_MAP: Record<string, string> = {
  'bg-blue-500': 'blue',
  'bg-purple-500': 'purple',
  'bg-emerald-500': 'emerald',
  'bg-amber-500': 'amber',
  'bg-rose-500': 'rose',
  'bg-cyan-500': 'cyan',
  'bg-indigo-500': 'indigo',
  'bg-teal-500': 'teal',
  'bg-pink-500': 'pink',
  'bg-orange-500': 'orange',
  'bg-slate-500': 'slate',
};

/** Count sessions per agent and return the top `topN` by volume. */
function countByAgent(sessions: SessionSummary[], topN: number): { name: string; value: number; color: string }[] {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    counts.set(session.agent, (counts.get(session.agent) ?? 0) + 1);
  }
  return Array.from(counts, ([name, value]) => {
    const agentColor = getAgentColor(name);
    const tremorColor = TREMOR_COLOR_MAP[agentColor.dot] ?? 'slate';
    return { name, value, color: tremorColor };
  })
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

interface AgentBreakdownProps {
  filters: DashboardFilters;
}

export function AgentBreakdown({ filters }: AgentBreakdownProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => ({ ...filters, limit: 200 }), [filters]);
  const { data, isPending, isError, error, refetch } = useRootSessions(params);
  const items = useMemo(() => countByAgent(data?.sessions ?? [], TOP_N), [data]);

  const handleSelect = (item: { name: string }) => {
    const next = new URLSearchParams(searchParams);
    if (item.name) {
      next.set('agent', item.name);
    } else {
      next.delete('agent');
    }
    setSearchParams(next);
  };

  if (isPending) {
    return <Skeleton className="h-72" />;
  }

  if (isError) {
    return <DashboardError error={error} onRetry={() => void refetch()} />;
  }

  return (
    <Card data-testid="agent-breakdown" className="bg-card text-card-foreground ring-border">
      <Title>Sessions by agent</Title>
      {items.length === 0 ? (
        <DashboardEmpty
          title="No data yet"
          description="Agent distribution appears once sessions are recorded."
        />
      ) : (
        <BarList
          className="mt-4"
          data={items}
          sortOrder="none"
          valueFormatter={formatNumber}
          onValueChange={handleSelect}
        />
      )}
    </Card>
  );
}
