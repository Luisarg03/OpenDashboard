import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Pause, Play, RotateCcw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DelegationGraph } from '@/features/session/components/delegation-graph';
import { ScrubberStats } from '@/features/session/components/scrubber-stats';
import { TimelineScrubber } from '@/features/session/components/timeline-scrubber';
import {
  SessionEmptyState,
  SessionError,
  SessionGraphSkeleton,
  SessionNotFound,
} from '@/features/session/components/session-states';
import {
  useCascadePlayback,
  type PlaybackSpeed,
} from '@/features/session/hooks/use-cascade-playback';

import { ApiError } from '@/lib/api/client';
import { useSession, useSessionChain } from '@/lib/api/sessions';
import { useSessionEvents } from '@/lib/api/stream';
import type { StreamStatus } from '@/lib/api/stream';

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

function streamStatusColor(status: StreamStatus): string {
  switch (status) {
    case 'open':
      return 'bg-emerald-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-muted-foreground/50';
  }
}

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionQuery = useSession(id);
  const chainQuery = useSessionChain(id);

  // Deep-link: read ?cutoff=<ms> once on mount (REQ-5). Missing or invalid
  // values fall back to the chain's latest; out-of-range values are clamped
  // by the reconciliation effect below (6.2).
  const [initialCutoffFromUrl] = useState(() => {
    const param = searchParams.get('cutoff');
    if (!param) return undefined;
    const ts = Number.parseInt(param, 10);
    return Number.isNaN(ts) ? undefined : ts;
  });

  // Max time_created already loaded from the chain query. Sent to the SSE
  // stream as ?since=<ms> so the first poll does not re-emit historical nodes
  // as node:new (which would render old sessions as "Running").
  const maxKnownTime = useMemo(() => {
    if (!chainQuery.data?.chain?.length) return undefined;
    return Math.max(...chainQuery.data.chain.map((node) => node.time_created));
  }, [chainQuery.data]);

  const { status, newNodes, liveNodeIds, lastTotals } = useSessionEvents(id, {
    enabled: !!id,
    knownMaxTime: maxKnownTime,
  });

  const allNodes = useMemo(() => {
    const map = new Map((chainQuery.data?.chain ?? []).map((node) => [node.id, node]));
    for (const [nodeId, node] of newNodes) map.set(nodeId, node);
    return Array.from(map.values());
  }, [chainQuery.data, newNodes]);

  const { earliest, latest } = useMemo(() => {
    if (allNodes.length === 0) return { earliest: 0, latest: 0 };
    const times = allNodes.map((node) => node.time_created);
    return { earliest: Math.min(...times), latest: Math.max(...times) };
  }, [allNodes]);

  const clampToRange = useMemo(
    () => (ts: number) => Math.min(Math.max(ts, earliest), latest),
    [earliest, latest],
  );

  const { cutoff, setCutoff, isPlaying, speed, setSpeed, play, pause, reset } =
    useCascadePlayback({
      initialCutoff: initialCutoffFromUrl,
      earliest,
      latest,
    });

  // Reconcile the cutoff with the chain's range whenever it becomes known or
  // changes (SSE merges): resolve the initial URL value (clamped; invalid or
  // out-of-range falls back to `latest`) and re-clamp if the range shrank.
  // Runs before paint so the user never sees an empty graph flash (6.2, 7.5).
  // The user's chosen cutoff is never auto-extended when new nodes arrive
  // (design D8) — that is the scrubber's live-tail badge job.
  useLayoutEffect(() => {
    if (allNodes.length === 0) return;
    const desired =
      initialCutoffFromUrl !== undefined
        ? clampToRange(initialCutoffFromUrl)
        : latest;
    if (cutoff < earliest || cutoff > latest) {
      setCutoff(desired);
    }
  }, [
    allNodes.length,
    cutoff,
    earliest,
    latest,
    initialCutoffFromUrl,
    clampToRange,
    setCutoff,
  ]);

  const filteredChain = useMemo(
    () => allNodes.filter((node) => node.time_created <= cutoff),
    [allNodes, cutoff],
  );

  // Live (SSE) nodes hidden behind the cutoff: shown as a pulsing badge on
  // the scrubber; clicking it extends the cutoff to the latest (D8).
  const hiddenLiveCount = useMemo(
    () =>
      allNodes.filter(
        (node) => liveNodeIds.has(node.id) && node.time_created > cutoff,
      ).length,
    [allNodes, liveNodeIds, cutoff],
  );

  // Deep-link the cutoff back to the URL (REQ-5, 6.1). `replace: true` so
  // scrubbing does not spam history. Skips the pre-resolution value (0)
  // until the chain range is known.
  useEffect(() => {
    if (allNodes.length === 0 || cutoff < earliest) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('cutoff', String(Math.round(cutoff)));
        return next;
      },
      { replace: true },
    );
  }, [cutoff, allNodes.length, earliest, setSearchParams]);

  if (sessionQuery.isPending) {
    return <SessionGraphSkeleton />;
  }

  if (sessionQuery.isError) {
    if (isNotFound(sessionQuery.error)) {
      return <SessionNotFound />;
    }
    return (
      <SessionError
        message={sessionQuery.error.message}
        onRetry={() => void sessionQuery.refetch()}
      />
    );
  }

  const session = sessionQuery.data.session;
  const liveCost = lastTotals?.cost ?? session.cost;
  const liveTokens =
    lastTotals !== null
      ? lastTotals.tokens_input + lastTotals.tokens_output
      : session.tokens_input + session.tokens_output;

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          <header className="flex flex-col gap-2 rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{session.title}</h1>
              <span
                className={`inline-block h-2 w-2 shrink-0 rounded-full ${streamStatusColor(status)}`}
                title={`Stream ${status}`}
                aria-label={`Stream ${status}`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{session.agent}</span>
              {session.model && <span>{session.model}</span>}
              <span>{formatDateTime(session.time_created)}</span>
              <span className="tabular-nums">${liveCost.toFixed(2)}</span>
              <span className="tabular-nums">{liveTokens.toLocaleString()} tokens</span>
            </div>
            {chainQuery.data && (
              <motion.div layout className="flex flex-wrap gap-2">
                <Badge variant="secondary">{chainQuery.data.summary.total_tasks} tasks</Badge>
                <Badge variant="secondary">
                  {chainQuery.data.summary.completed_count} completed
                </Badge>
                <Badge variant="secondary">{chainQuery.data.summary.duration_minutes} min</Badge>
              </motion.div>
            )}
          </header>
        </motion.div>
      </AnimatePresence>

      {chainQuery.isPending ? (
        <Skeleton className="h-[600px] w-full rounded-md" />
      ) : chainQuery.isError ? (
        <SessionError
          message={chainQuery.error.message}
          onRetry={() => void chainQuery.refetch()}
        />
      ) : allNodes.length === 0 ? (
        <SessionEmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ScrubberStats chain={allNodes} cutoff={cutoff} />
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={isPlaying ? pause : play}
                aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
              >
                {isPlaying ? <Pause /> : <Play />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={reset}
                aria-label="Reset playback to the start"
              >
                <RotateCcw />
              </Button>
              <select
                value={speed}
                onChange={(event) =>
                  setSpeed(Number(event.target.value) as PlaybackSpeed)
                }
                aria-label="Playback speed"
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          </div>

          <TimelineScrubber
            chain={allNodes}
            cutoff={cutoff}
            onChange={setCutoff}
            hiddenLiveCount={hiddenLiveCount}
          />

          <AnimatePresence initial={false}>
            <motion.div
              key="cascade-graph"
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              data-testid="graph-area"
              className="h-[600px] rounded-md border"
            >
              <DelegationGraph chain={filteredChain} liveNodes={liveNodeIds} />
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
