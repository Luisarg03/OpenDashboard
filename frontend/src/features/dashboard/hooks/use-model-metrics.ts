import { useRootSessions } from '@/lib/api/sessions';
import type { DashboardFilters } from '../types';
import { aggregateModels, type ModelMap } from '../lib/model-aggregate';

export interface UseModelMetricsResult {
  data: ModelMap | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

const LIMIT = 50;

/**
 * Aggregate per-model totals from the root-sessions payload. The model lives on
 * each session, so this needs no per-chain fetches (unlike `useSubagentMetrics`).
 * `data` is `undefined` while pending and an empty ModelMap once sessions load
 * with no models present.
 */
export function useModelMetrics(filters: DashboardFilters): UseModelMetricsResult {
  const query = useRootSessions({ ...filters, limit: LIMIT });

  const data: ModelMap | undefined = query.isSuccess
    ? aggregateModels(query.data?.sessions ?? [])
    : undefined;

  return {
    data,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error ?? null,
    refetch: () => void query.refetch(),
  };
}
