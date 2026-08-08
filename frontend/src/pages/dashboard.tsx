import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import CostBySubagentCard from '@/features/dashboard/components/cost-by-subagent';
import { CostTimeseries } from '@/features/dashboard/components/cost-timeseries';
import { DashboardFilters } from '@/features/dashboard/components/dashboard-filters';
import { KpiSection } from '@/features/dashboard/components/kpi-section';
import ModelsByCostTable from '@/features/dashboard/components/models-by-cost';
import { SessionList } from '@/features/dashboard/components/session-list';
import TokensBySubagentCard from '@/features/dashboard/components/tokens-by-subagent';
import type { DashboardFilters as Filters } from '@/features/dashboard/types';

export function DashboardPage() {
  const [searchParams] = useSearchParams();
  const filters = useMemo<Filters>(
    () => ({
      search: searchParams.get('search') || undefined,
      agent: searchParams.get('agent') || undefined,
      month: searchParams.get('month') || undefined,
    }),
    [searchParams],
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-border p-6">
        <h1 className="text-2xl font-medium tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">OpenCode delegation tracker</p>
      </header>

      <DashboardFilters />

      <KpiSection />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CostTimeseries filters={filters} />
        <TokensBySubagentCard filters={filters} />
        <CostBySubagentCard filters={filters} />
        <ModelsByCostTable filters={filters} />
      </div>

      <SessionList filters={filters} />
    </div>
  );
}
