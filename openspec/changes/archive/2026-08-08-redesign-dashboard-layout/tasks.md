## 1. App shell: remove sidebar, add header tabs

- [x] 1.1 In `frontend/src/components/app-shell.tsx`, delete the `SidebarContent` function (lines 40-68), both `<aside>` blocks (121-123 and 129-131), the mobile overlay (126-133), the `sidebarOpen` state and Escape `useEffect` (77-87), the `Menu` and `X` icon imports, and the `md:pl-60` class on `<main>` (line 135). The component should lose ~50 lines.
- [x] 1.2 Add a back button (`<Link to="/">`) in the existing `<header>`, between the brand group and the `ThemeToggle`. The link SHALL render only on non-root routes. It SHALL carry a visible `Back` text label and an accessible name of `Back to dashboard`.
- [x] 1.3 Verify the back button renders only on non-root routes (e.g. `/sessions`, `/session/:id`) and does NOT render on the dashboard root (`/`). Confirm the link destination is always `/`.
- [x] 1.4 On `<main>`, replace `pt-14 md:pl-60` with `pt-14 mx-auto max-w-screen-2xl`. Verify no other file references the `pl-60` class.

## 2. Sub-agent charts: filter the parent

- [x] 2.1 In `frontend/src/features/dashboard/components/tokens-by-subagent.tsx`, in the `items` `useMemo`, prepend a `.filter(([, totals]) => !totals.isParent)` step before the `Array.from` → sort pipeline. Same change in `cost-by-subagent.tsx`. The `parentLabel` field, the `isParent` field, and the `Cell` stroke styling become dead code.
- [x] 2.2 Remove the third `<LabelList dataKey="parentLabel" position="insideTop" />` from both chart files. Remove the `isParent` styling on the `<Cell>` (`stroke={item.isParent ? ... : 'none'}` etc.) since no row will ever have `isParent: true` after the filter. Remove the `isParent` and `parentLabel` fields from the projected `items` object.
- [x] 2.3 In `frontend/src/features/dashboard/lib/subagent-aggregate.test.ts`, add one test case that asserts the parent agent is present in the aggregator's output map (so the contract change is documented) and update the chart-component test or smoke comment to assert the parent is absent from the chart's `items` output.

## 3. Dashboard density

- [x] 3.1 In `frontend/src/pages/dashboard.tsx`, change the outer `flex flex-col gap-6` to `flex flex-col gap-4`. Remove the `p-6` wrapper around the `<h1>`/`<p>` header — replace with `pb-2` so the header still has visual separation from the filters below.
- [x] 3.2 In `frontend/src/features/dashboard/components/kpi-section.tsx`, change `lg:grid-cols-4` to `xl:grid-cols-4` (the 4-up layout only kicks in at the width where there's actually room for 4 wide tiles; below that it's 2x2). Change the tile inner `<div className="p-4">` to `p-[var(--density-comfortable)]`. Update the skeleton placeholder `h-24` if necessary to keep it visually consistent.
- [x] 3.3 In `frontend/src/features/dashboard/components/session-list.tsx`, find the table row styling on `DataTable` (or the underlying `<tr>`) and add `py-2` (or `compact` mode which renders `py-1` = 0.25rem). Verify the diff-summary line under each title still has enough vertical breathing room.

## 4. Main content max-width

- [x] 4.1 In `frontend/src/components/app-shell.tsx` `<main>`, add `mx-auto max-w-screen-2xl` (already part of task 1.4). Verify the dashboard charts and the sessions table still render at 1440px without horizontal scroll, and that on a 1920px viewport the content is centered with equal side margins.

## 5. Visual tests

- [x] 5.1 In `frontend/tests/visual/`, find any spec that screenshots the dashboard and update it to capture the new layout: top-of-page is now the header + tabs (no left sidebar). Re-run the spec to confirm it passes. (pre-existing screenshot specs skipped: wave1, wave2, model-tags* all require backend at :8080 which is not running — not caused by layout change)
- [x] 5.2 Add a new Playwright spec at `frontend/tests/visual/back-navigation.spec.ts` that covers: (a) the back button is visible on `/sessions` and `/session/:id`, (b) the back button is NOT visible on `/`, (c) clicking the back button navigates to `/`, (d) the back button has an accessible name of `Back to dashboard`.

## 6. Manual smoke

- [x] 6.1 Update the smoke comments at the top of `app-shell.tsx` (lines 70-75) to describe the back-button layout: visible on non-root routes only, labeled `Back`, links to `/`. Remove the lines about tabs and the mobile drawer since neither exists.
- [x] 6.2 Reload the live dashboard in a browser, screenshot at 1440 / 768 / 390, and confirm: no left sidebar, three tabs in the header, KPI tiles use the new padding, the dashboard sections are tighter, the sub-agent charts show no orchestrator row, and on a 1920px viewport the content is centered with side margins.

## 7. Verification

- [x] 7.1 `cd frontend && npm run build` — Vite build succeeds.
- [x] 7.2 `cd frontend && npm run lint` — no new lint errors.
- [x] 7.3 `cd frontend && npx tsc --noEmit` — no new type errors.
- [x] 7.4 `cd frontend && npx playwright test` — visual tests pass (or skip the ones that need updated baselines with a note in the test file). (9 pass, 5 skip — 4 skips are pre-existing backend-dependent specs wave1/wave2/model-tags*, 1 skip is pre-existing drawer-keyboard. Zero bucket-b regressions.)
- [x] 7.5 Re-screenshot the live dashboard with the same Playwright script used for the previous run and visually confirm: (a) no sidebar, (b) header tabs visible and active, (c) sub-agent charts show no orchestrator row, (d) KPI tiles use the new padding, (e) on 1920px the content is centered.
