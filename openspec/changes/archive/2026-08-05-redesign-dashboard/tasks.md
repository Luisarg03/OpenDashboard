## 1. Foundation — CSS Palette & Tremor Fix

- [x] 1.1 Replace CSS variables in `index.css` with dark-first palette (near-black bg, grayscale surfaces, indigo accent)
- [x] 1.2 Import `@tremor/react` CSS in `main.tsx` or `index.css`
- [x] 1.3 Update `@theme inline` block to map new CSS vars to Tailwind colors

## 2. Chart Visibility Fix

- [x] 2.1 Update `cost-timeseries.tsx` — add explicit white axis/label colors to AreaChart
- [x] 2.2 Update `agent-breakdown.tsx` — verify BarList renders with visible labels in dark mode
- [x] 2.3 Test both charts in dark mode to confirm axes are visible

## 3. Card & Component Elevation

- [x] 3.1 Update `card.tsx` — remove `shadow`, add `border-white/10` for dark mode elevation
- [x] 3.2 Update `dashboard.tsx` — remove gradient header, use clean solid background
- [x] 3.3 Update `kpi-section.tsx` — verify left-border accents work with new palette

## 4. Agent Color Brightness

- [x] 4.1 Update `agent-colors.ts` — use 400-level colors in dark mode, 500-level in light mode
- [x] 4.2 Update `delegation-graph.tsx` — MiniMap colors match new palette
- [x] 4.3 Update `delegation-node.tsx` — verify node styling with brighter agent colors
- [x] 4.4 Update `timeline-scrubber.tsx` — verify dot colors with new palette

## 5. Session List Polish

- [x] 5.1 Update `session-list.tsx` — refine hover states and borders for new palette
- [x] 5.2 Verify badge colors render correctly with updated agent colors

## 6. Light Mode Verification

- [x] 6.1 Verify light mode palette has sufficient contrast after dark-first changes
- [x] 6.2 Test all components in light mode to catch regressions

## 7. Build & Final Check

- [x] 7.1 Run `npm run build` to verify no TypeScript or build errors
- [x] 7.2 Visual spot-check: dashboard, session list, charts, graph nodes
