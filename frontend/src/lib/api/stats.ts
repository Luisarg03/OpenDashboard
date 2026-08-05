import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { DashboardStats } from '@/lib/api/types';

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => api<{ stats: DashboardStats }>('/api/stats'),
    refetchInterval: 5_000,
  });
}
