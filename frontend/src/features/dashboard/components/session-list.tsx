import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRootSessions } from '@/lib/api/sessions';
import type { SessionSummary } from '@/lib/api/types';
import { getAgentColor } from '@/features/session/lib/agent-colors';
import type { DashboardFilters } from '../types';
import { formatCurrency, formatNumber, formatRelativeTime } from '../format';
import { DashboardEmpty, DashboardError } from './states';

const SessionRow = memo(function SessionRow({ session }: { session: SessionSummary }) {
  const agentColor = getAgentColor(session.agent);
  const hasDiff =
    session.summary_additions > 0 || session.summary_deletions > 0;
  const diffFiles =
    session.summary_files === 1 ? '1 file' : `${session.summary_files} files`;

  return (
    <Link
      to={`/session/${session.id}`}
      aria-label={`Open session ${session.title}`}
      className="group block rounded-lg border border-border/60 p-4 transition-all hover:border-border hover:bg-accent/30 hover:shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium transition-colors group-hover:text-primary">
            {session.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge
              variant="secondary"
              className={`${agentColor.bg} ${agentColor.text} border-transparent`}
            >
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${agentColor.dot}`} />
              {session.agent}
            </Badge>
            {session.model && <span>{session.model}</span>}
            {session.is_archived && (
              <Badge variant="outline" className="border-border/70 text-muted-foreground">
                Archived
              </Badge>
            )}
            {session.is_compacting && (
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600">
                Compacting
              </Badge>
            )}
            {session.child_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <GitBranch className="h-3.5 w-3.5" />
                {session.child_count}{' '}
                {session.child_count === 1 ? 'delegation' : 'delegations'}
              </span>
            )}
            {session.child_count > 0 && (
              <span>
                +{formatCurrency(session.chain_cost)} · +{formatNumber(session.chain_tokens)} tok
              </span>
            )}
            {hasDiff && (
              <span>
                +{session.summary_additions} -{session.summary_deletions} · {diffFiles}
              </span>
            )}
            <span>{formatRelativeTime(session.time_created)}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-4 text-sm tabular-nums text-muted-foreground">
          <span>{formatCurrency(session.cost)}</span>
          <span>{formatNumber(session.tokens_input + session.tokens_output)} tokens</span>
        </div>
      </div>
    </Link>
  );
});

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
      {sessions.length === 0 ? (
        <DashboardEmpty
          title="No sessions match"
          description="Try adjusting the filters, or check back after a delegation run."
        />
      ) : (
        sessions.map((session) => <SessionRow key={session.id} session={session} />)
      )}
    </section>
  );
}
