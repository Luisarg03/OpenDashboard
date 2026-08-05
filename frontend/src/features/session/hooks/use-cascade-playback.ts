import { useCallback, useEffect, useRef, useState } from 'react';

export type PlaybackSpeed = 0.5 | 1 | 2;

export interface PlaybackState {
  cutoff: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
}

export interface UseCascadePlaybackOptions {
  /** Optional starting cutoff (e.g. from a URL param). Falls back to `latest`. */
  initialCutoff?: number;
  /** Upper bound for the cutoff (max `time_created` in the chain). */
  latest: number;
  /** Lower bound for the cutoff (min `time_created` in the chain). */
  earliest: number;
}

// Playback duration from earliest to latest at 1x speed (REQ-7).
const PLAYBACK_DURATION_MS = 10_000;
// At most ~30 layout updates per second during playback (REQ-9).
const FRAME_INTERVAL_MS = 33;
// Ignore frame gaps larger than this (tab refocus, background throttling);
// otherwise a single huge delta would jump the cutoff to `latest`.
const MAX_FRAME_DELTA_MS = 100;

/**
 * Drives the timeline cutoff during auto-play.
 *
 * The cutoff advances from its current value to `latest` over roughly
 * `PLAYBACK_DURATION_MS / speed` milliseconds, committing state at most
 * ~30 times per second. `pause()` freezes the value, `reset()` jumps back to
 * `earliest`, and `setSpeed()` changes the rate without restarting.
 *
 * The chain growing (SSE merges) never auto-extends the cutoff: the user's
 * chosen value is left intact (design D8). Cleanup cancels the animation
 * frame on unmount.
 */
export function useCascadePlayback({
  initialCutoff,
  latest,
  earliest,
}: UseCascadePlaybackOptions): PlaybackState & {
  setCutoff: (next: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
} {
  const [cutoff, setCutoffState] = useState(initialCutoff ?? latest);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(1);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const accRef = useRef(0);
  const cutoffRef = useRef(cutoff);

  // Keep the ref in sync so the animation loop reads the latest value without
  // depending on the `cutoff` state (which would restart the effect each tick).
  const setCutoff = useCallback((next: number) => {
    cutoffRef.current = next;
    setCutoffState(next);
  }, []);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const reset = useCallback(() => {
    setIsPlaying(false);
    setCutoff(earliest);
  }, [earliest, setCutoff]);

  const setSpeed = useCallback((next: PlaybackSpeed) => {
    setSpeedState(next);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    lastFrameRef.current = 0;
    accRef.current = 0;
    const range = latest - earliest || 1;
    const totalDuration = PLAYBACK_DURATION_MS / speed;
    const advancePerMs = range / totalDuration;

    const tick = () => {
      const now = performance.now();
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const delta = Math.min(now - lastFrameRef.current, MAX_FRAME_DELTA_MS);
      lastFrameRef.current = now;
      accRef.current += delta;

      if (accRef.current >= FRAME_INTERVAL_MS) {
        const elapsed = accRef.current;
        accRef.current = 0;
        const next = Math.min(
          cutoffRef.current + advancePerMs * elapsed,
          latest,
        );
        setCutoff(next);
        if (next >= latest) setIsPlaying(false);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, speed, latest, earliest, setCutoff]);

  return {
    cutoff,
    isPlaying,
    speed,
    setCutoff,
    setSpeed,
    play,
    pause,
    reset,
  };
}
