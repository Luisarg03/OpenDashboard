## Context

OpenDashboard's frontend uses React 19 + Vite 5 + Tailwind CSS v4 + shadcn/ui + Tremor 3 + React Flow. Previous token changes (status colors, bloom glow, radius standardization, accent removal) were applied but the visual design remains "arcaico" because components still use semi-transparent borders, hardcoded colors, raw JSON metadata, and flat layouts. The dashboard and session detail pages need concrete visual polish to match modern data-tool aesthetics.

Current state from screenshots: KPI cards are flat boxes with barely visible accent borders, session rows have semi-transparent borders that vanish in dark mode, the delegation graph container lacks definition, the timeline scrubber track is nearly invisible, controls are ungrouped, and session metadata displays raw JSON.

## Goals / Non-Goals

**Goals:**
- Headers as section dividers (border-b) instead of floating cards
- Solid borders everywhere (no /50 or /60 opacity)
- Proper visual containers for controls and stats
- Readable metadata extraction from JSON
- Status tokens + bloom for all status indicators
- Better timeline scrubber visibility
- Consistent hover states across interactive elements

**Non-Goals:**
- New components or component API changes
- Chart visual overhaul (gradients, dither, etc.)
- Icon motion presets
- View Transitions API
- Layout restructuring (sidebar, page structure)
- Performance optimizations

## Decisions

### D1: Headers use border-b, not card treatment

**Decision**: Both dashboard header and session detail header use `border-b border-border p-6` without background, rounded corners, or gradient.

**Rationale**: Headers are page sections, not floating elements. CompAI uses `border-b` for AppHeader. Card treatment on headers creates unnecessary visual weight and the `from-primary/5` gradient was invisible (5% opacity).

**Alternatives considered**:
- Keep card with visible gradient: Rejected — adds complexity, gradient was intentionally subtle which means it's invisible
- Full-bleed colored header: Rejected — too heavy for a data tool

### D2: All borders fully opaque

**Decision**: Replace all `border-border/50` and `border-border/60` with `border-border` (100% opacity).

**Rationale**: Semi-transparent borders disappear in dark mode against dark backgrounds. CompAI uses solid `#e2e2e2` (light) / `#2a2a2a` (dark) borders. Our tokens are already opaque; the opacity is applied at the component level.

**Alternatives considered**:
- Increase to /80: Rejected — still not fully solid, inconsistent
- Use different tokens for dark: Rejected — already handled by CSS variables

### D3: Controls grouped in visual container

**Decision**: Playback controls (play/pause, reset, speed) and filter toggles (failures only, view mode) wrapped in `rounded-lg border border-border bg-card p-1` with vertical separators between groups.

**Rationale**: Ungrouped buttons floating in space lack visual hierarchy. Grouping them in a container with separators creates clear functional groups: filters | playback | speed.

**Alternatives considered**:
- Keep ungrouped: Rejected — current state looks disorganized
- Use a toolbar component: Rejected — overkill for 5 buttons

### D4: Metadata extraction from JSON

**Decision**: When `session.model` is a JSON string or object, extract `.id` field for display. Fallback to string representation.

**Rationale**: Raw JSON `{"id":"mimo-v2.5-free","providerID":"opencode"}` is unreadable. The model ID is the only user-relevant field.

**Alternatives considered**:
- Parse and show all fields: Rejected — too verbose
- Hide model entirely: Rejected — useful information

### D5: Status indicators use tokens + bloom

**Decision**: All status dots (stream status, live-tail badge, delegation node dots) use `--status-*` CSS tokens and optional `bloom-low` class.

**Rationale**: Consistency with the token system established in the previous change. Bloom adds the "alive" signal without complexity.

**Alternatives considered**:
- Keep hardcoded colors: Rejected — contradicts token system
- Add bloom to all dots: Rejected — too noisy

### D6: Timeline scrubber track h-0.5, handle h-5

**Decision**: Track height from `h-px` (1px) to `h-0.5` (2px). Handle from `h-4 w-4` to `h-5 w-5`.

**Rationale**: 1px track is nearly invisible on high-DPI screens. 2px is the minimum for visual presence. Larger handle improves grab target.

**Alternatives considered**:
- h-1 track: Rejected — too thick for a scrubber
- h-6 handle: Rejected — too large, overwhelms the track

### D7: Graph container gets full card treatment

**Decision**: Graph wrapper uses `rounded-lg border border-border bg-card p-2` instead of `rounded-md border`.

**Rationale**: The graph is the main content area of the session page. It needs visual definition separate from the page background. `p-2` prevents nodes from touching the border.

**Alternatives considered**:
- No background (transparent): Rejected — blends into page background
- rounded-xl: Rejected — too round for a large container

### D8: Filters wrapped in subtle card

**Decision**: DashboardFilters gets wrapper `rounded-lg border border-border bg-card p-3`.

**Rationale**: Filters floating without context look disconnected. A subtle card groups them visually.

**Alternatives considered**:
- No wrapper: Rejected — current state looks disconnected
- Full card with header: Rejected — overkill for a filter bar

## Risks / Trade-offs

- **Risk: Removing header card reduces visual weight** → Mitigation: The border-b provides sufficient separation. If too subtle, can add bg-muted/30.
- **Risk: Controls container adds complexity** → Mitigation: Simple CSS wrapper, no new components.
- **Risk: Metadata extraction fails on unexpected JSON shapes** → Mitigation: Fallback to JSON.stringify for unknown shapes.
- **Risk: Thicker scrubber track changes layout** → Mitigation: 1px difference, negligible impact.
- **Trade-off: Less "playful" than gradient header** → Accepted: Enterprise data tools prioritize clarity over decoration.
