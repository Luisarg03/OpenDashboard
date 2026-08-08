# Design: Add Timeline Scrubber to the Session View

## Context

The cascade layout (shipped in `fix-16`) renders the delegation chain as a React Flow graph with a dagre layout, but it shows only the **final state**: all nodes at once, no sense of how the session grew. The existing `TimelineSlider` lives inside the graph and only filters visibility — it does not communicate temporal order. The user asked for a hybrid "timeline scrubber + cascade" (Option D): a horizontal timeline above the graph with a dot per node at its `time_created`, a draggable cutoff that filters the cascade below, inline stats, and optional auto-play.

The backend needs no changes: `DelegationNode` already carries `time_created` (epoch ms), `agent`, and `parent_id`. This is a pure frontend capability on top of the existing stack (React 19, React Flow 12, `motion`, shadcn/ui, TanStack Query, Tailwind 4). No new dependencies.

## Goals / Non-Goals

**Goals**
- Horizontal `TimelineScrubber` above the graph: one dot per node at its `time_created`, colored by agent, draggable cutoff handle.
- Auto-play with play/pause/reset and speed 0.5x/1x/2x, animating the cutoff across the session duration (~10s at 1x).
- Inline stats: "N/M nodes shown", "Up to HH:MM", "Total duration Xm Ys".
- Deep-linkable cutoff via `?cutoff=<ms>` URL param.
- Smooth node enter/exit in the cascade graph as the cutoff moves (`AnimatePresence` + `layout`).
- Live tail (SSE) keeps merging nodes into the chain without breaking the cutoff model.

**Non-Goals**
- Comparing multiple sessions side by side.
- Multi-session timeline views.
- SVG/PNG export of the graph or timeline.
- Backend or schema changes of any kind.

## Decisions

### D1. Scrubber is a separate component above the graph, not inline

A new `TimelineScrubber` component renders above the cascade graph; the graph loses its internal slider. Rationale: temporal order is a session-level concern, not a graph-level one. The graph becomes a pure renderer of whatever chain it receives, which keeps `delegation-graph.tsx` simpler and makes the scrubber reusable outside the session view.

### D2. Cutoff state lives in `session-detail.tsx`; graph receives a filtered chain

`session-detail.tsx` owns `cutoff: number` and computes `filteredChain = useMemo(() => chain.filter(n => n.time_created <= cutoff), [chain, cutoff])`. `DelegationGraph` receives `filteredChain` and renders it as-is — no filter logic inside the graph. Filtering in the page keeps the graph dumb and the filter colocated with the cutoff state.

### D3. Auto-play via `motion`, not hand-rolled `requestAnimationFrame`

The existing stack already ships `motion`; driving the cutoff with Motion's animation primitives (spring/tween over a motion value, or an interval-based tween) is less code than a hand-rolled RAF loop with cleanup, and it composes with the `AnimatePresence` layout transitions on the graph. The `useCascadePlayback` hook exposes `cutoff`, `isPlaying`, `speed`, and `play`/`pause`/`reset`/`setSpeed`; it owns lifecycle cleanup (unmount clears the timer).

### D4. URL param `?cutoff=<ms>` for deep-linking

Cutoff syncs to the URL via `useSearchParams` with `replace: true` (no history spam while scrubbing). On load, if `?cutoff=<ms>` is present, the cutoff initializes from it, clamped to `[earliest, latest]`. This makes the scrubbed state refreshable and shareable on localhost with zero backend work.

### D5. Node enter/exit via `AnimatePresence` + `layout`

The graph is wrapped so filtered nodes enter and exit smoothly as the cutoff moves: `motion.div layout` on the graph container with a spring transition. React Flow already memoizes nodes; re-rendering with a smaller node set re-runs dagre layout only on that set, which is cheap for tens-to-hundreds of nodes.

### D6. Playback throttled to ~30 updates/second

Playback advances the cutoff in ~30fps steps (proportionally scaled by speed), satisfying REQ-9 (at most 30 layout recomputations per second) and keeping the graph filtering cost bounded on large chains. No extra memoization beyond React Flow's existing node memoization.

### D7. Deprecate `timeline-slider.tsx`, then remove

The old `TimelineSlider` is marked deprecated at the top of the file; after the refactor a grep for imports confirms no consumers, and the file is **deleted** (keeping a dead deprecated file is worse than removing it — git history preserves it). Its role is fully replaced by `TimelineScrubber`.

### D8. Live tail interplay

SSE-arrived nodes merge into the chain as today. A new node whose `time_created` is after the current cutoff stays hidden — the cutoff is a user-chosen view, and auto-extending it would fight the user. The scrubber shows a pulsing "new nodes arrived" indicator; clicking it extends the cutoff to include them (details in Open Questions).

## Risks / Trade-offs

- **200+ nodes saturate the timeline visually**: dots closer than ~8px overlap into an unreadable smear.
  - **Risk** → **Mitigation**: cluster detection groups nearby dots visually with a connector; hovering a cluster shows a tooltip with the node titles and timestamps.
- **Auto-play is CPU-heavy on large chains**: re-filtering and re-laying out hundreds of nodes every frame.
  - **Risk** → **Mitigation**: throttle to 30fps max (REQ-9); filter is a single `Array.filter` pass; dagre runs on the reduced node set; React Flow nodes stay memoized.
- **Long epoch-ms timestamps bloat the URL**: `?cutoff=1754324000000` is ugly and error-prone to hand-edit.
  - **Risk** → **Mitigation**: accept raw ms for correctness first; switch to base36 or a relative offset encoding if URL length becomes a real annoyance.
- **Live tail vs cutoff conflict**: a node arrives after the cutoff, so it is invisible and the user may think the session stalled.
  - **Risk** → **Mitigation**: pulsing indicator on the scrubber when new nodes are hidden by the cutoff; clicking it extends the cutoff to `latest` automatically. The user retains full control (no silent auto-extend).

## Migration Plan

Drop-in replacement. The scrubber replaces the graph-internal slider in the same release; no data migration, no backend change, no feature flags. `timeline-slider.tsx` is removed in the same change once no imports remain.

## Open Questions

- **Persist cutoff in `localStorage` too, or URL only?** URL param gives shareable/refreshable state; localStorage would also preserve the last scrubbed position across sessions. Instinct: URL only for now (YAGNI); localStorage only if users ask.
- **Live tail arrives with a new node while cutoff is mid-session — what should happen?** Instinct: leave the cutoff where the user put it and show the "new nodes hidden" indicator (D8), letting the user decide. Alternative: auto-extend the cutoff when the chain's `latest` grows. Needs a product call.
- **Dot clustering threshold**: fixed 8px or proportional to timeline width? Fixed 8px is simpler and predictable; revisit if wide screens compress real chains into clusters.
