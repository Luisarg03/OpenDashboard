import { useCallback, useEffect, useRef, useState } from 'react';

import { toastError, toastSuccess } from '@/lib/toast';
import type { DelegationNode } from './types';

export type StreamStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface StreamTotals {
  cost: number;
  tokens_input: number;
  tokens_output: number;
}

export interface UseSessionEventsResult {
  status: StreamStatus;
  /** Nodes added since the stream connected (id -> node). */
  newNodes: Map<string, DelegationNode>;
  /** Ids of nodes received via node:new; treated as live/running. */
  liveNodeIds: Set<string>;
  /** Latest session:updated totals, or null until the first arrives. */
  lastTotals: StreamTotals | null;
  /** Clears newNodes + liveNodeIds (accumulated merge state). */
  reset: () => void;
}

interface NodeNewEvent {
  type: 'node:new';
  node: DelegationNode;
}

interface SessionUpdatedEvent {
  type: 'session:updated';
  session_id: string;
  totals: StreamTotals;
}

interface ErrorEvent {
  type: 'error';
  message: string;
}

type StreamEvent = NodeNewEvent | SessionUpdatedEvent | ErrorEvent;

const MAX_CONSECUTIVE_ERRORS = 3;
const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * Subscribes to the SSE stream for a session via EventSource.
 *
 * The backend (routes.py) emits `node:new`, `session:updated`, heartbeat
 * comments (`: ping`) and a named `close` event on idle-close. EventSource
 * ignores comment-only frames and only fires the named event through
 * addEventListener, so the idle close never looks like a connection error.
 *
 * Reconnection: EventSource auto-reconnects on transient errors. To bound
 * retries we additionally count consecutive onerror calls; after a few we
 * close the source (which cancels the native retry) and schedule a manual
 * reconnect with capped exponential backoff.
 *
 * `knownMaxTime` (max `time_created` the caller already loaded via the chain
 * query) is sent as `?since=<ms>` on connect. The backend starts its diff at
 * that value, so the first poll does not re-emit historical nodes as
 * node:new — which the UI would render as live/running (SSE running bug).
 * When the chain loads late, the effect re-runs and reconnects with the
 * baseline, dropping the wrongly-accumulated live ids.
 */
export function useSessionEvents(
  sessionId: string | undefined,
  options?: { enabled?: boolean; knownMaxTime?: number },
): UseSessionEventsResult {
  const enabled = options?.enabled ?? true;
  const knownMaxTime = options?.knownMaxTime;
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [newNodes, setNewNodes] = useState<Map<string, DelegationNode>>(
    new Map(),
  );
  const [liveNodeIds, setLiveNodeIds] = useState<Set<string>>(new Set());
  const [lastTotals, setLastTotals] = useState<StreamTotals | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    setNewNodes(new Map());
    setLiveNodeIds(new Set());
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId) {
      setStatus('closed');
      return;
    }

    // New session (or toggle) -> drop merge state accumulated for the old one.
    setNewNodes(new Map());
    setLiveNodeIds(new Set());
    setLastTotals(null);

    let disposed = false;
    let errorCount = 0;
    let retryTimer: number | undefined;

    const connect = () => {
      const url =
        knownMaxTime !== undefined
          ? `/api/sessions/${sessionId}/events?since=${knownMaxTime}`
          : `/api/sessions/${sessionId}/events`;
      const source = new EventSource(url);
      sourceRef.current = source;
      setStatus('connecting');

      source.onopen = () => {
        if (disposed) return;
        // Reconnected after consecutive errors -> transient success toast.
        if (errorCount > 0) toastSuccess('Live updates resumed');
        errorCount = 0;
        setStatus('open');
      };

      source.onmessage = (message) => {
        if (disposed) return;
        let event: StreamEvent;
        try {
          event = JSON.parse(message.data) as StreamEvent;
        } catch {
          console.error('Malformed SSE payload:', message.data);
          return;
        }
        switch (event.type) {
          case 'node:new':
            setNewNodes((prev) => {
              const next = new Map(prev);
              next.set(event.node.id, event.node);
              return next;
            });
            setLiveNodeIds((prev) => new Set(prev).add(event.node.id));
            break;
          case 'session:updated':
            setLastTotals(event.totals);
            break;
          case 'error':
            console.error('SSE stream error:', event.message);
            break;
        }
      };

      source.onerror = () => {
        if (disposed) return;
        errorCount += 1;
        if (errorCount > MAX_CONSECUTIVE_ERRORS) {
          setStatus('error');
          // Transient: surface as a toast, keep the page interactive.
          toastError('Live updates paused — retrying');
          // Cancel the native auto-reconnect; schedule a bounded manual retry.
          source.close();
          const delay = Math.min(
            MAX_RECONNECT_DELAY_MS,
            1000 * 2 ** errorCount,
          );
          retryTimer = window.setTimeout(connect, delay);
        }
      };

      // Server-side idle close: intentional termination, do not reconnect.
      source.addEventListener('close', () => {
        if (disposed) return;
        setStatus('closed');
        source.close();
      });
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [sessionId, enabled, knownMaxTime]);

  return { status, newNodes, liveNodeIds, lastTotals, reset };
}
