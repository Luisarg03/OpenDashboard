# Tasks — frontend-modernization-wave-2

Each task is a single PR-bound unit of work. Tasks within a group ship together; groups ship in order. Every task ends with the listed verification passing. Three groups correspond to the three PRs in `design.md` (Migration Plan).

## 1. Filter row narrowed + sub-agent metrics cards (proposal "Drop the All agents filter", "Replace the Sessions by agent card"; design D1, D2, D3, D4; specs `dashboard-filters` + `agent-metrics`)

- [x] 1.1 In `frontend/src/features/dashboard/components/dashboard-filters.tsx`, remove the `useAgents()` import, the `agent` state, the `setFilter('agent', ...)` calls, the `Select` for "All agents", and the corresponding URL parameter handling. Keep the `search` and `month` filters, the `Reset` button, and the responsive layout. The component is ~30 lines lighter. Verify: `rg "agent" frontend/src/features/dashboard/components/dashboard-filters.tsx` returns zero matches outside the `Reset` button label and the import path (which no longer exists).
- [x] 1.2 In the same file, the `useEffect` / `useMemo` that derived the `agent` URL parameter is removed. The `hasFilters` check no longer references `searchParams.has('agent')`. Verify: `rg "\?agent=" frontend/src/features/dashboard/components/dashboard-filters.tsx` returns zero matches.
- [x] 1.3 In the same file, the legacy `?agent=` URL parameter is silently ignored (the dashboard still renders, the search and month filters still work, no warning or error is surfaced). Document this in a `// ponytail: ?agent= is ignored post Wave 2` comment near the top of the file.
- [x] 1.4 Create `frontend/src/features/dashboard/lib/subagent-aggregate.ts` (new) with a pure exported function:
  ```ts
  export interface SubagentTotals {
    tokens: number;
    cost: number;
    sessionCount: number;
  }
  export type SubagentMap = Map<string, SubagentTotals>;
  export function aggregateSubagents(
    chains: { sessionId: string; chain: DelegationNode[] }[],
  ): SubagentMap;
  ```
  Behavior: walk each chain, ignore the root node, increment `tokens` (input + output), `cost`, and `sessionCount` for each non-root node's `agent` value. Sort the result by tokens descending in the returned map (the hook layer re-sorts per the active metric). The function does NOT mutate its input.
- [x] 1.5 Add a Vitest at `frontend/src/features/dashboard/lib/subagent-aggregate.test.ts` covering the spec scenarios: empty input, single chain, root-node exclusion, multi-chain aggregation, sessionCount increment. Use a fixture with three chains that together exercise the eight branches.
- [x] 1.6 Create `frontend/src/features/dashboard/hooks/use-subagent-metrics.ts` (new) with:
  ```ts
  export function useSubagentMetrics(filters: DashboardFilters): {
    data: SubagentMap | undefined;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
  };
  ```
  The hook fires `useRootSessions(filters)` (already in the codebase) and then `useSessionChain(sessionId)` for each session in the active page (capped at 50, matching the existing `useRootSessions` limit). When all chain queries resolve, it calls `aggregateSubagents(...)` and returns the result. Errors from any chain query are surfaced as `isError`.
- [x] 1.7 Create `frontend/src/features/dashboard/components/tokens-by-subagent.tsx` (new). Component: `TokensBySubagentCard` (or similar). Renders a `ResponsiveContainer` + `BarChart` (horizontal, from Wave 1's Recharts migration) with one bar per top-5 sub-agent, sorted by tokens desc. The card uses the design tokens established in Wave 1 (`bg-card border border-border p-5`). Includes a `Skeleton` for the loading state, the `No sub-agent activity yet` empty state (from the spec), and a `Show all` affordance that toggles the top-5 → all view. The `Show all` state is local (useState) and resets on page reload.
- [x] 1.8 Create `frontend/src/features/dashboard/components/cost-by-subagent.tsx` (new). Same structure as 1.7 but for cost. The bar fill color derives from `getAgentColor(agent)` (the existing helper). The bars are sorted by cost desc.
- [x] 1.9 Remove the old `frontend/src/features/dashboard/components/agent-breakdown.tsx` (the `BarList` from the Wave 1 Recharts migration, which was the renamed-from-Tremor version). The `agent-breakdown.tsx` import in `frontend/src/pages/dashboard.tsx` is removed. Verify: `rg "agent-breakdown" frontend/src/` returns zero matches.
- [x] 1.10 In `frontend/src/pages/dashboard.tsx`, replace the import of `AgentBreakdown` (old) with imports of `TokensBySubagentCard` and `CostBySubagentCard` (new). Wire them into the existing 2-column grid that currently hosts `CostTimeseries` and the old `AgentBreakdown`. The grid becomes 2×2 (or a 1×4 row, depending on the screenshot review in PR1).
- [x] 1.11 Verify: from `frontend/`, run `npm run typecheck`, `npm run lint`, `npx vitest run`, and `npm run build`. All must pass. The vitest count increases by ~8 (the aggregate function tests). Capture a before / after screenshot of `/` in dark mode and confirm visually that the two new cards render with sensible data. Existing 42 tests stay green.

## 2. Horizontal timeline layout (proposal "Introduce a new horizontal timeline layout"; design D5, D6; spec `session-timeline-layout`)

- [x] 2.1 Create `frontend/src/features/session/lib/timeline-layout.ts` (new) with the exported function:
  ```ts
  export function getTimelineLayout(
    chain: DelegationNode[],
    liveIds: Set<string>,
  ): { nodes: LayoutNode[]; edges: LayoutEdge[] };
  ```
  Behavior (from design D6): sort by `time_created` ascending, assign X proportional to position, assign Y lanes via BFS-from-root (root is lane 0, siblings share a lane), produce one edge per parent-to-child relationship. The function is a pure, side-effect-free module that has no React / DOM dependency. It is unit-testable in isolation.
- [x] 2.2 Add a Vitest at `frontend/src/features/session/lib/timeline-layout.test.ts` covering: empty chain returns `{ nodes: [], edges: [] }`; the root is in lane 0; siblings share a lane; cousins do not; the X spacing is proportional; the function does not mutate its input; the function is deterministic (called twice with the same input → same output).
- [x] 2.3 In `frontend/src/features/session/components/delegation-graph.tsx`, extend the `ViewMode` type to include `'timeline'`:
  ```ts
  export type ViewMode = 'expanded' | 'aggregated' | 'timeline';
  ```
  Add a switch in `DelegationGraphInner` so that `viewMode === 'timeline'` dispatches to `getTimelineLayout(...)` instead of the existing `getCascadeLayout(...)` or `getAggregatedLayout(...)`. The cascade and aggregated paths are unchanged.
- [x] 2.4 In `frontend/src/features/session/lib/chain-to-flow.ts` (the helper that turns layout results into React Flow `Node[]` and `Edge[]`), confirm the new timeline layout's output shape is compatible. The layout's `{ nodes, edges }` shape should already be the contract; if the timeline layout uses a slightly different field name (e.g. `data.parentX` vs `data.x`), the chain-to-flow adapter is updated to handle both.
- [x] 2.5 In `frontend/src/pages/session-detail.tsx`, the existing button group in the toolbar (around lines 268-318) gains a third button: `Timeline`. The button group is now `Cascade | Timeline | Aggregated`. Use the same active-state styling as the existing buttons. The `viewMode` state is wired to the new button.
- [x] 2.6 Verify: from `frontend/`, run `npm run typecheck`, `npm run lint`, `npx vitest run`, and `npm run build`. All must pass. The vitest count increases by ~6 (the timeline-layout tests). Manual smoke: open a session with a chain, click `Timeline`, confirm the graph re-renders horizontally; click `Cascade`, confirm the graph re-renders vertically. Both modes are keyboard-navigable (Tab through the button group).

## 3. Time-travel animation (proposal "Animate the time-travel scrubber"; design D7, D8; spec `session-timeline-layout` + `graph-theming`)

- [x] 3.1 In `frontend/src/features/session/components/delegation-graph.tsx`, wrap the timeline-mode `ReactFlow` nodes in `motion.div` (from the `motion` package, already in the bundle from Wave 1's header animation). The motion config is:
  ```ts
  <AnimatePresence>
    {nodes.map((node) => (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* the existing node card */}
      </motion.div>
    ))}
  </AnimatePresence>
  ```
  The slide direction follows the spec: nodes slide in from the left (`x: -40 → 0`) and slide out to the right (`x: 0 → 40`).
- [x] 3.2 In the same file, add a `useEffect` that listens for `prefers-reduced-motion: reduce` via `window.matchMedia`. When it matches, the `transition.duration` is overridden to `0` (instant in/out, no slide). The opacity transition is still applied (a small visual change). The match is reactive (changing the OS setting without a reload updates the next transition).
- [x] 3.3 The animation only runs when `viewMode === 'timeline'`. The cascade and aggregated modes preserve the existing Wave 1 visibility behavior (no slide).
- [x] 3.4 Add a small Vitest that mounts a `DelegationGraph` with `viewMode === 'timeline'`, advances the cutoff via the `useCascadePlayback` hook, and asserts that a node whose `time_created <= cutoff` is visible. The test does not assert the timing (the slide is hard to test without a real DOM); it asserts the visibility transition.
- [x] 3.5 Verify: from `frontend/`, run `npm run typecheck`, `npm run lint`, `npx vitest run`, and `npm run build`. All must pass. Manual smoke: open a session, switch to `Timeline`, drag the timeline scrubber forward, watch the nodes slide in from the left; drag back, watch them slide out to the right. With `prefers-reduced-motion: reduce` enabled in the OS, the slide is replaced with an instant in/out.

## 4. Final verification

- [x] 4.1 Run `npm run typecheck` from `frontend/`. Address any TypeScript errors.
- [x] 4.2 Run `npm run lint` from `frontend/`. Address any lint warnings that are not pre-existing (the 2 pre-existing `react-refresh` warnings in `badge.tsx` and `button.tsx` stay).
- [x] 4.3 Run `npx vitest run` from `frontend/`. The total test count is 42 (Wave 1) + 8 (group 1, subagent-aggregate) + 6 (group 2, timeline-layout) + 1 (group 3, animation) = 57 tests. All must pass.
- [x] 4.4 Run `npm run build` from `frontend/`. The build emits to `../src/opendashboard/static/`; the FastAPI app's `static/` mount is unchanged. Capture the last 20 lines of the build output.
- [x] 4.5 Capture before / after screenshots of `/` and `/session/:id` in dark mode via the existing Playwright setup at `/tmp/opencode/capturas/`. The new files: `dashboard-after-wave-2-desktop-dark.png`, `session-after-wave-2-cascade-desktop-dark.png`, `session-after-wave-2-timeline-desktop-dark.png`, `session-after-wave-2-timeline-scrubbed-mid-desktop-dark.png`. Manual review confirms the visual delta against the Wave 1 baselines.
- [x] 4.6 Run `openspec status --change frontend-modernization-wave-2` and confirm `applyRequires` is satisfied. The change is ready for archive after the implementation phase completes (`/opsx-archive frontend-modernization-wave-2`).
