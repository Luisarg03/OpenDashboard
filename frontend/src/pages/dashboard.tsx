import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AgentBreakdown } from '@/features/dashboard/components/agent-breakdown';
import { CostTimeseries } from '@/features/dashboard/components/cost-timeseries';
import { DashboardFilters } from '@/features/dashboard/components/dashboard-filters';
import { KpiSection } from '@/features/dashboard/components/kpi-section';
import { SessionList } from '@/features/dashboard/components/session-list';
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
      <header className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">OpenCode delegation tracker</p>
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      </header>

      <DashboardFilters />

      <KpiSection />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CostTimeseries filters={filters} />
        <AgentBreakdown filters={filters} />
      </div>

      <SessionList filters={filters} />
    </div>
  );
}
