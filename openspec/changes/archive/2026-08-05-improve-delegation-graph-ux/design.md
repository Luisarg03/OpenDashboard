## Context

OpenDashboard is a FastAPI + React 19 SPA that visualizes OpenCode agent delegation chains. The frontend uses React Flow 12 with a custom cascade layout, TanStack Query for server state, SSE for live updates, and shadcn/ui + Tailwind v4 for styling. The delegation graph renders agent nodes as cards connected by smoothstep edges, with a timeline scrubber for time-based filtering.

Current issues identified through research (Jaeger ADR-0003, Honeycomb trace waterfall, Langfuse agent graphs, flightdeck timeline, kiroxy design system, Linear design system):
- Status colors are semantically wrong (running = emerald, should be blue/accent)
- animate-pulse on entire cards creates visual noise
- No side panel for node detail (hover-only loses context on mobile)
- No aggregated view for chains with repeated agent steps
- Data values (timestamps, tokens) use sans-serif, reducing scannability
- Graph re-layouts on every SSE node:new event (jitter)
- MiniMap not colored by status

## Goals / Non-Goals

**Goals:**
- Fix status color semantics to match industry consensus (running=accent, completed=emerald, failed=rose)
- Reduce visual noise by moving pulse animation to dot-only pattern
- Add side panel (drawer) for node inspection without losing graph context
- Add aggregated/expanded toggle for chains with repetitions
- Standardize data typography with JetBrains Mono
- Stabilize graph updates during live streaming
- Add MiniMap colored by node status
- Add "Show Failures Only" filter

**Non-Goals:**
- New backend API endpoints (all data already available)
- Redesigning the entire dashboard page
- Changing the cascade layout algorithm
- Adding new visualization types (flame graph, sunburst)
- Mobile-optimized graph (Airflow pattern: fallback to list/grid on <640px)

## Decisions

### 1. Status Color System
**Decision**: Adopt Jaeger ADR-0003 pattern — qualitative palette for agent identity (existing hash-based) + fixed semantic palette for state.

- Running: `accent` (#5E6AD2 or oklch equivalent) with pulse ring on dot
- Completed: `emerald-500` static dot
- Failed: `rose-500` static dot + text
- Retry: `purple-500` with dashed edge

**Rationale**: Consistent with Jaeger, Honeycomb, Airflow, Temporal. Color + dot + text satisfies WCAG 1.4.1 (no color-only signal).

**Alternative considered**: Keep current emerald for running. Rejected — emerald universally means "success" in observability tools; using it for "running" creates confusion.

### 2. Pulse Animation Pattern
**Decision**: Replace `animate-pulse` on card with double-dot pattern on status indicator only.

```tsx
<span className="relative flex h-1.5 w-1.5">
  <span className="absolute inset-0 rounded-full bg-[--accent]" />
  <span className="absolute inset-0 rounded-full bg-[--accent] animate-[pulse-ring_1.6s_ease-in-out_infinite]" />
</span>
```

**Rationale**: flightdeck, kiroxy, and Linear all use this pattern. Pulse on entire card is "decorative animation" which kiroxy explicitly rejects ("No @keyframes pulse unless something is actually pulsing").

### 3. Side Panel (Drawer) for Node Detail
**Decision**: Right-side drawer (400px default, 560px inspector) triggered by node click, not hover.

**Rationale**: Jaeger ADR-0006 and Honeycomb sidebar both use this pattern. Drawer preserves graph context (graph stays visible on left). Hover-only loses context on mobile and doesn't support deep inspection.

**Alternative considered**: Modal/dialog. Rejected — kiroxy: "default to drawer over dialog for inspect operations". Modal obscures the graph.

### 4. Aggregated/Expanded Toggle
**Decision**: Implement Langfuse Agent Graphs pattern — toggle between aggregated (node per agent name with counter) and expanded (node per individual call).

**Rationale**: Chains often repeat the same agent (retries, loops). Aggregated view answers "what did this agent do and how complex?"; expanded answers "what happened exactly?". Both are correct, serving different debugging questions.

**Implementation**: Aggregate client-side by grouping nodes with same `agent` field, drawing cycle edges for loops. Expand shows original DAG.

### 5. Typography for Data
**Decision**: Add JetBrains Mono via Google Fonts, apply to all data values (timestamps, tokens, IDs, costs, model names). Make `tabular-nums` global.

**Rationale**: Linear: "the mono isn't decorative, it's signaling 'this is a literal value'". Bloomberg/Grafana lineage: monospace for dense data on dark canvas. Global `tabular-nums` prevents number jitter in live-updating values.

### 6. FitView Stability
**Decision**: Follow Airflow 3.x FitViewOnLayout pattern — `fitView` only when layoutData changes, not on every node update.

```tsx
useEffect(() => {
  if (layoutData !== undefined) void fitView({ padding: 0.1 });
}, [layoutData, fitView]);
```

**Rationale**: microsoft/agent-framework and activepieces both use this pattern. SSE events should use `updateNode(id, fn)` for partial mutations, not regenerating the entire graph.

### 7. MiniMap Coloring
**Decision**: Color MiniMap nodes by status using same semantic palette.

```tsx
<MiniMap nodeColor={(node) => {
  const status = node.data?.status;
  if (status === 'running') return 'var(--accent)';
  if (status === 'failed') return 'var(--destructive)';
  return 'var(--muted)';
}} />
```

**Rationale**: crabwalk ActionGraph uses this exact pattern. MiniMap becomes a status overview at a glance.

## Risks / Trade-offs

[Aggregated view complexity] → Aggregating client-side adds ~100 lines of grouping logic. Mitigation: keep it in a separate `aggregated-layout.ts` file, test with known chain patterns.

[JetBrains Mono load time] → Adding a font increases initial load. Mitigation: use `font-display: swap` and subset to latin characters only. The font is ~300KB woff2, acceptable for a dev tool.

[Drawer on mobile] → 400px drawer unusable on <640px screens. Mitigation: on mobile, drawer slides up as full-screen bottom sheet (pattern from flightdeck).

[FitView delay] → Only fitting on layout change means new SSE nodes don't auto-center. Mitigation: add optional "follow mode" toggle that enables fit-on-node for live debugging sessions.

## Migration Plan

1. Add JetBrains Mono to index.html (Google Fonts link with font-display: swap)
2. Update index.css with global tabular-nums and font-family for data
3. Update delegation-node.tsx status colors and pulse pattern
4. Add node-detail-drawer.tsx component
5. Wire drawer to delegation-graph via useOnSelectionChange
6. Add MiniMap with status coloring
7. Implement aggregated layout logic
8. Add FitView stability (useEffect on layoutData)
9. Add "Show Failures Only" filter toggle
10. Add edge time delta labels

No backend changes. No API changes. All frontend-only.

## Open Questions

- Should the drawer be persistent (always open when a node is selected) or toggleable? Recommendation: persistent on desktop, toggleable on mobile.
- Should "Show Failures Only" filter apply to the timeline scrubber as well? Recommendation: yes, for consistency.
