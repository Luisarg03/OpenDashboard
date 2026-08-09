## 1. Headers — Section divider treatment

- [x] 1.1 Dashboard header: replace `rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6` with `border-b border-border p-6` in `frontend/src/pages/dashboard.tsx`
- [x] 1.2 Session detail header: replace `rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6` with `border-b border-border p-6` in `frontend/src/pages/session-detail.tsx`

## 2. Borders — Solid opacity

- [x] 2.1 Session list row: replace `border-border/60` with `border-border` and `hover:bg-accent/10` with `hover:bg-muted/50` in `frontend/src/features/dashboard/components/session-list.tsx`
- [x] 2.2 Dashboard filters: replace `border-border/50` with `border-border` in `frontend/src/features/dashboard/components/dashboard-filters.tsx`

## 3. KPI cards — Fix invalid styles

- [x] 3.1 Remove `ring-border` class and change `border-l-4` to `border-l-[3px]` in `frontend/src/features/dashboard/components/kpi-section.tsx`

## 4. Chart cards — Explicit border

- [x] 4.1 Cost timeseries: replace `ring-border` with `border border-border p-5` in `frontend/src/features/dashboard/components/cost-timeseries.tsx`
- [x] 4.2 Agent breakdown: replace `ring-border` with `border border-border p-5` in `frontend/src/features/dashboard/components/agent-breakdown.tsx`

## 5. Session detail — Controls, graph, metadata

- [x] 5.1 Graph container: replace `h-[600px] rounded-md border` with `h-[600px] rounded-lg border border-border bg-card p-2` in `frontend/src/pages/session-detail.tsx`
- [x] 5.2 Controls: wrap playback buttons in `rounded-lg border border-border bg-card p-1` with vertical separators in `frontend/src/pages/session-detail.tsx`
- [x] 5.3 Metadata: extract `.id` from `session.model` JSON for readable display in `frontend/src/pages/session-detail.tsx`
- [x] 5.4 Stream status dot: replace `streamStatusColor` hardcoded colors with status tokens + bloom in `frontend/src/pages/session-detail.tsx`

## 6. Timeline scrubber — Visibility

- [x] 6.1 Track: change `h-px` to `h-0.5` for the scrubber track in `frontend/src/features/session/components/timeline-scrubber.tsx`
- [x] 6.2 Handle: change `h-4 w-4` to `h-5 w-5` and add `hover:scale-110 transition-transform` in `frontend/src/features/session/components/timeline-scrubber.tsx`
- [x] 6.3 Live-tail badge: replace `bg-emerald-500` with `bg-[hsl(var(--status-success))]` in `frontend/src/features/session/components/timeline-scrubber.tsx`

## 7. Scrubber stats — Container

- [x] 7.1 Wrap stats in `rounded-md bg-muted/50 px-3 py-1.5 text-xs` container in `frontend/src/features/session/components/scrubber-stats.tsx`

## 8. Delegation graph — Token colors

- [x] 8.1 Replace hardcoded MiniMap colors (`#6366f1`, `#10b981`, `#52525b`) with status tokens in `frontend/src/features/session/components/delegation-graph.tsx`

## 9. Dashboard filters — Card wrapper

- [x] 9.1 Wrap filters in `rounded-lg border border-border bg-card p-3` container in `frontend/src/features/dashboard/components/dashboard-filters.tsx`

## 10. Verification

- [x] 10.1 TypeScript compilation check: `rtk tsc -b --noEmit`
- [x] 10.2 Vite build check: `rtk vite build`
- [x] 10.3 Visual verification: review all modified files for consistency
