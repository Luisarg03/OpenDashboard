## Context

The OpenDashboard frontend has three top-level routes (`/`, `/sessions`, `/agents`) and a detail route (`/session/:id`). Two of the three top-level pages are still stubs. The current `AppShell` (150 lines) renders:

- a sticky 56px-tall header with the brand mark, a "v2" pill, and the theme toggle
- a fixed 240px-wide desktop `<aside>` containing the primary nav
- a mobile drawer that slides in over a backdrop when a hamburger toggle is tapped
- a main content area offset 240px to the right at md+ breakpoints

Three observations from inspecting the live UI at 1440×900 (`/tmp/opencode/shots/dashboard-1440.png`) and the source:

1. The sidebar holds three links and a column of empty space below them. The header has the opposite problem: a wide empty middle.
2. The "Tokens by sub-agent" and "Cost by sub-agent" charts each show `orchestrator` as their top bar — at 60M of 99.6M tokens and ~$40 of $82.87, the parent so dominates the scale that the actual sub-agents (`fixer`, `librarian`, `explore`, `designer`) read as a long tail of near-zero. The aggregator (`subagent-aggregate.ts`) explicitly includes the parent and flags it with `isParent: true`; the chart rendering then draws it with a dashed stroke and an "insideTop" label that overlaps the bar value label. This was a deliberate Wave 2 mini-fix-2 decision (reversed from D1) to show the parent; the live data shows the chart makes more sense without it.
3. `index.css` defines density tokens (`--density-comfortable: 36px`, `--density-row-padding-compact: 0.5rem`) and a typography scale, but no component imports them. Every section uses Tailwind defaults, which means every gap and every padding value is hard-coded and unrelated.

These are all small, isolated changes that happen to share a theme (more space, less noise) but have no cross-cutting architectural impact. No new dependencies, no API changes, no data model changes. The change is purely visual / structural on the frontend.

## Goals / Non-Goals

**Goals:**
- Remove the 240px sidebar; gain the horizontal space for content
- Move the three-item nav into the header as tabs
- Make the sub-agent charts actually compare sub-agents by removing the parent from their data
- Clean up the three-label overlap on horizontal bars
- Apply the existing density tokens so spacing is consistent and the dashboard reads denser
- Cap content width on ultra-wide viewports so the layout doesn't dissolve into whitespace

**Non-Goals:**
- No changes to the router, the API, the data model, or the Python backend
- No pagination on the sessions table (that's a separate concern — the data is small enough today; revisit when it isn't)
- No new components or abstractions; this change edits existing files only
- No "Cost by model" table normalization (`opencode-go` repeated with different version suffixes is a backend / data-quality issue, not a layout issue)
- No changes to `cost-timeseries` or `kpi-section`'s shape, only its padding/grid breakpoint
- No redesign of the KPI sparkline or the delta baseline — those are tracked elsewhere (OQ1 in the previous design)

## Decisions

### D1. Navigation pattern: back button in the header (not tabs, not a collapsible sidebar, not a command palette)

The current nav is 3 items, but only `/` (the dashboard) is a real destination — `/sessions` and `/agents` are stubs. A tab bar advertises navigation that does not exist. After implementing horizontal tabs and testing them, the team rejected the approach: three tabs for one real destination is confusing, and the visual weight of a tab strip exceeds the value it provides.

The chosen pattern is a single back button (`<Link to="/">`) that renders in the header on non-root routes. It is deterministic (always points to `/`, not history-based), requires no state management, and is trivial to understand.

Alternatives considered:

- **Collapsible sidebar** (224px ↔ 56px). Rejected: keeps the layout coupling, keeps the responsive drawer machinery, doesn't actually solve the "wasted space" problem.
- **Command palette (`⌘K`)**. Rejected: invisible navigation, requires a learning step, doesn't help a user who just wants to click "Sessions".
- **Tabs at the top of `<main>` (below the header)**. Rejected: visually separates the brand from the navigation, which weakens both.
- **Horizontal tabs in the header** (implemented then reverted). Rejected after implementation: three tabs for one real destination plus two stubs is misleading; the tab bar advertises navigation depth that does not exist.

### D2. Where to filter the parent: in the chart data selector, not the aggregator

`aggregateSubagents` is a generic helper that may be used by future components (a future "Agents" page, a session detail view, an export). Filtering in the aggregator would leak a presentation decision into a data layer. Filtering in the chart's `useMemo` is one extra `filter(([, totals]) => !totals.isParent)` per chart and keeps the aggregator's contract honest.

Alternative considered: pass `{ excludeParent: true }` as an aggregator option. Rejected: the option would only ever be used by these two consumers, and the filter is a one-liner — not worth the API surface.

### D3. Chart label cleanup: two labels, not three

The current chart renders three `<LabelList>` instances: agent name (`insideLeft`), value (`right`), and `parentLabel` (`insideTop` — only set when the row is a parent). With the parent filtered out, the `parentLabel` instance is dead. Removing it leaves two labels per bar, which is the conventional horizontal-bar layout and matches the design-token precedent in the rest of the dashboard.

The dashed stroke on the parent bar also goes away, for the same reason.

Alternative considered: keep the parent and the visual indicator, just shrink the value label. Rejected: doesn't fix the scale problem (the parent's bar is still ~7× the next row), and the `insideTop` label still overlaps the value label even at smaller sizes.

### D4. Density wiring: use the existing tokens, don't add new ones

`index.css` already defines `--density-comfortable`, `--density-compact`, `--density-row-padding`, and `--density-row-padding-compact`, and exposes them as Tailwind spacing tokens (`p-[var(--density-comfortable)]` etc.). The current dashboard does not use any of them. This change wires them in, in place of the hard-coded `p-4`, `p-5`, `p-6`, and `gap-6` values scattered across the page.

Alternative considered: introduce a new "compact" density tier (e.g. `--density-extra-compact: 24px`). Rejected: the existing scale already has the values needed; the problem is that nobody is using the scale, not that the scale is missing values.

### D5. Max-width cap: `max-w-screen-2xl` (1536px) centered

The cap is applied to the `<main>` element, not to each card. This means the dashboard's grid, the KPIs, and the sessions table all share the same horizontal cap. Below 1536px the layout is identical to today; above it, the content centers and the page picks up equal side margins.

Alternative considered: no max-width (let it stretch to whatever the viewport is). Rejected: this is exactly the "dissolve into whitespace" problem the change is fixing.
Alternative considered: `max-w-7xl` (1280px). Rejected: too aggressive — the cost-timeseries chart's x-axis labels get cramped below 1280px, and the 4-up KPI grid is tight at 1280px too.

### D6. Back destination is a fixed link, not history-based

The back button uses `<Link to="/">` instead of `navigate(-1)` because the return destination must be deterministic. A history-based back may land on a refresh, a pasted deep link, or a prior back press — none of which guarantee the dashboard is the destination. Since the only meaningful return is "back to the main view," a fixed `/` link is the correct contract.

## Risks / Trade-offs

- **Mobile tabs in a 3-item row** → on a 390px viewport the brand mark and three tab labels fight for space. Mitigation: the brand mark collapses to the logo-only icon at `<md` (the wordmark is already hidden on mobile today in the rendered output), leaving ~340px for three short labels (`Dashboard`, `Sessions`, `Agents`). If even that doesn't fit, the next step is a horizontally-scrollable tab strip, but we don't need it yet.
- **Sessions table pagination** → without a max-row cap, the table still grows. Today it caps at 50 (set in `useRootSessions`); this change doesn't raise that cap, so the table still renders ≤50 rows. Pagination is out of scope.
- **Aggregator contract** → if a future component is added that *does* want to see the parent, it gets it for free. No spec change needed.
- **Density tokens used in only one route** → the dashboard becomes the first consumer of these tokens. Other routes still use Tailwind defaults. Acceptable; this is a "show the pattern" change, not a project-wide token rollout.

## Migration Plan

No data migration, no backend rollout, no infra change. The change is a frontend-only code edit followed by:

1. `npm run build` (or equivalent) to verify the Vite build still produces a valid bundle.
2. The dev server is already running at 127.0.0.1:8420 (the OpenCode TUI's spawned process); reload the page in the browser and re-screenshot at 1440 / 768 / 390 to confirm the three viewports.
3. Run the existing visual tests under `frontend/tests/visual/`; update any test that hard-codes a "sidebar" baseline to use a "header-tabs" baseline.
4. Smoke-test the nav: click each tab, click a session row to enter `/session/:id` and confirm "Sessions" stays highlighted on the way back.

Rollback is `git revert` of the change's commit (or `git reset` if not yet pushed). The change touches one shell file, two chart files, one KPI file, one page file, one list file, and the specs — all are isolated and revertable independently.
