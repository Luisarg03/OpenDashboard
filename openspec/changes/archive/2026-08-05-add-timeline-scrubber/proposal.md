# Add Timeline Scrubber to the Session View

## Why

The cascade layout shows only the final state of a session: every node rendered at once, with no sense of how the delegation chain grew over time. The timeline slider inside the graph only filters visibility; it does not convey temporal order. To understand how an OpenCode session unfolded, the user needs a horizontal timeline showing each node's position in time, plus a draggable cutoff that replays the session's growth.

## What Changes

- New `TimelineScrubber` component: a horizontal timeline rendered above the cascade graph, one color-coded dot per node positioned by `time_created`, with a draggable cutoff handle and optional auto-play (play/pause/reset, speed 0.5x/1x/2x).
- New `useCascadePlayback` hook: drives auto-play, animating the cutoff from the earliest to the latest `time_created` in roughly 10 seconds at 1x speed, throttled to ~30fps.
- New `ScrubberStats` component: inline stats ("N/M nodes shown", "Up to HH:MM", "Total duration Xm Ys").
- `session-detail.tsx` integrates the scrubber above the graph: owns the cutoff state, filters the chain (`time_created <= cutoff`), syncs `?cutoff=<ms>` to the URL for deep-linking, and wraps the graph in `AnimatePresence` for smooth node enter/exit.
- `delegation-graph.tsx` accepts an already-filtered chain and drops its internal timeline slider; graph is no longer responsible for temporal filtering.
- **BREAKING**: the internal `TimelineSlider` in the graph is removed, replaced by the external `TimelineScrubber`. `timeline-slider.tsx` is deprecated and removed once no imports remain.

## Capabilities

### New Capabilities

- `timeline-scrubber`: horizontal timeline of the session's nodes (dot per node at its `time_created`, colored by agent), a draggable cutoff that filters the cascade graph, inline stats, deep-linkable cutoff via URL, and playback controls with auto-play animation.

### Modified Capabilities

## Impact

- **Frontend only**; no backend or data-model changes. `time_created`, `agent`, and `parent_id` are already available on `DelegationNode`.
- New files: `frontend/src/features/session/components/timeline-scrubber.tsx`, `frontend/src/features/session/components/scrubber-stats.tsx`, `frontend/src/features/session/hooks/use-cascade-playback.ts`.
- Modified files: `frontend/src/pages/session-detail.tsx`, `frontend/src/features/session/components/delegation-graph.tsx`, `frontend/src/features/session/components/timeline-slider.tsx` (deprecated, then removed).
- Dependencies: none added. Uses existing stack: React 19, React Flow 12 (graph only), `motion` (auto-play + transitions), shadcn/ui primitives, TanStack Query, Tailwind 4.
- Live tail (SSE) keeps working: nodes arriving for the current session merge into the chain; a node whose `time_created` is after the current cutoff stays hidden until the user moves the cutoff (handled in design open questions).
