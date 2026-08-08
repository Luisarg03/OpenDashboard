# Tasks — frontend-modernization-wave-1

Each task is a single PR-bound unit of work. Tasks within a group must ship together; groups ship in order. Every task ends with the listed verification passing.

## 1. Design tokens and dark default (design.md D1, D2, D9 — proposal "Export design tokens", "Default to dark mode", "Fix WCAG contrast")

- [x] 1.1 Declare `--status-success`, `--status-warning`, `--status-error`, `--status-info` (and the 600-level light-mode values), plus the `density-*` and `typography-*` scale variables, inside `:root` and `.dark` in `frontend/src/index.css`. The `.dark` values must be at least 10 percentage points lighter than `:root` (per `design-tokens` spec).
- [x] 1.2 Re-export every new variable inside the `@theme inline { ... }` block of `index.css` so they become Tailwind utilities (`bg-status-success`, `text-density-muted`, `text-display`, etc.). Verify: a Storybook-less smoke test renders a `bg-status-success` div in both themes and the computed background matches the CSS variable.
- [x] 1.3 Change `frontend/src/components/theme-provider.tsx` so the initial active theme is `dark`. The `<ThemeToggle />` cycle stays `light / dark / system`. Verify: a fresh page load in incognito (no `localStorage`) renders the dashboard in dark mode.
- [x] 1.4 Run a scripted find/replace across `frontend/src/**/*.{ts,tsx}` to convert every `bg-[hsl(var(--status-*))]`, `text-[hsl(var(--status-*))]`, `border-[hsl(var(--status-*))]` to the equivalent utility. Files touched in the recon at minimum: `pages/session-detail.tsx`, `features/session/components/delegation-node.tsx`, `features/session/components/timeline-scrubber.tsx`. Verify: `rg "bg-\[hsl\(var\(--status" frontend/src` returns no matches.
- [x] 1.5 Confirm the WCAG AA contrast for `text-status-*` on `bg-background` at font size 12px in light mode. Tool: a short Playwright check that reads the computed `color` and `background-color` and asserts contrast ≥ 4.5:1. Add the script to `frontend/tests/a11y/` and keep it.

## 2. Application shell navigation (app-shell spec)

- [x] 2.1 Add `@radix-ui/react-collapsible` to `frontend/package.json` dependencies. Run `npm install`.
- [x] 2.2 Replace the placeholder `SidebarContent` in `frontend/src/components/app-shell.tsx` with a real navigation list: `Dashboard` (`/`), `Sessions` (`/sessions`, stub route for now), `Agents` (`/agents`, stub route). The component must be `aria-label="Primary"` and use Radix `Collapsible` for each section.
- [x] 2.3 Highlight the active route: a left-edge accent bar (`bg-primary` 2px) plus a `bg-muted` background on the active `<NavLink>`. Use `useLocation()` from `react-router-dom` to derive the active state.
- [x] 2.4 Add the two stub routes (`/sessions`, `/agents`) to `App.tsx` as placeholder pages that render a single `<h1>` each, so the navigation links resolve without 404s. Future waves replace these placeholders.
- [x] 2.5 Verify: manual smoke test of the four scenarios in the `app-shell` spec (visible link, active highlight, click navigates, mobile drawer open / close / Esc / backdrop).

## 3. Native select replacement (proposal "Replace the native `<select>`")

- [x] 3.1 Replace the native `<select>` at `frontend/src/pages/session-detail.tsx:305-316` (playback speed) with the shadcn `Select` primitive. Wire the same `value` and `onValueChange` to `speed` / `setSpeed`. Verify: visual diff confirms the control matches the surrounding button group; keyboard navigation (Arrow up / down, Enter) works.

## 4. Dead code removal — Failures Only (design.md D8)

- [x] 4.1 Remove the `failuresOnly` state, the `failureFilteredChain` `useMemo`, the `setFailuresOnly` wiring, and the `Failures Only` `<Button>` in `frontend/src/pages/session-detail.tsx`. Leave a `// TODO: reintroduce when DelegationNode gains a status field — see design D8` comment in place of the removed button.
- [x] 4.2 Verify: `rg "Failures Only|failuresOnly|failureFilteredChain" frontend/src` returns no matches outside the `// TODO` comment. Existing tests for `scrubber-stats`, `timeline-scrubber`, `playback`, and `session-detail` continue to pass.

## 5. Drawer via Radix Dialog and model formatter (design.md D5)

- [x] 5.1 Add `formatModel(model: SessionSummary['model']): string` to `frontend/src/features/session/lib/format.ts`. Behavior: if `model` is a string, return it; if it is an object with `{id, providerID, variant}`, return `id` (with `providerID` appended in parens if present and distinct from `id`); otherwise return the empty string. Add a Vitest covering each branch.
- [x] 5.2 Replace the inline `session.model` rendering in `frontend/src/pages/session-detail.tsx:239` with `formatModel(session.model)`. The header no longer renders raw JSON in any case.
- [x] 5.3 Replace `frontend/src/features/session/components/node-detail-drawer.tsx` with a Radix `Dialog` composition. The right-side panel treatment is preserved via `DialogContent` `className="fixed right-0 top-0 h-full w-[420px] ..."`. The component continues to accept `node` and `onClose` props. Use `DialogTitle` (visually hidden) and `DialogDescription` (visually hidden) for screen-reader support; add a visible close button as the existing `X` icon.
- [x] 5.4 Inside the new drawer, render `formatModel(node.model)` for the Model field, replacing the raw JSON fallback.
- [x] 5.5 Verify: Playwright keyboard smoke test opens a session, clicks a node, confirms the drawer is the active element, presses `Tab` to land on the close button, presses `Enter` to close; visual diff confirms the right-side panel treatment.

## 6. Tremor removal and Recharts migration (design.md D3)

- [x] 6.1 Move `recharts` from "transitive only" to a direct dependency: add it to `frontend/package.json` `dependencies` with the version that the existing lockfile already has pinned transitively (`2.13.x`). Run `npm install` and confirm the lockfile is clean.
- [x] 6.2 Rewrite `frontend/src/features/dashboard/components/cost-timeseries.tsx` using `recharts` directly: `ResponsiveContainer` + `AreaChart` + `Area` + `XAxis` + `YAxis` + `Tooltip`. All colors come from the design tokens (`stroke="hsl(var(--status-info))"`, etc.). Keep the `DashboardEmpty` fallback for the no-data case.
- [x] 6.3 Rewrite `frontend/src/features/dashboard/components/agent-breakdown.tsx` using `recharts` directly: horizontal `BarChart` with one bar per agent, colored by `getAgentColor(name)` (tokenized). Keep the click-through to `?agent=` URL filter.
- [x] 6.4 Remove `agent-breakdown.tsx`'s `TREMOR_COLOR_MAP` (lines 16-28) and any other Tremor references; verify `rg "tremor" frontend/src` returns no matches.
- [x] 6.5 Remove `@tremor/react` from `frontend/package.json` dependencies. Run `npm install`. Confirm `rg "tremor" frontend/package.json` returns no matches.
- [x] 6.6 Clean up `frontend/src/index.css:167-174` (the Tremor-specific recharts axis CSS): keep the dark-mode axis overrides (they are still useful) but remove the Tremor-named comment.
- [x] 6.7 Verify: `npm run typecheck`, `npm run lint`, `npm run build` all pass. Visual diff: the two charts render with the same data shape and improved styling.

## 7. KPI tiles upgrade (design.md D10 — dashboard-tiles spec)

- [x] 7.1 If `/api/stats` does not return a per-metric time series, leave the existing endpoint untouched and plan a follow-up change. Document the gap in a `// ponytail:` comment at the top of `kpi-section.tsx` ("sparkline series not yet served by /api/stats — see OQ1 in design.md").
- [x] 7.2 Extend `frontend/src/features/dashboard/components/kpi-section.tsx` so each tile renders four regions in order: title, value, delta indicator, sparkline. Use a `recharts` `LineChart` (no axes, single `Line`, `ResponsiveContainer`) for the sparkline, height 32px.
- [x] 7.3 Compute the delta in a `useMemo`: previous-period value vs. current-period value; positive delta uses `text-status-success` + up icon, negative uses `text-status-error` + down icon, neutral (zero or no previous value) uses a dash icon in `text-muted-foreground`. Add a Vitest covering each branch.
- [x] 7.4 When the per-metric series is unavailable, render a flat sparkline (single horizontal `Line` of constant value) and a neutral delta indicator. The fallback MUST be visually distinct from the no-data `DashboardEmpty` card.
- [x] 7.5 Verify: `npm run typecheck`, `npm run lint`, `npm run build` all pass; Vitest passes; visual diff confirms the four tiles render the four regions in both data and fallback cases.

## 8. Data table, feedback system, graph theming (design.md D4, D6, D7)

- [x] 8.1 Add `@tanstack/react-table` and `sonner` to `frontend/package.json` dependencies. Run `npm install`.
- [x] 8.2 Create `frontend/src/components/ui/data-table.tsx` as a shadcn-style wrapper around TanStack Table. Expose props: `columns: ColumnDef<T>[]`, `data: T[]`, `emptyTitle: string`, `emptyDescription: string`. The primitive implements: column sort (clicking the header cycles asc / desc / unsorted), per-column filter (toolbar input per filterable column, 150ms debounce), column visibility (Radix `DropdownMenu` with checkboxes), density toggle (`comfortable` / `compact` row heights).
- [x] 8.3 Add a Vitest for `data-table.tsx` covering sort, filter, visibility, and density. Use `jsdom` (already configured in `vitest.config.ts`) and `@testing-library/react`.
- [x] 8.4 Migrate `frontend/src/features/dashboard/components/session-list.tsx` to use the new `DataTable` primitive. Column definitions: `Title`, `Agent`, `Model`, `Status` badges, `Cost`, `Tokens`, `Time`. Keep the existing URL-bound filter behavior (no change to the data flow).
- [x] 8.5 Mount `<Toaster />` from `sonner` in `frontend/src/main.tsx`, positioned top-right, themed to match the active theme. Pass `richColors` and `closeButton` props.
- [x] 8.6 Refactor the inline error cards in `frontend/src/features/dashboard/components/states.tsx` and `frontend/src/features/session/components/session-states.tsx`: transient errors (data-refresh failures, SSE reconnect events) call `toast.error(...)`; hard errors (initial load failure, not-found) keep the full-page card.
- [x] 8.7 Configure `@xyflow/react` in `frontend/src/features/session/components/delegation-graph.tsx` with `colorMode="dark"` and a `theme` object that overrides `background`, `edge.stroke`, `node.background`, `node.border`, and `focusRing` to derive from the design tokens. In light mode, the canvas follows the same surface tokens.
- [x] 8.8 Update the `<MiniMap />` `nodeColor` callback to return tokenized values: live → `hsl(var(--primary))`, done → `hsl(var(--status-success))`, failed (when available) → `hsl(var(--status-error))`, otherwise `hsl(var(--muted-foreground))`. Update `maskColor` to use a token-derived translucent surface (`hsl(var(--background) / 0.7)`).
- [x] 8.9 Update the focus-mode dim in `delegation-graph.tsx` to express the dim opacity as a tokenized value (a `data-dim` attribute on the wrapper or a `style={{ opacity: 0.3 }}` derived from `--muted-foreground`). Honour `prefers-reduced-motion` by switching the transition to `none` when the media query matches.
- [x] 8.10 Verify: `npm run typecheck`, `npm run lint`, `npm run build` all pass; Vitest passes; visual diff confirms (a) the session list is a sortable / filterable / column-toggleable table, (b) a transient SSE error toasts in the top-right, (c) the graph canvas matches the surrounding surface in both themes, (d) clicking a node dims siblings and the second click clears focus.

## 9. Final verification

- [x] 9.1 Run `npm run typecheck` from `frontend/`. Address any TypeScript errors.
- [x] 9.2 Run `npm run lint` from `frontend/`. Address any lint warnings that are not pre-existing.
- [x] 9.3 Run `npm run test` (vitest) from `frontend/`. All tests pass; new tests for `data-table`, `formatModel`, and the KPI delta cover the documented branches.
- [x] 9.4 Run `npm run build` from `frontend/`. The build emits into `src/opendashboard/static/`; the FastAPI app's `static/` mount is unchanged.
- [x] 9.5 Capture before / after screenshots of `/` and `/session/:id` in dark mode via the existing Playwright setup at `/tmp/opencode/capturas/`. The new files: `dashboard-after-wave-1-desktop-dark.png`, `session-after-wave-1-desktop-dark.png`, `dashboard-after-wave-1-mobile-dark.png`, `session-after-wave-1-mobile-dark.png`. Manual review confirms the visual delta against the pre-wave screenshots in the same directory.
- [x] 9.6 Run `openspec status --change frontend-modernization-wave-1` and confirm `applyRequires` is satisfied. The change is ready for archive after the implementation phase completes (`/opsx-archive frontend-modernization-wave-1`).
