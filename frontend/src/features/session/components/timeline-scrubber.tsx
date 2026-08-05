import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

import type { DelegationNode } from '@/lib/api/types';
import { getAgentColor } from '@/features/session/lib/agent-colors';
import { cn } from '@/lib/utils';

interface TimelineScrubberProps {
  chain: DelegationNode[];
  cutoff: number;
  onChange: (ts: number) => void;
  /** Live (SSE) nodes hidden behind the cutoff; renders the "N new" badge. */
  hiddenLiveCount?: number;
}

const DOT_SIZE = 8;
const CLUSTER_SIZE = 12;
// Groups dots closer than 1% of the timeline width (min 8px) into one
// slightly larger marker — prevents a smear on wide screens (design open
// question: proportional, not fixed).
const CLUSTER_THRESHOLD_RATIO = 0.01;

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString();
}

/**
 * Horizontal timeline of a delegation chain: one color-coded dot per node at
 * its `time_created`, a draggable cutoff handle that filters the cascade
 * graph below, and an optional live-tail badge when SSE nodes are hidden.
 *
 * Dragging works via pointer capture on the whole track (mouse + touch),
 * plus arrow-key support for keyboard users (REQ-3, REQ-6, 7.4).
 */
export function TimelineScrubber({
  chain,
  cutoff,
  onChange,
  hiddenLiveCount = 0,
}: TimelineScrubberProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { earliest, maxTime } = useMemo(() => {
    if (chain.length === 0) return { earliest: 0, maxTime: 0 };
    const times = chain.map((node) => node.time_created);
    return { earliest: Math.min(...times), maxTime: Math.max(...times) };
  }, [chain]);

  const range = maxTime - earliest || 1;

  const xFromTs = useMemo(
    () =>
      chain.length === 1
        ? () => width / 2
        : (ts: number) => ((ts - earliest) / range) * width,
    [chain.length, width, earliest, range],
  );
  const tsFromX = useMemo(
    () =>
      chain.length === 1
        ? () => earliest
        : (x: number) => earliest + (x / width) * range,
    [chain.length, earliest, width, range],
  );

  const clusterThreshold = Math.max(8, CLUSTER_THRESHOLD_RATIO * width);

  // Greedy grouping: consecutive dots (by time) closer than the threshold
  // collapse into one slightly larger marker whose tooltip lists every node.
  const dots = useMemo(() => {
    const groups: { ids: string[]; x: number }[] = [];
    let current: DelegationNode[] = [];
    for (const node of [...chain].sort(
      (a, b) => a.time_created - b.time_created,
    )) {
      const x = xFromTs(node.time_created);
      const previous = current[current.length - 1];
      if (previous && x - xFromTs(previous.time_created) <= clusterThreshold) {
        current.push(node);
      } else {
        if (current.length > 0) {
          groups.push({
            ids: current.map((n) => n.id),
            x: xFromTs(current[0].time_created),
          });
        }
        current = [node];
      }
    }
    if (current.length > 0) {
      groups.push({
        ids: current.map((n) => n.id),
        x: xFromTs(current[0].time_created),
      });
    }
    return groups;
  }, [chain, xFromTs, clusterThreshold]);

  if (chain.length === 0) return null;

  const clampTs = (ts: number) => Math.min(Math.max(ts, earliest), maxTime);

  const updateFromClientX = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    onChange(clampTs(tsFromX(clientX - rect.left)));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
    updateFromClientX(event.clientX);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateFromClientX(event.clientX);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragging(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = range * 0.05;
    if (event.key === 'ArrowRight') onChange(clampTs(cutoff + step));
    if (event.key === 'ArrowLeft') onChange(clampTs(cutoff - step));
    if (event.key === 'Home') onChange(earliest);
    if (event.key === 'End') onChange(maxTime);
  };

  const cutoffX = xFromTs(clampTs(cutoff));

  return (
    <div
      ref={ref}
      className="relative h-20 select-none"
      role="slider"
      aria-label="Timeline: filter delegation nodes up to this time"
      aria-valuemin={earliest}
      aria-valuemax={maxTime}
      aria-valuenow={Math.round(clampTs(cutoff))}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      {/* Track */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
      {/* Played portion */}
      <div
        className="absolute left-0 top-1/2 h-px bg-primary"
        style={{ width: cutoffX }}
      />

      {/* Node markers (clusters collapse into one larger dot) */}
      {dots.map((group) => {
        const cluster = group.ids.length > 1;
        const color = getAgentColor(
          chain.find((node) => node.id === group.ids[0])?.agent ?? '',
        );
        const size = cluster ? CLUSTER_SIZE : DOT_SIZE;
        const nodes = group.ids
          .map((id) => chain.find((node) => node.id === id))
          .filter((node): node is DelegationNode => node !== undefined);
        const tooltip = nodes
          .map(
            (node) =>
              `${node.title || 'Untitled'} — ${formatTime(node.time_created)}`,
          )
          .join('\n');
        return (
          <div
            key={group.ids[0]}
            data-testid="timeline-dot"
            className={cn(
              'absolute rounded-full border',
              color.bg,
              color.border,
            )}
            style={{
              left: group.x - size / 2,
              top: 'calc(50% - 6px)',
              width: size,
              height: size,
            }}
            title={tooltip}
          />
        );
      })}

      {/* Handle */}
      <div
        className="absolute h-4 w-4 cursor-grab rounded-full border-2 border-background bg-primary shadow-md"
        style={{ left: cutoffX - 8, top: 'calc(50% - 8px)' }}
      />

      {/* Live-tail badge: new nodes hidden behind the cutoff */}
      {hiddenLiveCount > 0 && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onChange(maxTime);
          }}
          className="absolute right-0 top-0 animate-pulse rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-600"
          aria-label={`${hiddenLiveCount} new nodes hidden by the cutoff — click to show them`}
        >
          +{hiddenLiveCount} new
        </button>
      )}
    </div>
  );
}
