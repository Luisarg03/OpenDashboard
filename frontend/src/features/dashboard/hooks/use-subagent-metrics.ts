import { useQueries } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { useRootSessions } from '@/lib/api/sessions';
import type { DelegationNode, TraceSummary, TreeNode } from '@/lib/api/types';
import type { DashboardFilters } from '../types';
import { aggregateSubagents, type SubagentMap } from '../lib/subagent-aggregate';

export interface UseSubagentMetricsResult {
  data: SubagentMap | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

const LIMIT = 50;

/**
 * Fire one chain fetch per root session (capped at 50) and aggregate the
 * results into per-sub-agent totals. Chain queries reuse the same query keys
 * as `useSessionChain`, so TanStack Query dedupes the fetches across the two
 * cards and across dashboard re-renders.
 */
export function useSubagentMetrics(filters: DashboardFilters): UseSubagentMetricsResult {
  const rootQuery = useRootSessions({ ...filters, limit: LIMIT });
  const sessions = rootQuery.data?.sessions ?? [];

  const chainQueries = useQueries({
    queries: sessions.map((session) => ({
      queryKey: ['session', session.id, 'chain'],
      queryFn: () =>
        api<{ chain: DelegationNode[]; tree: TreeNode[]; summary: TraceSummary }>(
          `/api/sessions/${session.id}/chain`,
        ),
    })),
  });

  const isPending = rootQuery.isPending || chainQueries.some((query) => query.isPending);
  const chainError = chainQueries.find((query) => query.isError)?.error;
  const isError = rootQuery.isError || Boolean(chainError);
  const error = rootQuery.error ?? chainError ?? null;

  const data: SubagentMap | undefined = chainQueries.every((query) => query.isSuccess)
    ? aggregateSubagents(
        chainQueries.map((query, index) => ({
          sessionId: sessions[index].id,
          chain: query.data?.chain ?? [],
        })),
      )
    : undefined;

  const refetch = () => {
    void rootQuery.refetch();
    for (const query of chainQueries) {
      void query.refetch();
    }
  };

  return { data, isPending, isError, error, refetch };
}
