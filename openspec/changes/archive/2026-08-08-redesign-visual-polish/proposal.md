## Why

The dashboard and session detail pages look "arcaico" compared to modern data tools like CompAI CRM. Previous token changes (status colors, bloom, radius) are foundational but invisible — the components still use semi-transparent borders, hardcoded colors, raw JSON metadata, and flat layouts without visual hierarchy. This change addresses the actual visual design: headers, cards, session rows, graph containers, controls, and timeline scrubber.

## What Changes

- **Headers**: Remove `rounded-xl` cards and invisible gradients; use `border-b` as section dividers
- **Session rows**: Solid borders (`border-border` not `/60`), proper hover states (`bg-muted/50`)
- **Graph container**: Proper border, background, padding, rounded corners
- **Controls**: Group playback/filter buttons in a visual container with separators
- **Timeline scrubber**: Thicker track (h-0.5), larger handle (h-5), better visibility
- **Metadata**: Extract readable model name from JSON blob
- **Stream status**: Use status tokens + bloom glow instead of hardcoded emerald/red
- **Stats bar**: Container with `bg-muted/50` for visual separation
- **KPI cards**: Remove invalid `ring-border`, use `border-l-[3px]`
- **Charts**: Explicit `border border-border p-5` instead of `ring-border`
- **Filters**: Wrap in subtle card container
- **Hardcoded colors**: Replace `bg-emerald-500`, `bg-red-500`, `border-amber-500/40` with status tokens

## Capabilities

### New Capabilities

- `visual-header-treatment`: Headers as section dividers (border-b) instead of floating cards
- `visual-controls-grouping`: Playback/filter controls in grouped containers with separators
- `visual-metadata-display`: Readable metadata extraction from raw JSON model fields

### Modified Capabilities

- `session-row-styling`: Solid borders, proper hover states, status token usage
- `graph-container-styling`: Border, background, padding, radius for delegation graph
- `timeline-scrubber-styling`: Thicker track, larger handle, better visibility
- `kpi-card-styling`: Remove ring-border, adjust border-l width
- `chart-card-styling`: Explicit border and padding instead of ring-border

## Impact

- **Files**: `dashboard.tsx`, `session-detail.tsx`, `kpi-section.tsx`, `cost-timeseries.tsx`, `agent-breakdown.tsx`, `session-list.tsx`, `dashboard-filters.tsx`, `timeline-scrubber.tsx`, `scrubber-stats.tsx`, `delegation-graph.tsx`
- **Dependencies**: None added or removed
- **Breaking**: No API changes. Visual-only. Existing behavior preserved.
