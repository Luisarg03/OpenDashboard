## 1. Typography & Global Styles

- [x] 1.1 Add JetBrains Mono font to index.html via Google Fonts (font-display: swap, subset latin)
- [x] 1.2 Update index.css with global `font-variant-numeric: tabular-nums` and data font-family rule
- [x] 1.3 Verify JetBrains Mono loads correctly in delegation nodes and session list

## 2. Status Color Semantics

- [x] 2.1 Update delegation-node.tsx: replace emerald running status with accent/blue
- [x] 2.2 Implement double-dot pulse ring pattern for running status indicator
- [x] 2.3 Remove animate-pulse from entire card, apply only to dot element
- [x] 2.4 Update session-states.tsx badge colors to match new semantic palette (no status badges to update — uses agent colors)
- [x] 2.5 Update session-list.tsx status indicators (no status badges to update — uses agent colors)

## 3. MiniMap Status Coloring

- [x] 3.1 Add MiniMap to DelegationGraph component with nodeColor callback
- [x] 3.2 Implement status-based coloring (accent=running, emerald=completed, rose=failed)
- [x] 3.3 Configure MiniMap dimensions and maskColor for dark mode

## 4. Edge Labels & FitView Stability

- [x] 4.1 Add time delta calculation between parent and child nodes
- [x] 4.2 Implement edge labels showing duration (e.g., "+2.3s")
- [x] 4.3 Refactor FitView to execute only on layoutData change (Airflow pattern)
- [x] 4.4 Ensure SSE status updates use updateNode instead of full re-layout

## 5. Node Detail Drawer

- [x] 5.1 Create NodeDetailDrawer component (400px right drawer)
- [x] 5.2 Implement drawer open/close with Escape key and outside click
- [x] 5.3 Wire drawer to delegation-graph via useOnSelectionChange
- [x] 5.4 Display node details: agent, model, tokens, cost, duration, status, timestamps
- [x] 5.5 Implement mobile bottom sheet variant for <640px viewports

## 6. Show Failures Only Filter

- [x] 6.1 Add "Show Failures Only" toggle to session detail header
- [x] 6.2 Implement filter logic: show only failed nodes + ancestors
- [x] 6.3 Ensure filter integrates with timeline scrubber

## 7. Aggregated/Expanded View Toggle

- [x] 7.1 Create aggregated layout utility: group nodes by agent name with counter
- [x] 7.2 Implement cycle detection for repeated agent invocations
- [x] 7.3 Add toggle UI to session detail page
- [x] 7.4 Wire toggle to graph rendering (aggregated vs expanded)
- [x] 7.5 Persist toggle state across node selections

## 8. Verification

- [x] 8.1 Run `npm run build` to verify no TypeScript errors
- [x] 8.2 Run `npm run lint` to verify no lint errors
- [x] 8.3 Manual test: verify status colors, pulse animation, drawer, filters
- [x] 8.4 Verify MiniMap reflects node statuses correctly
- [x] 8.5 Verify FitView only triggers on layout change, not SSE updates
