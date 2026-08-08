# Tasks: Add Timeline Scrubber to the Session View

## 1. Setup & types

- [x] 1.1 Add `PlaybackState` type (`cutoff: number`, `isPlaying: boolean`, `speed: 0.5 | 1 | 2`) in `frontend/src/features/session/hooks/use-cascade-playback.ts` (local to the hook, no `lib/api/types.ts` change unless another consumer needs it)
- [x] 1.2 Export `getAgentColor` from `frontend/src/features/session/lib/agent-colors.ts` (verify it exists from the polish work; export only if not already public)

## 2. TimelineScrubber component

- [x] 2.1 Create `frontend/src/features/session/components/timeline-scrubber.tsx`
  - Props: `chain: DelegationNode[]`, `cutoff: number`, `onChange: (ts: number) => void`
  - SVG horizontal timeline, width 100%, height ~80px
  - One dot per node at `x = (time_created - earliest) / range * width`, fill from `getAgentColor(node.agent)`
  - Draggable cutoff handle: pointer/touch events on the handle translate to a timestamp, clamped to `[earliest, latest]`
  - Tooltip on dot hover: node title + formatted timestamp
  - Cluster detection: dots closer than 8px are grouped visually with a connector; hover shows the grouped nodes' titles/timestamps
- [x] 2.2 Tests (`timeline-scrubber.test.tsx`, vitest + jsdom, no React Flow dependency): render with a chain fixture and assert one dot per node at the right x-position; simulate a drag on the handle and assert `onChange` fires with the mapped timestamp

## 3. ScrubberStats component

- [x] 3.1 Create `frontend/src/features/session/components/scrubber-stats.tsx`
  - Props: `chain: DelegationNode[]`, `cutoff: number`
  - Renders: "N/M nodes shown" (count of `time_created <= cutoff`), "Up to HH:MM" (formatted cutoff), "Total Xm Ys" (latest minus earliest)
  - Skeleton while the chain query is loading
- [x] 3.2 Tests: render with an empty chain without crashing; assert time formatting ("Up to HH:MM", "Xm Ys") matches the fixtures

## 4. useCascadePlayback hook

- [x] 4.1 Create `frontend/src/features/session/hooks/use-cascade-playback.ts`
  - State: `cutoff`, `isPlaying`, `speed` (`0.5 | 1 | 2`)
  - `play()`: advance `cutoff` from the current value to `latest`, throttled to 30fps, duration ~10s at 1x (proportional at 0.5x/2x); stop automatically at `latest`
  - `pause()`: stop advancing, keep current `cutoff`
  - `reset()`: set `cutoff` to `earliest`
  - `setSpeed(s)`: change speed while playing without restarting from `earliest`
  - Cleanup on unmount (clear interval/RAF)
  - When the chain grows (SSE merge), do NOT auto-extend the cutoff; leave the user's chosen value intact
- [x] 4.2 Tests: fake-clock test that `play()` advances `cutoff` monotonically to `latest`, `pause()` freezes it, `reset()` returns to `earliest`, and unmount clears the interval

## 5. session-detail integration

- [x] 5.1 Modify `frontend/src/pages/session-detail.tsx`
  - Add `cutoff` state: initial value from `?cutoff=` URL param (clamped to `[earliest, latest]`), falling back to `max(time_created)` of the chain
  - Replace the graph-internal `<TimelineSlider />` with `<TimelineScrubber />` + `<ScrubberStats />` + playback controls (play/pause/reset, speed select) rendered ABOVE the graph
  - `filteredChain = useMemo(() => chain.filter(n => n.time_created <= cutoff), [chain, cutoff])`
  - Pass `filteredChain` to `<DelegationGraph chain={filteredChain} liveNodes={liveNodeIds} />`
  - Drive auto-play via `useCascadePlayback(filteredChain, { initialCutoff, latest })`
  - Wrap the graph in `AnimatePresence` with `motion.div layout` for smooth node enter/exit (spring transition)
  - URL sync: `useSearchParams` — update `cutoff` param with `replace: true` on cutoff change (no reload)
- [x] 5.2 Modify `frontend/src/features/session/components/delegation-graph.tsx`
  - Remove the internal `<TimelineSlider />` (temporal filtering is no longer the graph's responsibility)
  - Graph renders only the `chain` prop it receives with the cascade layout
  - Optional: mini-badge per node with relative temporal offset ("+1m 30s")
- [x] 5.3 Deprecate `frontend/src/features/session/components/timeline-slider.tsx`
  - Add a deprecation comment at the top of the file
  - Grep for imports after the refactor; if no consumers remain, DELETE the file (git history preserves it)

## 6. URL deep-link

- [x] 6.1 Update `?cutoff=<ms>` via `setSearchParams({ cutoff: String(cutoff) }, { replace: true })` whenever the cutoff changes
- [x] 6.2 Initialize cutoff from `?cutoff=<ms>` on load, clamped to `[earliest, latest]` (invalid/out-of-range values fall back to `latest`)
- [x] 6.3 Tests: `MemoryRouter` around the session page with and without the URL param; assert the cutoff initializes from the param and that scrubbing updates it

## 7. Polish & validation

- [x] 7.1 Loading state: render a Skeleton in place of the scrubber/stats while the chain query is pending
- [x] 7.2 Empty state: when the chain has zero nodes, do not render the scrubber (preserve the existing empty state)
- [x] 7.3 Animations: `motion.div layout` with `transition={{ type: 'spring', stiffness: 300 }}` for node enter/exit as the cutoff moves
- [x] 7.4 Keyboard accessibility: the cutoff handle is focusable (`tabindex={0}`) and responds to arrow keys (left/right = +/-5% of the range)
- [x] 7.5 Visual check: root node stays stable at the top; children appear/disappear smoothly when scrubbing
- [x] 7.6 `npm run typecheck` and `npm run lint` clean
- [x] 7.7 `npm run build` clean
- [x] 7.8 Build size: bundle grows no more than ~20KB (one component + one hook; no new dependencies)
