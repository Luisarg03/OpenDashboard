## Why

After Wave 1 shipped a clean design system and stable component primitives, the dashboard's two most visible usability gaps remain: the "All agents" / "All months" header filters are weak proxies for the question the user actually has (which sub-agent ate the tokens), and the session-detail graph's vertical cascade layout collapses the temporal story into an ever-taller column that the user has to mentally re-read. Wave 2 closes both gaps: the header filters narrow to what is actually useful, the "Sessions by agent" card is replaced by two cards that show tokens and cost broken down by the sub-agents that did the work, and the session-detail graph gains a horizontal timeline layout (toggled alongside the existing cascade) where the time-travel scrubber reveals each delegation as a node sliding into view from the left, ladder-style.

## What Changes

- **Drop the "All agents" filter from the dashboard header.** The parent session's `agent` field is almost always `orchestrator`; filtering by it surfaces zero useful sessions. Keep the search input and the "All months" filter (months are the only sane way to paginate 1k+ sessions). **BREAKING** for any user that was using the agent filter — none observed in Wave 1, so impact is cosmetic-only.
- **Add a `/api/sessions/{id}/subagents` aggregate endpoint** OR derive sub-agent totals client-side from the existing chain payload (decision logged in design.md as Open Question 1). The new dashboard cards consume this data.
- **Replace the "Sessions by agent" card** (`agent-breakdown.tsx`) with **two cards** in the existing 2-column grid: `Tokens by sub-agent` and `Cost by sub-agent`. Both render as horizontal sorted bar charts (no donut — 10+ agents in a donut is illegible per the Wave 1 design rule).
- **Add a graph layout toggle** to the session-detail toolbar: `Cascade` (current vertical layout) and `Timeline` (new horizontal layout). Both layouts share the same `DelegationGraph` component; the layout strategy is a pure function of `(chain, viewMode)`.
- **Introduce a new horizontal timeline layout** in `features/session/lib/timeline-layout.ts` that arranges nodes by `time_created` on the X axis and groups them into lanes (one per `parent_id`) on the Y axis. Edges curve from parent to child, crossing lanes when siblings fan out.
- **Animate the time-travel scrubber with `motion/react` enter/exit** so nodes slide horizontally into view as the cutoff moves forward (the "ladder" effect the user described). Respect `prefers-reduced-motion` (the Wave 1 pattern is already in place for the focus-mode dim).
- **Sort rule for the agent-metrics bars**: the active metric drives the order (default: tokens desc). Toggling Tokens / Cost on a card re-sorts that card. If we land on a two-card layout, each card re-sorts independently.
- **No backend data model changes** in Wave 2. The sub-agent aggregate is computable from the existing chain payload (`DelegationNode` already carries `agent`, `tokens_input`, `tokens_output`, and a derived `cost` field). The optional dedicated endpoint is a follow-up if client-side cost proves expensive.
- **No new dependencies**. The graph uses `@xyflow/react` (already in the bundle), the animation uses `motion` (already in the bundle), the bars use `recharts` (already in the bundle).

## Capabilities

### New Capabilities

- `dashboard-filters`: the header filter row on `/` — search input, month selector, and a "Reset" action. Owns the URL-bound filter state (`?search=`, `?month=`, etc.) and the reset behavior. Wave 2 narrows the surface from 3 filters to 2 (drops `?agent=`) and reorganizes the visual order.
- `agent-metrics`: the two new horizontal-bar cards on `/` that break the session set down by the sub-agents that did the work. Each card shows a sorted bar per sub-agent, the bar's length encodes the metric value (tokens or cost), and the active metric is implicit per card. Includes a `dashboard-tiles`-style skeleton, empty, and error state.
- `session-timeline-layout`: the new horizontal graph layout in the session-detail page. Lays out nodes by `time_created` on the X axis and by `parent_id` lane on the Y axis. Renders edges that curve from parent to child. Owns the time-travel animation: nodes slide in from the left as the timeline cutoff advances, and slide out (with reduced motion fallback) as it retreats.

### Modified Capabilities

- `graph-theming`: a new layout selector (`Cascade` / `Timeline`) is added to the session-detail toolbar; both layouts share the same theming rules, MiniMap palette, edge stroke, and focus-dim behavior. The Cascade layout's existing requirement set is preserved; the Timeline layout satisfies an analogous requirement set under a new view-mode value.
- `app-shell`: the nav still links to `/` for "Dashboard" and to the stub `/sessions` and `/agents` from Wave 1; the new agent-metrics view lives on `/`, not on a new route. No routing change is required, but the active-state highlight rule gains a small refinement: a deep-link `?metric=tokens|cost` (optional, scoped to the agent-metrics cards) does not change the active nav item.

### Out of Scope (deferred to later waves)

- Per-metric time-series endpoint for KPI sparklines (Wave 1 OQ1) — still a backend follow-up.
- Failure-detection predicate on `DelegationNode` (Wave 1 OQ2) — depends on a data-model extension in OpenCode.
- Global density toggle (Wave 2 of the original roadmap) — deferred to Wave 3.
- Command palette wiring (cmdk dep already installed) — Wave 3.
- Time-range picker as a global filter — Wave 3.
- Breadcrumbs + inspector drawer persistence + full a11y audit — Wave 3.
- A `Sub-agent` filter (the data field that would let users filter sessions by which sub-agent ran) — depends on the optional `/api/sessions/{id}/subagents` aggregate being lifted into the session list endpoint, which is a backend decision deferred to a follow-up.

## Impact

- **Code touched (frontend)**: `pages/dashboard.tsx`, `features/dashboard/components/dashboard-filters.tsx`, `features/dashboard/components/agent-breakdown.tsx` (rename / split into two new components), `features/session/components/delegation-graph.tsx` (consume the new layout), `features/session/lib/timeline-layout.ts` (new), `features/session/lib/chain-to-flow.ts` (consume the new layout), `features/session/lib/aggregated-layout.ts` (kept as the aggregated cascade variant), `features/session/lib/layout.ts` (rename or keep as the cascade default), `features/session/components/timeline-scrubber.tsx` (animation hook), `pages/session-detail.tsx` (toolbar toggle), `lib/api/sessions.ts` (new aggregate hook if backend is reached; otherwise N/A), `components/ui/data-table.tsx` (no change), `index.css` (no new tokens, but small motion-enter/exit keyframes if `motion` doesn't ship them out of the box).
- **Code untouched**: backend in `src/opendashboard/**` (unless the optional aggregate endpoint lands; see design.md Open Question 1), `scripts/dev.sh`, `Makefile`, `pyproject.toml`, `vite.config.ts`, the `formatModel` helper, the design-tokens spec, the data-table primitive, the feedback-system Toaster.
- **Dependencies**: no new packages. `recharts`, `motion`, `@xyflow/react`, `@tanstack/react-query`, `@tanstack/react-table` are all already in the bundle.
- **No backend data model changes.** No new tables, no migrations, no Pydantic changes. The optional sub-agent aggregate endpoint is a pure read of existing data, gated on a follow-up.
- **No API contract changes** for the existing endpoints. The session-detail page continues to consume `/api/sessions/{id}/chain` exactly as it does today; the new graph layout is a pure rendering decision inside the frontend.
- **No changes to the SSE pipeline**, the timeline scrubber's data flow, the focus-mode behavior, or the existing `/`, `/session/:id`, `/sessions`, `/agents` route surface.
- **No changes to dark-mode behavior, density tokens, typography tokens, or the application shell.** Wave 2 builds on the Wave 1 design system; it does not modify it.
- **Test impact**: existing tests for the scrubber, playback, session-detail, kpi-delta, formatModel, and data-table continue to apply. New tests: layout pure-function tests for `timeline-layout.ts`, animation-state tests for the timeline-scrubber cutoff integration, and a small smoke test for the agent-metrics cards.
