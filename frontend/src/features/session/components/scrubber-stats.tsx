import { useMemo } from 'react';

import type { DelegationNode } from '@/lib/api/types';

interface ScrubberStatsProps {
  chain: DelegationNode[];
  cutoff: number;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hours = Math.floor(min / 60);
  if (hours > 0) return `${hours}h ${min % 60}m`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

/**
 * Inline stats for the timeline scrubber (REQ-4): how many of the chain's
 * nodes the cutoff shows, the formatted cutoff time, and the session's total
 * duration (latest minus earliest `time_created`).
 */
export function ScrubberStats({ chain, cutoff }: ScrubberStatsProps) {
  const { shown, total, earliest, latest } = useMemo(() => {
    if (chain.length === 0) {
      return { shown: 0, total: 0, earliest: 0, latest: 0 };
    }
    const times = chain.map((node) => node.time_created);
    return {
      shown: chain.filter((node) => node.time_created <= cutoff).length,
      total: chain.length,
      earliest: Math.min(...times),
      latest: Math.max(...times),
    };
  }, [chain, cutoff]);

  if (chain.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span>
        <strong className="text-foreground">{shown}</strong>/{total} nodes
        shown
      </span>
      <span>
        Up to <strong className="text-foreground">{formatTime(cutoff)}</strong>
      </span>
      <span>
        Total{' '}
        <strong className="text-foreground">
          {formatDuration(latest - earliest)}
        </strong>
      </span>
    </div>
  );
}
