## Context

OpenDashboard is a localhost single-user dashboard for tracking OpenCode AI agent delegations. The frontend is built on Vite + React 19 + TypeScript + shadcn/ui (new-york) + Tailwind CSS 4 + Radix + TanStack Query + Recharts (currently transitive via `@tremor/react`) + `@xyflow/react` + `motion`. The backend is a FastAPI app on port 8080 serving read-only SQLite queries against `~/.local/share/opencode/opencode.db`, plus a single SSE endpoint at `/api/sessions/{id}/events` that polls the DB every 2s and pushes deltas to the client. The build pipeline outputs the SPA into `src/opendashboard/static/` and the FastAPI app serves the built bundle via a catch-all route (`/{full_path:path}` in `src/opendashboard/routes.py:271`). There is no deployment, no CI, no CDN, no auth, and no SEO surface — the dashboard is a developer tool that runs on the developer's own machine.

A previous change (`redesign-visual-polish`, completed 2026-08-05) cleaned up several visual smells at the border / hover / color level but did not address the deeper structural gaps: charts still run on a deprecated library, the design-token system is half-wired, KPI tiles have no temporal context, the session list is a hand-rolled card layout, the node-detail drawer is a hand-rolled modal that bypasses an already-installed Radix Dialog primitive, and React Flow still renders with its light-theme default inside dark mode. A framework-swap evaluation ruled out Next.js, TanStack Start, and React Router framework mode as net-negative (see the `## Framework decision` block below); the right move is to keep Vite and address the components.

This wave establishes the design-system substrate and the dashboard primitives that Waves 2 and 3 (density toggle, time-range picker, command palette, inspector drawer, full a11y audit) will build on.

## Framework decision

A framework-swap evaluation (Aug 2026, current Next.js 16.3.0, TanStack Start RC, React Router 8.3.0) scored the candidates against four dimensions — fit-for-purpose, migration cost, dev-velocity delta, ecosystem fit — on a 1–5 scale:

| Framework | Fit | Migration | Velocity | Ecosystem | Total | State |
|---|---|---|---|---|---|---|
| **Vite + React 19 (status quo)** | 5 | 5 | 3 | 5 | **18** | stable |
| Next.js 16.3 (App Router / RSC) | 2 | 1 | 2 | 3 | 8 | stable |
| TanStack Start | 2 | 2 | 2 | 4 | 10 | **RC** (disqualifying) |
| React Router 8 framework mode | 3 | 4 | 3 | 4 | 14 | stable |

Vite wins or ties every dimension. None of the alternatives deliver a benefit this case can consume: there is no SEO surface (localhost, one user), no SSR data-fetching benefit (the data lives behind FastAPI, not in the server), no auth surface (no server actions / middleware), no wire cost (no CDN, bundle size is irrelevant locally), and the deploy shape is already "binary single" (Vite builds into `src/opendashboard/static/` and the FastAPI app serves the catch-all). TanStack Start is still Release Candidate in 2026 and is therefore disqualified for a daily-driver tool. Next.js 16.3 is the most expensive migration and the least useful. React Router 8 framework mode is the cheapest escape hatch but still does not win any dimension outright. **Decision: keep Vite.** This wave does not change the build pipeline.

## Goals / Non-Goals

**Goals**

1. **Establish a complete, exported design-token system** in `index.css` so that every status color, density step, and typography size in the codebase is reachable as a Tailwind utility rather than an arbitrary value.
2. **Make dark mode the default and pass WCAG AA** for status hues against the surrounding background, in both themes, at the text sizes the design uses.
3. **Replace the deprecated `@tremor/react` library with custom Recharts** components that match the design system, and add a shadcn `data-table` primitive (TanStack Table) for the session list.
4. **Upgrade KPI tiles from title + value to title + value + delta + sparkline** with skeleton, empty, and error states wired through the existing `/api/stats` query.
5. **Wire the empty sidebar to a real navigation** (Dashboard / Sessions / Agents), replace the hand-rolled `node-detail-drawer` with `@radix-ui/react-dialog`, and remove or implement the "Failures Only" dead-code toggle.
6. **Add a `sonner`-based feedback layer** for non-fatal errors and live-update signals; keep full-page states for hard-empty and not-found.
7. **Theme `@xyflow/react` for dark mode** so the graph canvas, edges, and MiniMap match the surrounding surface.
8. **No backend changes.** No new endpoints, no contract changes, no schema changes.

**Non-Goals** (deferred to later waves or explicitly rejected)

- **Density toggle** (compact / comfortable) — Wave 2.
- **Time-range picker** as a global filter — Wave 2.
- **Command palette (cmdk)** wiring — Wave 2; the dep is already installed.
- **Per-metric time-series endpoint** for sparkline data — a follow-up change gated on a backend decision; Wave 1 uses a static range if the endpoint is absent.
- **Failure-detection predicate** on `DelegationNode` — requires a data-model extension (`status` / `error` field) that depends on the OpenCode DB schema. Either the toggle is removed for Wave 1 or the predicate stays a stub with a clear `// TODO` referencing the data-model ticket.
- **Breadcrumbs, inspector drawer persistence, full a11y audit** — Wave 3.
- **Routing library change** — not a goal. `react-router-dom@7` stays.
- **Data-fetching library change** — not a goal. `@tanstack/react-query@5` stays.

## Decisions

### D1. Design tokens live in `index.css` and are exposed via `@theme inline`

**Choice.** All token variables (status colors, density steps, typography scale) are declared in the `:root` and `.dark` blocks of `index.css` and re-exported as Tailwind theme variables inside the `@theme inline { ... }` block. Components consume them as `bg-status-success`, `text-density-muted`, `font-data`, `text-display`, etc. — never as `bg-[hsl(var(--status-success))]`.

**Rationale.** The existing `index.css:68-92` block exports `--color-background`, `--color-foreground`, etc. into the theme but skips `--status-*`, which forces the codebase into arbitrary values. Tailwind v4's `@theme inline` is the official, zero-runtime-cost way to extend the design system; using a JS-side config or a separate `tokens.ts` would re-introduce the runtime path the design explicitly avoids. Memory `#71` already locks the design language: dark default, elevation via background luminance (no shadows), mono for data values.

**Alternatives considered.**

- A separate `frontend/src/lib/tokens.ts` exporting a typed object. Rejected: requires a runtime lookup per class and decouples from Tailwind's static analysis, breaking the "class-as-utility" model.
- A CSS-in-JS solution (vanilla-extract, panda-css). Rejected: shadcn/ui and the existing `tailwind-merge` setup are Tailwind-native; introducing a second styling paradigm splits the design surface.
- PostCSS plugin. Rejected: more moving parts than `@theme inline` and no benefit at this scale.

### D2. Status hues shift to lighter values in light mode for WCAG AA

**Choice.** The previous `--status-*` in `:root` were 500-level hues (e.g. `152 69% 45%` for success) which sit at roughly 3:1 contrast against the white background — below the AA threshold of 4.5:1 for body text. Wave 1 shifts them in the **lightness** dimension (not the hue family) to verified-contrast values:

| Token | Old (fails AA) | New (≥ 4.75:1) | Dark (unchanged) |
|---|---|---|---|
| `--status-success` | `152 69% 45%` | `152 69% 30%` | `152 69% 55%` |
| `--status-warning` | `38 92% 50%` | `38 92% 32%` | `38 92% 60%` |
| `--status-error` | `0 84% 60%` | `0 84% 48%` | `0 84% 70%` |
| `--status-info` | `217 91% 60%` | `217 91% 52%` | `217 91% 70%` |

The dark values stay at the lightened 500-level already declared; the `.dark` block keeps them at least 10 percentage points lighter than the corresponding `:root` value (55/30, 60/32, 70/48, 70/52).

**Rationale.** Status badges in the current codebase render as small text (10–12px), which is body-text-sized and must clear 4.5:1. Playwright verification at 12px on `--background: 0 0% 100%` measured all four tokens at 4.75–4.9:1. **Note on naming:** the original D2 text described the shift as "to 600-level" but that was a label, not a measured claim. The actual fix is in the lightness dimension — Tailwind's named 600 palette does NOT clear 4.5:1 (emerald-600 is 3.77:1, amber-600 is 3.20:1). The values above are empirically chosen to clear 4.5:1; they are not "600" in any meaningful Tailwind sense.

**Alternatives considered.**

- A separate `--status-*-on-light` token alongside the existing ones. Rejected: doubles the token surface for a 1-wave win.
- Forcing all status text to be on a tinted background. Rejected: changes the visual model of status indicators; the badges currently use `text-` and `border-` variants of the same hue and we want to keep that.
- Using Tailwind's named 600 palette. **Tested and rejected** at implementation: the named values fail AA in light mode.

### D3. Drop `@tremor/react`, keep `recharts` as a direct dep

**Choice.** `cost-timeseries.tsx:2` (`AreaChart`) and `agent-breakdown.tsx:3` (`BarList`) are the only two consumers. Both are replaced with custom Recharts components (`<AreaChart>` and `<Bar>` built from `<ResponsiveContainer>` + custom axis / tooltip styling). The `@tremor/react` dep is removed from `package.json` once the two files are migrated; `recharts` is moved from "transitive only" to a direct dependency in `package.json:dependencies`.

**Rationale.** `@tremor/react` was archived by its maintainers in 2024, is not maintained against Tailwind v4, ships an opinionated visual style that fights the design system, and has only two consumers in this codebase. Recharts is already in the bundle (transitively) and is actively maintained. Building two custom chart wrappers is less work than fighting Tremor's CSS overrides (currently scattered through `index.css:167-174` and `cost-timeseries.tsx:62-66`).

**Alternatives considered.**

- `Mantine Charts`. Rejected: drags in the full Mantine stack (themes, providers, hooks) for two charts.
- `Tremor Raw` (community fork). Rejected: small community, unmaintained, and a fork does not solve the "fight the design system" problem.
- Hand-rolled SVG. Rejected: a real win only for one-off illustrations; charts are reused and benefit from Recharts' built-in axes, tooltips, and animations.

### D4. Add `@tanstack/react-table` via a shadcn `data-table` primitive

**Choice.** The shadcn `data-table` recipe (a thin wrapper around `@tanstack/react-table` with the shadcn-style table, toolbar, and column-menu) is added to `components/ui/data-table.tsx` and used to back the session list in `features/dashboard/components/session-list.tsx`. The list gains: column sort, per-column filter, column visibility toggle, and a density toggle (compact / comfortable) on the table itself — the latter is a stepping stone for the global density toggle planned for Wave 2.

**Rationale.** TanStack Table is the de-facto headless table for React in 2026, integrates cleanly with the shadcn recipe, and gives us the feature set (sort, filter, visibility, density) that the current hand-rolled card list cannot provide without re-inventing it. The recipe is well-documented and battle-tested in production shadcn apps.

**Alternatives considered.**

- AG-Grid. Rejected: heavy, opinionated, commercial license considerations; overkill for a 50-row list.
- Rolling our own sort/filter state. Rejected: re-implements what TanStack Table already provides correctly.
- Keeping the card list. Rejected: does not address the "feels 2022" complaint; data tables are what monitoring tools use for tabular data.

### D5. `@radix-ui/react-dialog` replaces the hand-rolled `node-detail-drawer`

**Choice.** The custom drawer in `features/session/components/node-detail-drawer.tsx` is replaced with `@radix-ui/react-dialog` (already a dep, currently unused). Radix Dialog provides focus trap, `aria-modal`, Esc-to-close, and the portal layer; the existing visual treatment (right-side panel, no backdrop dimming) is preserved via custom `className` overrides on `DialogContent`.

**Rationale.** The current drawer has none of the modal accessibility affordances a real dialog needs, and shipping a hand-rolled modal next to a `Dialog` primitive is both a maintenance debt and an a11y regression. The Radix swap is a same-day refactor and gives the panel proper keyboard and screen-reader support.

**Alternatives considered.**

- `@radix-ui/react-sheet`. Rejected: not currently a dep; the visual difference (sheet has a backdrop by default) is not what this app wants; the `Dialog` primitive can be styled as a right-side panel via `position: fixed; right: 0` and avoids a new dep.
- A custom focus-trap on top of the current drawer. Rejected: re-implements what Radix already provides correctly.

### D6. `sonner` for non-fatal feedback; full-page states stay for hard empty and not-found

**Choice.** `sonner` is installed and a `<Toaster />` is mounted in `main.tsx`. Existing inline error cards in `features/dashboard/components/states.tsx` and `features/session/components/session-states.tsx` are split: data-refresh failures and SSE reconnect events become toasts (dismissible, top-right, auto-dismiss after 4s); hard-empty states and not-found states remain full-page. The session-detail graph remains a full-page `SessionEmptyState` for the "no nodes yet" case (it has its own dedicated copy and action).

**Rationale.** Toasts are the right surface for "your data is stale" / "we're trying to reconnect" — they convey urgency without blocking the user. Full-page states are the right surface for "there is literally nothing here yet" because they direct attention to the empty surface and (in the not-found case) offer a way out. Splitting along that line matches what monitoring tools actually do.

**Alternatives considered.**

- React Hot Toast. Rejected: `sonner` is the default in shadcn apps in 2026, integrates with Tailwind v4 via the same `tailwind-merge` setup, and ships with reduced-motion + theme support out of the box.
- No toasts at all (keep all states inline). Rejected: leaves no way to surface a non-fatal SSE reconnect; users would see stale data and assume it is correct.

### D7. React Flow gets `<ReactFlow colorMode="dark">` + canvas / edge overrides

**Choice.** `delegation-graph.tsx` configures React Flow with `colorMode="dark"` and a `theme` object that overrides `background`, `edge.stroke`, `node.background`, and `node.border` to use the design tokens. The MiniMap's `maskColor` and `nodeColor` callback are updated to use the same tokens.

**Rationale.** The current graph renders with React Flow's light theme by default — visibly white against the surrounding dark surface, which is jarring. `colorMode="dark"` is the documented toggle; combined with explicit token-based overrides it gives a coherent canvas that matches the rest of the dashboard.

**Alternatives considered.**

- Wrapping React Flow in a Tailwind-styled shell. Rejected: the canvas is rendered by React Flow, not Tailwind; only the prop-level theme + a CSS override on the canvas div affect it.
- Switching to a different graph library. Rejected: xyflow is the right tool; only its theme is wrong.

### D8. Failure-detection toggle: remove the button; reopen the conversation if/when the data model gains a `status` field

**Choice.** The "Failures Only" button at `session-detail.tsx:267-278` and its state + effect (`session-detail.tsx:96,144-169`) are removed in Wave 1. A `// TODO` at the call site notes the failure-detection design open question (data model does not yet carry a `status` or `error` field on `DelegationNode`). The button can be re-introduced in a later change when the data model is extended.

**Rationale.** Shipping a button that visibly does nothing is a worse experience than not shipping it. Removing it is honest; the `// TODO` keeps the design intent recoverable.

**Alternatives considered.**

- Wiring the toggle to a heuristic (e.g. "show nodes whose end time is missing"). Rejected: the heuristic would be wrong in the common case and would teach users to distrust the filter.
- Building a minimal `status` field on the frontend only. Rejected: the data lives in the OpenCode SQLite DB; the dashboard reads only, so the field would always be empty.

### D9. Dark mode is the default; the toggle stays

**Choice.** `theme-provider.tsx` is updated so the initial theme is `dark` (not `system` / `light`). The `<ThemeToggle />` in the header remains visible and continues to cycle through `light / dark / system`. Per memory `#71`, dark is the design's primary surface; the light theme exists as an accessibility and contrast-validation path, not as the default.

**Rationale.** The project memory already names dark as the design default; the codebase has the tokens for both themes but the light theme was wired as the initial state. Flipping the default is a one-line change in `theme-provider.tsx` and brings the running app into alignment with the documented design.

**Alternatives considered.**

- `system` as the default. Rejected: a developer dashboard benefits from a stable visual identity across sessions and machines; honoring OS theme can flicker the dashboard on every launch.

### D10. KPI tile upgrade path without a backend change

**Choice.** Each KPI tile in `kpi-section.tsx` gains a 7-day sparkline and a delta indicator (current period vs. previous period of equal length). If a per-metric time-series endpoint is absent, the tile falls back to a static sparkline shape (a flat line or the same shape duplicated for all tiles) and the delta shows a single icon with no number; both states are documented in the `dashboard-tiles` spec. A follow-up change can add the per-metric endpoint.

**Rationale.** The KPI upgrade is the most visible piece of Wave 1 and the most sensitive to the data shape. Decoupling it from a backend change keeps Wave 1 deployable today; the fallback is honest about what is and is not available; the follow-up is well-scoped.

**Alternatives considered.**

- Blocking Wave 1 on the per-metric endpoint. Rejected: adds scope, delays the visual wins, and the per-metric endpoint is its own design conversation.
- Computing the time series from `/api/sessions`. Rejected: a separate client-side computation per tile would duplicate work across the four tiles and would not be authoritative.

## Risks / Trade-offs

- **[R1] Token migration touches every component that uses an arbitrary value** → [Mitigation] Run a one-shot codemod to find every `bg-[hsl(var(--status-*))]` and friends; the test suite catches visual regressions; the migration is committed as a single PR with a screenshot diff before/after.
- **[R2] `recharts` direct usage may surface API quirks Tremor was hiding** → [Mitigation] Migrate one chart at a time (`cost-timeseries` first, easier); use the existing Tremor dark-mode axis CSS in `index.css:167-174` as a starting point; manual visual diff in the PR.
- **[R3] TanStack Table API is large and the shadcn recipe is a thin wrapper, so feature creep is easy** → [Mitigation] Scope the Wave 1 session list to: sort, per-column filter, column visibility, density toggle on the table. Pagination, row selection, server-side filtering are deferred to Wave 2.
- **[R4] Replacing the hand-rolled drawer may surface a hidden focus-management bug elsewhere on the page** → [Mitigation] Manual a11y smoke test (Tab through the page with the drawer open / closed); existing test for `session-detail` continues to apply.
- **[R5] `sonner` is an extra dep** → [Mitigation] `sonner` is a single file, ~3 KB gzipped, no peer deps beyond React; the design system already has a `<Toaster />` slot planned.
- **[R6] KPI fallback to a static sparkline may look like a bug** → [Mitigation] Document the fallback in the spec; the empty/loading state already covers "no data"; a `// ponytail:` comment marks the fallback as a known temporary.
- **[R7] Dropping the "Failures Only" button is a small user-facing regression** → [Mitigation] The button is currently dead; the regression is from "broken" to "absent," which is a net positive; the `// TODO` keeps the design intent recoverable.
- **[R8] React Flow theming touches internal CSS that may not survive a library upgrade** → [Mitigation] Pin `@xyflow/react` to the current minor; the `theme` prop is the documented public API; a follow-up test snapshots the canvas pixel area to catch theme drift.
- **[R9] Large diff in a single PR may be hard to review** → [Mitigation] PRs are split per task in the `tasks.md` (D1 tokens first, D3 charts second, D4 data-table third, D5 drawer fourth, D6 feedback fifth, D7 graph sixth, D8 dead-button removal seventh, D9 dark default eighth, D10 KPI ninth).
- **[R10] New `add` deps (`sonner`, `@tanstack/react-table`, `@radix-ui/react-collapsible`) increase the bundle** → [Mitigation] Net bundle delta after removing `@tremor/react` is negative or near-zero; the dep count goes up by 3 and down by 1.

## Migration Plan

Wave 1 ships as **9 sequential, independently mergeable PRs**, each with its own screenshot diff and its own test pass. The order is chosen so that the most disruptive change (Tremor removal) lands after the visual baseline (tokens, dark default) is in place — the chart migrations can then be visually diffed against a stable token system.

1. **PR1 — Token system** (D1, D2). `index.css` changes only; no component changes; a codemod or scripted find/replace is staged for the following PR.
2. **PR2 — Token migration** (D1 cont.). Every `bg-[hsl(var(--status-*))]` and friends becomes the new utility; screenshot diff in the PR; tests for affected components.
3. **PR3 — Dark default + collapse** (D9). `theme-provider.tsx`, `theme-toggle.tsx`; one-line visual change.
4. **PR4 — Sidebar nav** (sidebar nav, app-shell). `components/app-shell.tsx` rewrite; adds `@radix-ui/react-collapsible`.
5. **PR5 — `Failures Only` removal** (D8). `session-detail.tsx` and the unused `failureFilteredChain` effect; tests for the remaining scrubber / playback behavior.
6. **PR6 — Drawer via Radix Dialog** (D5). `node-detail-drawer.tsx` rewrite; `model` field formatter added in `features/session/lib/format.ts`; tests for the panel behavior.
7. **PR7 — Tremor removal + Recharts** (D3). `cost-timeseries.tsx` and `agent-breakdown.tsx` rewritten; `package.json` updated; `index.css:167-174` reviewed and pruned.
8. **PR8 — KPI tiles** (D10). `kpi-section.tsx` rewrite with sparkline + delta; tests for delta computation; spec for the fallback.
9. **PR9 — Data-table + sonner + React Flow theme** (D4, D6, D7). `components/ui/data-table.tsx` added; `main.tsx` mounts `<Toaster />`; `delegation-graph.tsx` theme + MiniMap updates; `session-list.tsx` migrated to the new data-table.

**Rollback strategy.** Each PR is independently revertable. PR1, PR3, PR5, PR9 (the sonner part) are zero-risk reverts. PR2, PR4, PR6, PR7, PR8, PR9 (data-table + graph) revert to the previous visual baseline without backend impact; the FastAPI build / Vite pipeline is unchanged. No database migration, no data-loss risk, no auth surface touched.

## Open Questions

- **OQ1.** Per-metric time-series endpoint — should the backend grow `/api/stats/timeseries?metric=...&days=7` in a follow-up change, or should the dashboard compute the sparkline client-side from `/api/sessions`? Current default: client-side compute; revisit if the dashboard scales beyond ~5k sessions.
- **OQ2.** Failure-detection on `DelegationNode` — when the OpenCode DB grows a `status` or `error` column on the delegation table, the `DelegationNode` Pydantic model and the frontend mirror need an extension. Out of scope for this wave; tracked as a future data-model change.
- **OQ3.** Density scale (`comfortable` 36px / `compact` 28px per memory `#76`) — Wave 1 introduces the data-table density toggle as a local setting; the global density toggle that affects the whole app is a Wave 2 concern.
- **OQ4.** The 10 agent color families in `features/session/lib/agent-colors.ts:29-100` currently hardcode raw Tailwind palette strings; Wave 1 leaves them as-is but the `design-tokens` spec lists them as a candidate for tokenization in a later wave.
- **OQ5.** `<ReactFlow colorMode="dark">` is a documented prop in xyflow v12 but the canvas background also requires a `Background` variant change (`<Background variant="dots" color="..." />`); confirm in PR9.
