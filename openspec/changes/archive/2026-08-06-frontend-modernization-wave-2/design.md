## Context

Wave 1 (`frontend-modernization-wave-1`, archived 2026-08-05) shipped a clean design-token system, dark default, application shell with sidebar nav, drawer on Radix Dialog, Tremor removed, Recharts-driven dashboard charts, KPI tiles with delta + sparkline (flat-line fallback until the per-metric endpoint exists), a `DataTable` primitive for the session list, a `sonner` toast layer, and a dark-themed `@xyflow/react` graph. The `DelegationGraph` currently supports two layouts: `expanded` (the default cascade) and `aggregated` (grouped by agent). Both are vertical and read top-to-bottom as a tree. The session-detail page also has a custom timeline scrubber that filters the chain by `cutoff <= time_created`, which already supports a time-travel metaphor; the graph, however, does not animate nodes in and out as the cutoff moves.

Wave 2 closes two usability gaps that surfaced in post-Wave-1 review: the dashboard's "All agents" / "All months" header filters are weak proxies for the user's actual question (which sub-agent is expensive), and the session-detail graph's vertical cascade layout collapses the temporal story into a single growing column. Wave 2 narrows the filter row, replaces the "Sessions by agent" card with two horizontal-bar cards (tokens by sub-agent, cost by sub-agent), adds a `Timeline` layout option to the existing `Cascade` / `Aggregated` graph layout toggle, and animates the timeline scrubber with horizontal slide-in so the time-travel feels like a ladder.

The build, test, lint, and typecheck pipeline is already green (3029 modules, 42 tests, 0 errors). Wave 2 does not introduce new dependencies; it composes the existing `recharts`, `motion`, `@xyflow/react`, and `react-router-dom` primitives. The backend is read-only against the OpenCode SQLite DB and Wave 2 is strictly frontend.

## Goals / Non-Goals

**Goals**

1. **Filter row narrowed to what is useful**: search input + month selector, no agent filter. The agent filter is removed because the parent session's `agent` is almost always `orchestrator` and filtering by it surfaces zero useful sessions. Months remain because they are the only sane pagination primitive for 1k+ sessions.
2. **Sub-agent metrics front and center**: two cards (`Tokens by sub-agent`, `Cost by sub-agent`) replace the existing `Sessions by agent` card. Both render as horizontal sorted bar charts, not donuts (donuts fail at >5 categories; the codebase has 10+ agents per the agent-colors helper).
3. **Graph gains a horizontal timeline layout** as a third `viewMode` value (`timeline`) alongside the existing `expanded` and `aggregated`. The timeline layout arranges nodes by `time_created` on the X axis and groups them into lanes by `parent_id` on the Y axis. Edges curve from parent to child and may cross lanes when siblings fan out (the same convention Datadog and Grafana use for flame-graph-like views).
4. **Time-travel animation**: when the timeline-scrubber cutoff advances, the timeline layout reveals each delegation as a node that slides into view from the left (the "ladder" effect). When the cutoff retreats, nodes slide out. The animation respects `prefers-reduced-motion` per the existing Wave 1 pattern.
5. **No backend changes** in Wave 2. The sub-agent aggregate is computable from the existing `/api/sessions/{id}/chain` payload client-side. An optional dedicated endpoint is a follow-up if performance becomes a concern (logged as Open Question 1).
6. **No new dependencies.** `recharts`, `motion`, `@xyflow/react`, `@tanstack/react-query`, `@tanstack/react-table`, `cmdk` (already installed, still unused — not in Wave 2 scope) are all in the bundle.
7. **Test impact minimal**: the new layout is a pure function and is unit-tested; the animation hook is integration-tested; the new cards are smoke-tested.

**Non-Goals**

- A `Sub-agent` filter on the dashboard (a filter that narrows the session set to those in which a given sub-agent ran). Depends on a backend change to surface sub-agents in the session list response, deferred to a follow-up.
- A dedicated `/api/sessions/{id}/subagents` aggregate endpoint. Optional, deferred to a backend follow-up if client-side cost becomes noticeable. (The chain payload already has the data.)
- Cascade / Aggregated layout behavior changes. Wave 2 only adds a third option (`timeline`); the existing two are preserved.
- Per-metric time-series endpoint for the KPI sparkline (Wave 1 OQ1). Still a backend follow-up; the KPI tiles continue to use the flat-line fallback from Wave 1.
- Failure-detection predicate on `DelegationNode` (Wave 1 OQ2). Depends on a data-model extension in OpenCode.
- Global density toggle, time-range picker as a global filter, command-palette wiring (cmdk dep already installed), breadcrumbs, inspector drawer persistence, full a11y audit. All deferred to Wave 3.
- Routing changes. `/` continues to host the dashboard; `/session/:id` continues to host the session detail; `/sessions` and `/agents` remain the Wave 1 stub routes.

## Decisions

### D1. Drop the agent filter from `dashboard-filters` (BREAKING)

**Choice.** Remove the `?agent=` URL parameter handling, the `<Select>` for "All agents", and the `useAgents` query from `features/dashboard/components/dashboard-filters.tsx`. The component becomes: search input + month selector + reset. The component still owns the URL-bound filter state for the two remaining keys.

**Rationale.** The parent session's `agent` is almost always `orchestrator` (per the user's post-Wave-1 feedback and per the recon: orchestrator runs the chain; builder / fixer / librarian are children, not the parent). Filtering by `?agent=orchestrator` returns the entire set; filtering by any other value returns empty. The filter consumes a URL slot and a render slot for zero information.

**Alternatives considered.**

- Replace `?agent=parent-agent` with `?subagent=builder` (filter to sessions where builder ran). Rejected for Wave 2: requires a backend change to the session list payload. The user already decided this is a follow-up.
- Keep the agent filter but default it to "All agents" and disable it when the value is `orchestrator`. Rejected: dead UI is worse than removed UI (the Failures Only lesson from Wave 1).
- Keep the agent filter and educate the user. Rejected: the cost of the UI is not justified by the use case.

**Impact.** Anyone with a bookmarked `?agent=...` URL gets the filter ignored (the search input still works). The user reported no observed usage in Wave 1.

### D2. Sub-agent aggregate is computed client-side in Wave 2

**Choice.** Wave 2 derives the `Tokens by sub-agent` and `Cost by sub-agent` data from the existing `/api/sessions` payload. The current payload returns each session with `tokens_input`, `tokens_output`, and `cost` aggregated at the session level; a per-sub-agent breakdown requires the `/api/sessions/{id}/chain` payload, which is one fetch per session. The dashboard card is built lazily: on first render, fire one `useRootSessions()` (already in use for the KPI tiles) and one `useSessionChain()` per visible session in the active month.

**Rationale.** The existing payload has all the data needed; the chain fetch is already a single round-trip and is cached by TanStack Query. The dashboard renders at most 50 sessions per page (per the existing pagination), so the chain fetch fan-out is bounded.

**Alternatives considered.**

- A dedicated `/api/sessions/{id}/subagents` endpoint. Deferred to Open Question 1. The endpoint would be a pure read of the existing delegation table; no schema change. Worth doing if the chain fan-out proves too chatty in practice (>50 simultaneous fetches on the dashboard is the threshold).
- Server-side aggregation in `/api/sessions`. Rejected: changes the API contract for all clients, including the existing session list rendering.
- Computing the aggregate from `/api/stats` only (no chain fetch). Rejected: the stats endpoint returns aggregate counts, not per-session breakdowns.

**Implementation note.** The aggregate function is a pure helper in `features/dashboard/lib/subagent-aggregate.ts` (or co-located with the new card components). It accepts a list of sessions + a `chainLoader: (sessionId) => Promise<ChainPayload>` and returns a `Map<subagent, { tokens, cost, sessionCount }>`. Tests cover the empty / single / multi / error branches.

### D3. Two cards, not a toggle

**Choice.** Render two side-by-side cards (`Tokens by sub-agent`, `Cost by sub-agent`) in the existing 2-column grid that already hosts `Cost by day` and the old `Sessions by agent`. Each card has its own sort, its own skeleton, its own empty state, and its own error state. No toggle.

**Rationale.** The user explicitly preferred two cards (decision B). Showing both metrics simultaneously is more information-dense than a toggle; the cost of the toggle UI is not justified when the cards are individually small. Each card is also independently skimmable (you can read the tokens chart without losing your place in the cost chart).

**Alternatives considered.**

- One card with a `Tokens / Cost` toggle (decision A from the proposal). Rejected per the user's decision.
- One card with grouped bars (tokens and cost on the same row per agent). Rejected: the magnitudes differ too much (cost is `0.001` to `50` USD, tokens are `1k` to `10M`), so the smaller metric is unreadable. Two cards solves this by giving each its own scale.
- Stacked vertically. Rejected: the existing 2-column grid is the right horizontal real estate and matches the rest of the dashboard.

### D4. Sort by value of the active metric (tokens desc by default)

**Choice.** Each card sorts its bars by the active metric value, descending. The "active metric" is implicit per card (Tokens is active in the Tokens card; Cost is active in the Cost card). Toggling is a future concern: the two cards are not toggleable in Wave 2.

**Rationale.** Sort by value is the natural read direction (longest bar at the top, shortest at the bottom). Stable, predictable, no UI to maintain.

**Alternatives considered.**

- Alphabetical sort. Rejected: it does not surface the most expensive sub-agent first.
- User-configurable sort (click column header to toggle asc / desc). Rejected: the cards are small and a header sort UI is overkill for 5-10 bars. The data-table primitive (Wave 1) is the right place for user-configurable sort; these cards are not data tables.
- Top-N truncation (default: top 5 agents, "show more" reveals the rest). The Tremor `BarList` we replaced showed top 5; Wave 2 defaults to top 5 with a "Show all" link if more than 5 agents have non-zero values. Documented in the spec.

### D5. Timeline layout: a new `viewMode` value, not a separate component

**Choice.** Add a third `viewMode` value (`'timeline'`) to the existing `ViewMode` type in `frontend/src/features/session/components/delegation-graph.tsx`. The existing `expanded` and `aggregated` modes are preserved. The `DelegationGraph` component dispatches to a new pure function `getTimelineLayout(chain, liveIds)` in `features/session/lib/timeline-layout.ts`. The `chain-to-flow.ts` helper (which currently produces the React Flow nodes and edges from a layout result) is refactored to accept any layout shape, not just cascade.

**Rationale.** The existing `expanded` and `aggregated` modes are already dispatched through a single component; adding a third one keeps the architecture coherent. The layout functions are pure; the React Flow integration is reusable.

**Alternatives considered.**

- A separate `<TimelineGraph />` component. Rejected: it duplicates the theming, focus mode, MiniMap, and node-type setup. The Wave 1 graph-theming spec already says the same component handles all layouts.
- Replace the cascade entirely. Rejected: the cascade is the right view for "who delegated to whom" (genealogy); the timeline is the right view for "what happened in what order" (temporal). Both are useful.
- Auto-switch by chain length. Rejected per the user's decision A; the user wants the toggle.

### D6. Timeline layout algorithm

**Choice.** The timeline layout is a deterministic pure function with the following shape:

```ts
function getTimelineLayout(
  chain: DelegationNode[],
  liveIds: Set<string>,
): { nodes: Node[]; edges: Edge[] }
```

Algorithm:

1. **Sort by `time_created` ascending.** Assign each node an `order` (0, 1, 2, ...) by its position in the sorted list.
2. **Compute X position** as a function of `order` and the total chain length: `x = (order / max(1, totalNodes - 1)) * (canvasWidth - nodeWidth - 2 * padding) + padding`. This spreads nodes evenly across the available width.
3. **Assign Y lanes** by `parent_id`: each unique `parent_id` (including `null` for the root) gets a lane. The root is always lane 0. Children of the root take the next free lane. The lane assignment is a topological walk: BFS from the root, each child gets the lowest free lane at its depth. The result is that siblings share a lane and cousins do not.
4. **Edges** are the same as the cascade: a straight or curved line from `parent_id` to `id`. In the timeline layout, edges between lanes curve so the parent line lands at the child's Y. Cross-lane edges are accepted (Datadog / Grafana convention).
5. **Nodes** carry the same `data` shape as the cascade (so `delegation-node.tsx` renders identically): `{ node, isLive, isFocused, dimmed }`.

**Rationale.** This algorithm is O(n log n) in the chain length (one sort) and produces a layout where:
- The X axis is time (the user's mental model).
- The Y axis groups siblings (so a "lane" is a "delegation line" — one root + its descendants in time order).
- Edges that fan out from the same parent share a starting Y and diverge to their children's Y.

**Alternatives considered.**

- dagre or `@dagrejs/dagre` (a transitive dep of `@xyflow/react` in some setups). The package was removed from the project (per Wave 1 group 2's report: "El paquete `@dagrejs/dagre` removido por el usuario en package.json se preservó intacto"). Re-using it would re-introduce a dep; not worth it for an algorithm this simple.
- ELK (the Eclipse Layout Kernel, used by `elkjs`). Rejected: heavyweight, overkill for n ≤ 100 (the realistic max for a single session).
- A force-directed layout. Rejected: not stable under time-travel (nodes would jump around as the cutoff changes). The deterministic X-by-time approach is stable: when a new node appears, only its neighbors re-layout.

### D7. Time-travel animation: `motion/react` enter/exit with horizontal slide

**Choice.** The timeline layout's nodes use `motion.div` wrappers (already in the bundle via `motion/react`, used by Wave 1's `AnimatePresence` in `session-detail.tsx`) with `initial={{ opacity: 0, x: -40 }}`, `animate={{ opacity: 1, x: 0 }}`, and `exit={{ opacity: 0, x: 0 }}` (slide in from the left, slide out to the right when scrubbing back). The `transition` is `{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }` (the Wave 1 easing).

**Rationale.** This is the user's preferred "ladder" effect. The slide is consistent with the Wave 1 easing and the existing motion vocabulary.

**Alternatives considered.**

- Opacity fade only. Rejected: the user explicitly chose slide (decision E).
- Slide with bounce / spring. Rejected: feels playful, not professional. Wave 1 already uses a 200ms ease-out for transitions.
- No animation. Rejected: the user wants the ladder.

**Implementation note.** The `DelegationGraph` component's `styledNodes` useMemo (which adds the transition style and dim flag) is the natural place to swap to a motion-driven `data-state` attribute. The existing `transition: 'transform 200ms ease-out'` on the node (added in Wave 1) is preserved.

### D8. Reduced-motion fallback for the slide

**Choice.** When `prefers-reduced-motion: reduce` matches, the `motion.div` enter/exit uses `transition={{ duration: 0 }}` (instant in/out, no slide). The opacity transition is still applied (small visual change, no motion).

**Rationale.** The Wave 1 graph-theming spec already established this pattern (the focus-mode dim honors `prefers-reduced-motion`). Wave 2 follows the same convention.

**Alternatives considered.**

- Drop the nodes entirely (no animation, no fade). Rejected: the opacity fade is cheap and accessibility-friendly; the slide is the part that is removed.

### D9. Toolbar layout toggle reuses the existing Wave 1 button group

**Choice.** Add a third button to the existing button group in `pages/session-detail.tsx:268-318` (the row that holds `Failures Only` (removed in Wave 1) / `Aggregated` / play / reset / speed). The new button is `Timeline`, toggling `viewMode === 'timeline'`. The other two modes remain `expanded` and `aggregated` (renamed `Cascade` in the UI for clarity).

**Rationale.** The toolbar already has a clean button group with separators. Adding a third button is a 10-line change. Renaming `Aggregated` to `Cascade` (or vice versa) is a UI copy change only.

**Alternatives considered.**

- A separate `Select` for the layout. Rejected: takes more space and a select is slower to operate than a button group with three options.
- A segmented control. Rejected: the existing button group is already a segmented control; no reason to add a new one.
- Moving the toggle to the graph canvas itself (e.g. a corner button). Rejected: hides a primary control; the toolbar is the right place.

### D10. The `subagent-aggregate.ts` helper is a pure function, not a hook

**Choice.** The new sub-agent aggregate helper is a pure function that takes a list of `(sessionId, chain)` tuples and returns the per-sub-agent totals. The hook layer is a thin wrapper (`useSubagentMetrics(filters)`) that fires the chain fetches via TanStack Query and then calls the pure function. Tests cover the pure function; the hook is smoke-tested.

**Rationale.** This is the same pattern as `computeDelta` in Wave 1 group 7: extract the pure function for unit-testability, then call it from the hook. Keeps tests fast and the hook thin.

**Alternatives considered.**

- A single hook that does everything. Rejected: harder to test, harder to reuse, harder to mock in the cards' loading states.
- Computing the aggregate inside each card. Rejected: duplicates work; the two cards share the same input.

## Risks / Trade-offs

- **[R1] Sub-agent aggregate requires N chain fetches on the dashboard.** With 50 sessions per page, that's 50 simultaneous fetches on first load. TanStack Query parallelizes; the backend polls SQLite read-only; the per-fetch cost is small. Mitigation: if the dashboard load feels slow, Open Question 1 (a dedicated aggregate endpoint) is the answer. Document the perf budget in the spec.
- **[R2] Timeline layout edges may cross lanes heavily** when a parent has many children that fan out at different times. Mitigation: accept the cross (Datadog / Grafana do) and rely on the curve to make parent-child relationships readable. The MiniMap and the focus mode (Wave 1) help when the canvas is dense.
- **[R3] The horizontal layout may not be the right default for short chains** (3-4 nodes). The cascade reads better there. Mitigation: the toggle is always present; the user can switch.
- **[R4] Motion enter/exit on every node is more work than the cascade's static render.** With ≤100 nodes the cost is small; with longer chains it could matter. Mitigation: the motion is only active in `timeline` view; switching to `cascade` returns to the static render. The motion library is already in the bundle; no new dep.
- **[R5] The "By sub-agent" wording is potentially confusing** if the user reads it as "the agent that ran this session" (which is the parent agent, always `orchestrator`). Mitigation: the card title is `Tokens by sub-agent` and the empty state explains the data. Consider a tooltip on the card title.
- **[R6] Dropping the `?agent=` filter is technically a breaking change** for any URL that included it. Mitigation: the URL parameter is simply ignored; the search and month filters still work. No migration needed.
- **[R7] The animation may feel "busy"** when scrubbing quickly through the timeline. Mitigation: the slide is 200ms; fast scrubs naturally de-synchronize the animations, which produces a pleasant "wave" effect rather than a chaotic one. If it proves distracting, the duration can be shortened.
- **[R8] The sub-agent metric depends on `DelegationNode.cost`**, which is currently a per-node derived field (sum of `tokens_input * input_price + tokens_output * output_price` per the OpenCode data model). If the cost is missing or zero (e.g. a node failed before reporting tokens), the bar length is wrong. Mitigation: skip nodes with `cost === 0` from the aggregate (they have no contribution); document in the spec.
- **[R9] The wave 1 transparent-bg systemic bug is unlikely to recur** (the `@theme inline` block now uses `hsl(var(...))` everywhere), but the new cards add new surfaces (card backgrounds, bar fills). Mitigation: the design-tokens spec requires every new component to use the `bg-*` / `text-*` utilities; no raw `bg-[hsl(...)]` patterns are introduced in this wave (verified by the same rg check Wave 1 used).
- **[R10] Two new cards on the dashboard push the existing `Cost by day` chart into the same row** (the current 2-col grid becomes a 2x2 grid). The visual hierarchy is `KPI row | filters row | 2x2 (cost-by-day, tokens-by-agent | cost-by-day, cost-by-agent) | session list`. Mitigation: the cards are individually small (height ~200px each) and the layout is responsive (stacks on mobile). Document in the dashboard layout spec.

## Migration Plan

Wave 2 ships as **3 sequential, independently mergeable PRs**, each with its own screenshot diff and its own test pass. The order is chosen so the most disruptive change (timeline layout) lands after the filter and chart work, so the visual delta is measured against a stable dashboard.

1. **PR1 — Filter row narrowed + sub-agent cards** (decision D1, D2, D3, D4). `dashboard-filters.tsx` loses the agent filter; the old `agent-breakdown.tsx` is replaced by two new card components. The aggregate helper is added. Pure frontend change. No backend touched. The dashboard's visual layout shifts from 2-col (cost-by-day, sessions-by-agent) to 2x2 (cost-by-day, tokens-by-agent, cost-by-agent, with cost-by-day and tokens-by-agent in one row and cost-by-agent full-width below, or a 2x2 grid — TBD in PR1 based on the screenshot review).
2. **PR2 — Timeline layout** (decision D5, D6). New `timeline-layout.ts`. Toolbar toggle added. The graph supports three modes. No animation yet.
3. **PR3 — Time-travel animation** (decision D7, D8). Wrap the timeline nodes in `motion.div` with enter/exit. Reduced-motion fallback.

**Rollback strategy.** Each PR is independently revertable. PR1 is a visual-only change. PR2 reverts the layout toggle; the cascade and aggregated modes continue to work. PR3 reverts the animation; the layout remains. No backend, no data model, no auth surface touched.

## Open Questions

- **OQ1. Sub-agent aggregate endpoint.** Should the backend grow `/api/sessions/subagents?month=...&agent=...` as a follow-up? Current default: client-side aggregate from `/api/sessions` + per-session `/chain` fetches. Revisit if the dashboard load feels slow with >5k sessions or if the chain fan-out proves chatty. The endpoint would be a pure read of the existing delegation table, no schema change.
- **OQ2. Sub-agent filter on the session list.** A `?subagent=...` filter (different from the dropped `?agent=...` filter) would require the session list response to surface which sub-agents ran in each session. Backend change; deferred to a follow-up. If the user wants it sooner, the backend conversation is the gate.
- **OQ3. The timeline layout's Y axis lane assignment.** The current BFS-from-root lane assignment is intuitive but may produce a tall canvas for chains with deep delegation. If a session has 5 levels of nesting with many siblings at each level, the canvas height may exceed the available graph area. Mitigation: cap the Y axis at 6-8 lanes and add a vertical scrollbar within the graph container. Or scale the lane height dynamically. TBD in PR2 based on a real session with deep nesting.
- **OQ4. The new "Tokens by sub-agent" card's data freshness.** TanStack Query's `staleTime: 5_000` (set in Wave 1's `main.tsx`) means the chain payloads are considered fresh for 5 seconds. If a user pauses on the dashboard for 30 seconds, the data is stale; the current design has no "stale" indicator on these cards. Mitigation: the existing `DashboardError` state is the only feedback today; consider a "stale" badge in Wave 3 alongside the global density toggle. Out of scope for Wave 2.
- **OQ5. The motion library's `AnimatePresence` in `session-detail.tsx`** (added in Wave 1) currently wraps the entire header. The new motion nodes inside the graph are a separate `AnimatePresence` instance. Two `AnimatePresence` instances on the same page is fine but worth a perf check. Mitigation: the existing tests cover the header; the graph animation is local; if perf becomes a concern, lift the graph's `AnimatePresence` to a sibling and use `mode="popLayout"`.
