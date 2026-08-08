## Why

The dashboard's visual design is generic and inconsistent. The color palette lacks personality, Tremor charts render invisible axes in dark mode, and the overall aesthetic doesn't match modern data-tool standards (Linear, Vercel, Raycast). This hurts usability and perceived quality.

## What Changes

- **Dark-first palette**: Replace current indigo/teal scheme with a Linear/Vercel-inspired dark-first design — near-black base, grayscale surfaces, single vivid accent color
- **Tremor chart fix**: Import `@tremor/react` CSS and configure axes/labels for dark mode visibility
- **Card elevation**: Remove shadows, use border-only elevation with ultra-subtle white borders
- **KPI redesign**: JetBrains Mono for data values, cleaner left-border accents
- **Session list polish**: Subtle hover states, better visual hierarchy
- **Graph node styling**: Brighter agent colors in dark mode, matching new palette
- **Remove gradient header**: Replace with clean minimal header

## Capabilities

### New Capabilities

- `design-system`: Dark-first color palette, typography scale, elevation model, and component token definitions

### Modified Capabilities

<!-- No existing specs to modify -->

## Impact

- **Frontend CSS**: `frontend/src/index.css` — complete palette overhaul
- **Tremor integration**: `frontend/src/main.tsx` or `index.css` — add missing CSS import
- **Dashboard components**: `cost-timeseries.tsx`, `agent-breakdown.tsx`, `kpi-section.tsx`, `session-list.tsx`, `dashboard.tsx`
- **Session components**: `delegation-node.tsx`, `delegation-graph.tsx`, `timeline-scrubber.tsx`
- **UI primitives**: `card.tsx`, `badge.tsx`, `button.tsx`
- **Dependencies**: No new dependencies needed — uses existing Tailwind + Tremor
