import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useCascadePlayback } from './use-cascade-playback';

const FAKE_TIMERS = [
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'setImmediate',
  'clearImmediate',
  'Date',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'performance',
] as const;

const EARLIEST = 1000;
const LATEST = 5000;

function renderPlayback(initialCutoff?: number) {
  return renderHook(() =>
    useCascadePlayback({
      initialCutoff,
      earliest: EARLIEST,
      latest: LATEST,
    }),
  );
}

describe('useCascadePlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: [...FAKE_TIMERS] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes cutoff to latest when no initial value is given', () => {
    const { result } = renderPlayback();
    expect(result.current.cutoff).toBe(LATEST);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.speed).toBe(1);
  });

  it('play() advances the cutoff monotonically to latest, then stops', () => {
    const { result } = renderPlayback(EARLIEST);
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(5000));
    // Half of the 10s playback at 1x -> roughly half the 4000ms range.
    expect(result.current.cutoff).toBeGreaterThan(2000);
    expect(result.current.cutoff).toBeLessThan(4000);
    expect(result.current.isPlaying).toBe(true);

    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.cutoff).toBe(LATEST);
    expect(result.current.isPlaying).toBe(false);
  });

  it('pause() freezes the cutoff', () => {
    const { result } = renderPlayback(EARLIEST);
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(2000));
    const frozen = result.current.cutoff;
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.cutoff).toBe(frozen);
    expect(result.current.isPlaying).toBe(false);
  });

  it('reset() jumps back to earliest and stays frozen', () => {
    const { result } = renderPlayback(EARLIEST);
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.reset());
    expect(result.current.cutoff).toBe(EARLIEST);
    expect(result.current.isPlaying).toBe(false);
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.cutoff).toBe(EARLIEST);
  });

  it('setSpeed() changes the rate without restarting from earliest', () => {
    const { result } = renderPlayback(EARLIEST);
    act(() => result.current.setSpeed(2));
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(2500));
    // 2x: the 4000ms range plays in 5s -> ~2000ms advance.
    expect(result.current.cutoff).toBeGreaterThan(2500);
    expect(result.current.speed).toBe(2);
  });

  it('setCutoff() updates the value used by the animation loop', () => {
    const { result } = renderPlayback(EARLIEST);
    act(() => result.current.setCutoff(3000));
    expect(result.current.cutoff).toBe(3000);
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.cutoff).toBeGreaterThan(3000);
  });

  it('clears the animation frame on unmount', () => {
    const { result, unmount } = renderPlayback(EARLIEST);
    act(() => result.current.play());
    unmount();
    expect(() => act(() => vi.advanceTimersByTime(5000))).not.toThrow();
  });
});
