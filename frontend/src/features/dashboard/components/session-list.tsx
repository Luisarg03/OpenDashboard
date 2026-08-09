import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useRootSessions } from '@/lib/api/sessions';
import type { SessionSummary } from '@/lib/api/types';
import { getAgentColor } from '@/features/session/lib/agent-colors';
import ModelTags from '@/components/ui/model-tags';
import type { DashboardFilters } from '../types';
import { formatCurrency, formatNumber, formatRelativeTime } from '../format';
import { DashboardError } from './states';

// Row metadata (delegation count, diff stats) renders as a second line under
// the title; the Status column carries the Archived / Compacting badges. A
// sub-row or hover popover would add TanStack expansion machinery for no
// layout gain at this row count.
const columns: ColumnDef<SessionSummary>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    enableColumnFilter: true,
    cell: ({ row }) => {
      const session = row.original;
      const hasDiff =
        session.summary_additions > 0 || session.summary_deletions > 0;
      const diffFiles =
        session.summary_files === 1 ? '1 file' : `${session.summary_files} files`;
      return (
        <div className="min-w-0">
          <Link
            to={`/session/${session.id}`}
            className="font-medium underline-offset-2 hover:text-primary hover:underline"
          >
            {session.title}
          </Link>
          {(hasDiff || session.child_count > 0) && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {session.child_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {session.child_count}{' '}
                  {session.child_count === 1 ? 'delegation' : 'delegations'}
                </span>
              )}
              {hasDiff && (
                <span>
                  +{session.summary_additions} -{session.summary_deletions} ·{' '}
                  {diffFiles}
                </span>
              )}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'agent',
    header: 'Agent',
    enableColumnFilter: true,
    cell: ({ row }) => {
      const agent = row.original.agent;
      const agentColor = getAgentColor(agent);
      return (
        <Badge
          variant="secondary"
          className={`${agentColor.bg} ${agentColor.text} border-transparent px-1.5 py-0 text-[10px]`}
        >
          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${agentColor.dot}`} />
          {agent}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'model',
    header: 'Model',
    cell: ({ row }) =>
      row.original.model ? (
        <ModelTags model={row.original.model} size="xs" />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'status',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }) => {
      const session = row.original;
      return (
        <div className="flex flex-wrap gap-1">
          {session.is_archived && (
            <Badge
              variant="outline"
              className="border-border/70 px-1.5 py-0 text-[10px] text-muted-foreground"
            >
              Archived
            </Badge>
          )}
          {session.is_compacting && (
            <Badge
              variant="outline"
              className="border-status-warning/40 bg-status-warning/10 px-1.5 py-0 text-[10px] text-status-warning"
            >
              Compacting
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'cost',
    header: 'Cost',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatCurrency(row.original.cost)}</span>
    ),
  },
  {
    id: 'tokens',
    accessorFn: (session) => session.tokens_input + session.tokens_output,
    header: 'Tokens',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatNumber(row.original.tokens_input + row.original.tokens_output)}
      </span>
    ),
  },
  {
    accessorKey: 'time_created',
    header: 'Time',
    cell: ({ row }) => formatRelativeTime(row.original.time_created),
  },
];

interface SessionListProps {
  filters: DashboardFilters;
}

export function SessionList({ filters }: SessionListProps) {
  const params = useMemo(() => ({ ...filters, limit: 50 }), [filters]);
  const { data, isPending, isError, error, refetch } = useRootSessions(params);

  if (isPending) {
    return (
      <section data-testid="session-list" className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </section>
    );
  }

  if (isError) {
    return <DashboardError error={error} onRetry={() => void refetch()} />;
  }

  const sessions = data?.sessions ?? [];

  return (
    <section data-testid="session-list" className="flex flex-col gap-2">
      <DataTable
        columns={columns}
        data={sessions}
        emptyTitle="No sessions match"
        emptyDescription="Try adjusting the filters, or check back after a delegation run."
        defaultDensity="compact"
      />
    </section>
  );
}
