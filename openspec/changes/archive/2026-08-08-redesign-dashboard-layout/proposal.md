## Why

The dashboard's primary route wastes 240px of horizontal space on a sidebar that holds three navigation links, while at the same time the most prominent data visualizations ("Tokens by sub-agent" and "Cost by sub-agent") are visually dominated by the parent/orchestrator agent — making them read as session totals rather than the per-sub-agent distribution the chart title promises. Both problems trace to the same root: the current layout was built for a future with more pages and more sub-agents, but the live data set has three top-level routes and a small, stable set of sub-agents. Now that the dashboard has real traffic, both surfaces are misleading: the sidebar under-uses space and the sub-agent charts over-count by including the parent. Fixing them together gives the dashboard room to breathe and makes the remaining content actually readable.

## What Changes

- **App shell loses the sidebar and gains a back button.** The desktop `<aside>` (240px wide), the mobile drawer (backdrop + Escape handler + Menu/X toggle), and the header tabs are all removed. A single back button (`<Link to="/">`) renders in the header on non-root routes, providing deterministic return navigation to the dashboard. The only layout coupling is `md:pl-60` in the main content area, which becomes unconditional `pt-14`.
- **Sub-agent charts filter out the parent.** `TokensBySubagentCard` and `CostBySubagentCard` drop any agent whose `isParent === true` from their `items` memo. The aggregator (`aggregateSubagents`) keeps the parent in the map for any future consumer that wants it; only the two chart selectors filter. The dashed-stroke visual indicator and the "parent" badge inside the bars are removed because they no longer have anything to mark.
- **Chart label rendering is tightened.** The three overlapping `<LabelList>` instances (agent name inside-left, value right, parent label inside-top) collapse to one inside-left label and one right-side value label. This both fixes the readability issue (numbers overlapping with bars) and removes a now-unused code path.
- **Dashboard density is tightened.** The page-level gap between sections drops from `gap-6` to `gap-4`, the KPI tile padding matches the existing `--density-comfortable` token (already defined in `index.css` but unused), the dashboard header loses the `p-6` wrapper in favor of `py-2`, and the sessions table row padding switches from the default to `py-2` (closer to the existing `--density-row-padding-compact` value).
- **Content max-width is introduced.** The main content area caps at `max-w-screen-2xl` and centers, so on viewports wider than ~1536px the layout stops stretching and the data density stays legible instead of dissolving into wide white space. The cap is applied at the `<main>` level so it benefits every route, not just the dashboard.

## Capabilities

### New Capabilities

- `subagent-charts`: the "Tokens by sub-agent" and "Cost by sub-agent" cards show only sub-agents (agents that are not the root of any session chain). The aggregator continues to include the parent in its result; the filter is applied at the chart data selector so other consumers can still use the full map.
- `dashboard-density`: the dashboard page uses the existing density tokens, caps content width on wide viewports, and tightens the sections and KPI tiles to use the space the removed sidebar freed.

### Modified Capabilities

- `app-shell`: the sidebar and its mobile drawer are removed (two requirements removed), the header and skip-to-content requirements are reworded to drop sidebar references, and a new back-button requirement is added.

## Impact

- `frontend/src/components/app-shell.tsx` — remove `SidebarContent`, both `<aside>` blocks, the `sidebarOpen` state, the Escape-key `useEffect`, the Menu/X imports, and the `md:pl-60` offset. Add a back button (`<Link to="/">`) in the header that renders on non-root routes.
- `frontend/src/features/dashboard/components/cost-by-subagent.tsx` and `tokens-by-subagent.tsx` — filter `isParent === true` from the `items` memo, drop the `parentLabel` `<LabelList>` and the `Cell` stroke styling for parents, drop the in-chart "parent" caption.
- `frontend/src/features/dashboard/lib/subagent-aggregate.ts` — unchanged (the aggregator stays correct; only the chart consumers filter).
- `frontend/src/features/dashboard/components/kpi-section.tsx` — tighten tile padding to align with `--density-comfortable`, swap the `lg:grid-cols-4` for `xl:grid-cols-4` so the 4-up layout only kicks in on wider viewports where there's actually room.
- `frontend/src/features/dashboard/components/session-list.tsx` — apply compact row padding.
- `frontend/src/pages/dashboard.tsx` — reduce `gap-6` to `gap-4`, drop the `p-6` wrapper around the header.
- `frontend/src/components/app-shell.tsx` `<main>` — add `max-w-screen-2xl mx-auto` and remove `md:pl-60`.
- No API changes. No new dependencies. No data model changes.
- Tests: existing visual tests in `frontend/tests/visual/` are reviewed and updated to reflect the sidebar removal and back button. Manual smoke comments in `app-shell.tsx` are rewritten to match the new layout.
