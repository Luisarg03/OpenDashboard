## Why

The OpenDashboard frontend ships on a modern 2026 stack (Vite + React 19 + shadcn/ui + Tailwind 4 + TanStack Query + Radix + Recharts + xyflow + motion) and a clean FastAPI backend, yet the running UI looks unfinished: an empty sidebar placeholder, charts powered by the deprecated `@tremor/react` library, KPI tiles with no delta or sparkline, a hand-rolled drawer bypassing the already-installed `@radix-ui/react-dialog`, a "Failures Only" button that ships as dead code, a native `<select>` between shadcn buttons, status color tokens defined in CSS but not exported to `@theme inline` (forcing arbitrary-value escapes throughout the codebase), and a React Flow graph that renders with its default light background inside dark mode. Wave 1 fixes the bug-tier residue and the unfulfilled-component gaps without touching the framework, the backend, or the existing data contracts — establishing the visual baseline that Waves 2 and 3 (density toggle, time-range picker, design-system layer) will build on.

## What Changes

- **Export design tokens to Tailwind theme**: add `--status-*`, `--density-*`, and typography scale to the `@theme inline` block in `frontend/src/index.css` so the existing CSS variables become first-class utilities (`bg-status-success`, `text-density-muted`, etc.); replace every `bg-[hsl(var(--status-...))]` arbitrary value with the new utility.
- **Default to dark mode**: flip the initial `ThemeProvider` default from `system`/`light` to `dark` per project memory `#71`; keep the toggle visible.
- **Fix WCAG contrast for status hues**: bump `--status-success/-warning/-error/-info` from 500-level (≈3:1 on white, fails AA for small text) to 600-level hues in light mode, document the target in the design tokens spec.
- **Wire the application shell**: replace the empty sidebar placeholder in `frontend/src/components/app-shell.tsx` with a real navigation entry (Dashboard, Sessions, Agents) plus a section for the time-range filter, using a collapsible aside (Radix Collapsible).
- **Replace the native `<select>`** at `frontend/src/pages/session-detail.tsx:305-316` (playback speed) with the shadcn `Select` primitive so it matches the surrounding button group.
- **Remove or implement the "Failures Only" toggle**: the predicate at `session-detail.tsx:144-155` is a hardcoded `return false`; either wire it to the actual failure detection on `DelegationNode` (data model extension out of scope for this wave — see `## Out of scope`) or remove the button and its state until the predicate can be implemented.
- **Migrate `node-detail-drawer` from hand-rolled to Radix Dialog**: `frontend/src/features/session/components/node-detail-drawer.tsx` reimplements modal concerns; replace with `Dialog` from `@radix-ui/react-dialog` (already a dep, currently unused) for focus trap, `aria-modal`, and Esc-to-close.
- **Render the model field as a readable string, not raw JSON**: the fallback at `session-detail.tsx:239` does not cover the common case where `session.model` is the object `{id, providerID, variant}`; add a `formatModel()` helper in `features/session/lib/format.ts` and use it in both the header and the drawer.
- **Drop `@tremor/react`**: the library was archived by its maintainers in 2024, ships an opinionated look that fights the design system, and only powers two charts (`AreaChart` in `cost-timeseries.tsx:2`, `BarList` in `agent-breakdown.tsx:3`). Replace both with custom Recharts components styled against the new design tokens.
- **Add shadcn `data-table` primitive**: introduce a TanStack-Table-backed data table in `components/ui/data-table.tsx` and use it for the session list (currently hand-rolled card rows in `session-list.tsx`) — column sort, filter, visibility, density toggle on the table itself.
- **Upgrade KPI cards from title + value to title + value + delta + sparkline**: each tile in `kpi-section.tsx` adds a 7-day sparkline (Recharts `LineChart` with no axes) and a delta indicator (positive/negative vs. previous period) driven by the existing `/api/stats` payload; if the backend cannot serve a per-metric time series without a new endpoint, fall back to a static range and document the gap.
- **Add `sonner` toast system**: install `sonner` and add a `<Toaster />` in `main.tsx`; route the existing inline error cards in `states.tsx` and `session-states.tsx` to non-fatal toasts where appropriate (data-refresh failures, SSE reconnect) and keep the full-page states only for hard-empty and not-found.
- **Theme React Flow for dark mode**: configure `<ReactFlow colorMode="dark">` and override the canvas background + edge stroke in `delegation-graph.tsx` so the graph matches the surrounding dark surface; verify MiniMap contrast and `aria-label` the graph container.

## Capabilities

### New Capabilities

- `design-tokens`: the formal token system that lives in `index.css` and is exposed to Tailwind via `@theme inline` — status colors, density scale, typography scale, mono-data font alias, dark-default policy. Includes the WCAG contrast rule for status hues.
- `app-shell`: the sticky header + collapsible sidebar + main area composition, including the navigation list, theme toggle, and skip-to-content link. Owns the page-level "chrome" of every routed page.
- `dashboard-tiles`: the KPI tile primitive (title + value + delta + sparkline) and the surrounding section grid; includes loading skeleton, empty state, and error state. Owns the `useStats()` data shape for the dashboard top row.
- `data-table`: the TanStack-Table-backed shadcn primitive used wherever a list of records needs sort/filter/visibility/density; reusable across the session list and future agent/cost tables.
- `feedback-system`: the `sonner`-based toast layer plus the rule for when to toast vs. when to render a full-page state; includes the wrapper `<Toaster />` placement in `main.tsx`.
- `graph-theming`: the dark-mode configuration of `@xyflow/react` — background, edge colors, MiniMap palette, focus-mode dim opacity. Lives next to the `delegation-graph` component and is consumed by it.

### Modified Capabilities

_None._ `openspec/specs/` is currently empty; there are no existing spec files whose requirements are changing. Wave 1 introduces new capabilities only.

## Impact

- **Code touched (frontend)**: `index.css`, `App.tsx`, `main.tsx`, `components/app-shell.tsx`, `components/theme-provider.tsx`, `components/theme-toggle.tsx`, all of `components/ui/` (additions), `pages/dashboard.tsx`, `pages/session-detail.tsx`, `features/dashboard/components/*` (cost-timeseries, agent-breakdown, kpi-section, session-list, dashboard-filters, states), `features/session/components/*` (delegation-graph, node-detail-drawer, delegation-node, session-states, scrubber-stats, timeline-scrubber, node-types), `features/session/lib/format.ts` (new), `features/session/lib/agent-colors.ts` (token migration), `lib/api/types.ts` (no contract change, but `DelegationNode` doc updated for the failure-detection stub), `package.json`, `package-lock.json`.
- **Code untouched**: backend in `src/opendashboard/**` (no API change required for Wave 1; per-metric time series is a nice-to-have, not a blocker), `scripts/dev.sh`, `Makefile`, `pyproject.toml`.
- **Dependencies**:
  - **Add**: `sonner`, `@tanstack/react-table`, `@radix-ui/react-collapsible`, `cmdk` is already present but unused — wire it in Wave 2.
  - **Remove**: `@tremor/react` (drop entirely once `cost-timeseries` and `agent-breakdown` are migrated).
  - **Already present and now used**: `@radix-ui/react-dialog`, `tailwind-merge`, `clsx`, `motion`, `lucide-react`, `cmdk`.
  - **Already present and remain transitively only**: `recharts` (now used directly in addition to the transitively-included version).
- **No backend changes.** No new endpoints, no contract changes, no schema changes. The optional per-metric time series is gated on a follow-up; Wave 1 falls back to a static range if absent.
- **No visual regression risk on the SSE pipeline, the timeline scrubber, or the React Flow layout**: those subsystems are kept; only their *styling* is updated, not their behavior.
- **Test impact**: existing tests for `scrubber-stats`, `timeline-scrubber`, `playback`, and `session-detail` continue to apply; new tests for the data-table primitive and the KPI delta computation are added.
