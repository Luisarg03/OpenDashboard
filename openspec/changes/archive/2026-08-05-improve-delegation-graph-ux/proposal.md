## Why

The delegation graph and session detail page have functional foundations but lack the visual polish and interaction patterns that make observability tools like Jaeger, Honeycomb, and Langfuse effective. Current issues: running state uses emerald animate-pulse on entire cards (ruidoso), no side panel for node inspection (forces modal or navigation), no aggregated view for chains with repetitions, inconsistent typography for data (timestamps/tokens mix sans-serif), and the graph re-layouts on every SSE update (jitter). These gaps reduce scannability and make debugging agent delegation harder than it should be.

## What Changes

- Fix status semantics: running = blue/accent pulse ring on dot only (not animate-pulse on card), completed = emerald static, failed = rose static
- Add side panel (drawer right 400px) for node detail inspection on click, replacing current hover-only info
- Add Aggregated/Expanded toggle for delegation chains (Langfuse pattern): collapse repeated agent steps with counter vs expand as individual nodes
- Add JetBrains Mono for data layer: timestamps, token counts, IDs, model names, costs
- Make tabular-nums global in index.css instead of per-component
- Stabilize graph updates: FitView only when layout changes (not on every SSE node:new), use updateNode for partial mutations
- Add MiniMap colored by node status (running/completed/failed)
- Add "Show Failures Only" filter toggle
- Add edge labels showing time deltas between parent→child

**BREAKING**: None. All changes are additive or visual refinements.

## Capabilities

### New Capabilities
- `delegation-graph-polish`: Visual refinements to React Flow delegation graph — status colors, MiniMap, edge labels, FitView stability
- `node-detail-drawer`: Side panel for inspecting delegation node details on click
- `aggregated-chain-view`: Toggle between aggregated (collapsed repeated steps) and expanded (individual nodes) chain views
- `data-typography`: Monospace font for data values, global tabular-nums

### Modified Capabilities
- (none — no existing spec-level requirements change)

## Impact

- Affected code: `frontend/src/features/session/components/delegation-node.tsx`, `delegation-graph.tsx`, `session-detail.tsx`, `index.css`, `agent-colors.ts`
- New files: `node-detail-drawer.tsx`, possibly `aggregated-graph.tsx`
- Dependencies: JetBrains Mono font (add via Google Fonts or npm package)
- No API changes, no backend changes, no breaking changes
