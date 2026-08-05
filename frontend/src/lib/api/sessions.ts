import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type {
  DelegationNode,
  SessionDetail,
  SessionSummary,
  TraceSummary,
  TreeNode,
} from '@/lib/api/types';

export interface SessionListParams {
  search?: string;
  agent?: string;
  month?: string;
  limit?: number;
}

function buildSessionsUrl(path: string, params?: SessionListParams): string {
  const search = new URLSearchParams();
  if (params?.search) search.set('search', params.search);
  if (params?.agent) search.set('agent', params.agent);
  if (params?.month) search.set('month', params.month);
  if (params?.limit) search.set('limit', String(params.limit));
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function useSessions(params?: SessionListParams) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () =>
      api<{ sessions: SessionSummary[] }>(buildSessionsUrl('/api/sessions', params)),
    refetchInterval: 30_000,
  });
}

export function useRootSessions(params?: SessionListParams) {
  return useQuery({
    queryKey: ['root-sessions', params],
    queryFn: () =>
      api<{ sessions: SessionSummary[] }>(buildSessionsUrl('/api/sessions/roots', params)),
    refetchInterval: 30_000,
  });
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => api<{ session: SessionDetail }>(`/api/sessions/${id}`),
    enabled: !!id,
  });
}

export function useSessionChain(id: string | undefined) {
  return useQuery({
    queryKey: ['session', id, 'chain'],
    queryFn: () =>
      api<{ chain: DelegationNode[]; tree: TreeNode[]; summary: TraceSummary }>(
        `/api/sessions/${id}/chain`,
      ),
    enabled: !!id,
  });
}
