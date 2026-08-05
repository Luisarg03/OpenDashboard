# Trace Visualization (Delegation Graph)

The delegation graph is the core component of the session view: it renders the
OpenCode agent delegation chain as an interactive React Flow graph, fed by
`GET /api/sessions/{id}/chain` and kept live by an SSE stream.

---

## Delegation Graph Rendering (React Flow)

The chain endpoint returns a flat `DelegationNode[]`. The SPA derives the
graph client-side:

| Element | Implementation |
|---------|---------------|
| Nodes | One React Flow node per `DelegationNode` (custom type `delegation`) |
| Edges | One directed edge per `parent_id` reference (derived in `chain-to-flow.ts`) |
| Layout | dagre (`rankdir: 'TB'`) with measured node dimensions, re-run on node-set changes |
| Navigation | React Flow built-in drag/zoom/pan + `MiniMap`, `Controls`, `Background` |
| Node content | Agent badge, model, title, cost, tokens, timestamps (`delegation-node.tsx`) |
| Performance | Custom nodes are `React.memo`ized; handlers are stable `useCallback`s |

The layout is computed top-to-bottom by delegation depth. For chains of
hundreds of nodes, memoized nodes and stable handlers keep interaction
responsive; `nodeTypes` is declared at module level to avoid remounts.

## Status Indication

The OpenCode DB does not store an explicit running/completed state. Status is
derived:

- Nodes streamed in via live-tail events are marked **running** (active).
- Everything else renders as **completed** with its recorded timestamps.

This replaces the legacy leaf-timestamp heuristic from the Jinja2 era: a node
is "running" because it was just delivered by the stream, not because it
happens to have the newest `time_created`.

## Timeline Slider

The timeline slider (`timeline-slider.tsx`) spans `[earliest_time, latest_time]`
of the chain and filters visible nodes by `time_created`, with the live view
(unfiltered) as the default.

```
earliest_time                                  latest_time
    │───────────────────●────────────────────────│
    ↑ slider value (cutoff)
```

Dragging the slider to a narrower window hides nodes created after the cutoff;
the slider always shows the full chain extent. In the legacy `tree.html` this
was DOM filtering over `<details>` wrappers — in the React version it is a
state-driven filter over the derived React Flow node set.

## Live Tail (SSE)

`useSessionEvents(sessionId)` opens an `EventSource` on
`/api/sessions/{id}/events` and merges events into the running view:

- **`node:new`** — appends the node + its edge to the graph and re-runs the
  layout for the added nodes; the node renders as running.
- **`session:updated`** — refreshes the session header/summary (cost/token
  totals) in place.
- **Heartbeat** — `: ping` comments keep the stream alive; no action needed.
- **Idle close** — after 300s without changes the server closes the stream and
  the UI transitions the session to its terminal state.

Connection drops rely on the native `EventSource` auto-reconnect with bounded
manual backoff; the UI surfaces a "reconnecting" state until the stream is
open again. Merging never triggers a full chain refetch.

## Focus Mode

Selecting a node zooms/pads the viewport to it (Motion-driven focus zoom),
dimming the rest of the canvas. It works together with the timeline slider:
the focus target is the selected node, and the slider still controls which
nodes exist in the viewport. This replaces the legacy `<details>`-based focus
toggle.

## Empty and Error States

- **Session not found** — the chain endpoint returns 404; the view shows a
  "session not found" message with a link back to the dashboard.
- **Empty chain** — zero nodes; the canvas shows an empty-state message and no
  graph is attempted.
- **Fetch/stream errors** — surfaced as UI state (error event from the stream
  or a failed query) instead of an unhandled exception.

## Color Coding

Agent colors are consistent across dashboard badges and graph nodes. State is
signaled by node border/halo styling rather than the legacy left-border
trick:

| State | Visual |
|-------|--------|
| Completed | Default border, recorded timestamps |
| Running | Accent border/halo (from live-tail delivery) |
| Focused | Highlighted, others dimmed |

## Performance Notes

- **Client-side graph build** is O(n) with a hash map — fine for chains up to
  hundreds of nodes.
- **dagre layout** re-runs only on node-set changes (initial load and live
  merges), not on every render.
- **Timeline filtering** is a state-driven filter over the derived node set —
  no DOM walks, no layout thrash.
- **No server-side rendering** — the browser owns all display work.
