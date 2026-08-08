# delegation-graph-view Spec

## Purpose

Render the OpenCode agent delegation chain as an interactive graph using `@xyflow/react` 12: automatic hierarchical layout, drag/zoom/pan navigation, and custom nodes showing per-node state (agent, model, title, cost, tokens, timestamps). The graph is a read-only viewer backed by the FastAPI JSON endpoint `GET /api/sessions/{id}/chain`; it must handle chains from tens to hundreds of nodes without degrading.

## Requirements

### REQ-1: Render chain as graph

The system MUST render a session's delegation chain as a React Flow graph: one node per `DelegationNode` from `GET /api/sessions/{id}/chain`, one directed edge per `parent_id` reference, using the flat node list (edges derived client-side, no server-side tree building needed).

#### Scenario: Load session graph

- **WHEN** the user opens `/session/:id` and the chain fetch succeeds
- **THEN** every node in the chain is rendered on the canvas and every delegation relationship is visible as a directed edge

### REQ-2: Drag, zoom, and pan

The system MUST support viewport navigation via React Flow's built-in drag/zoom/pan, with `MiniMap`, `Controls`, and `Background` enabled.

#### Scenario: Navigate large chain

- **WHEN** the user drags the canvas, scrolls to zoom, or uses the minimap/controls
- **THEN** the viewport moves smoothly and the graph remains interactive

### REQ-3: Automatic layout with dagre

The system MUST lay out the graph hierarchically with `@dagrejs/dagre` (`rankdir: 'TB'`), using measured node dimensions, and re-run the layout when the node set changes (initial load and live merges).

#### Scenario: Layout hundreds of nodes

- **WHEN** a chain with hundreds of nodes is loaded or a live update adds nodes
- **THEN** nodes are positioned top-to-bottom by delegation depth with no overlaps and no manual repositioning required

### REQ-4: Custom nodes with state

The system MUST render custom node components (type `delegation`) showing agent, model, title, cost, token usage, and timestamps, with `nodeTypes` declared at module level to avoid remounts.

#### Scenario: Node content

- **WHEN** a node is rendered
- **THEN** it displays the agent badge, model, title, cost, and token totals from the `DelegationNode` payload

#### Scenario: Large chain stays responsive

- **WHEN** the chain grows beyond a few hundred nodes
- **THEN** custom nodes are memoized (`React.memo`) and handlers are stable (`useCallback`) so interaction and updates stay responsive

### REQ-5: Live node merging

The system MUST merge newly emitted `node:new` SSE events into the existing graph state (append node + edge) without a full page reload or full chain refetch.

#### Scenario: New delegation appears during a run

- **WHEN** `useSessionEvents` receives a `node:new` event for the open session
- **THEN** the new node and its edge appear in the graph in place and the layout re-runs for the added nodes

### REQ-6: Timeline slider

The system MUST provide a timeline slider spanning `[earliest_time, latest_time]` of the chain that filters visible nodes by `time_created`, with the live view as the default (unfiltered) state.

#### Scenario: Scrub chain over time

- **WHEN** the user drags the timeline slider to a narrower window
- **THEN** only nodes whose `time_created` falls in the window remain visible, and the slider shows the full chain extent

### REQ-7: Status indication

The system MUST show per-node status where derivable: nodes streamed as active via live-tail events render as running; otherwise nodes render as completed with their recorded timestamps (status is not stored in the DB).

#### Scenario: Active session during a run

- **WHEN** the graph is open on a live session and SSE is delivering updates
- **THEN** recently emitted nodes are visibly marked as active/running

### REQ-8: Empty and error states

The system MUST handle a missing session (404 from the API), an empty chain, and fetch/connection errors with distinct, readable UI states instead of a blank canvas.

#### Scenario: Session not found

- **WHEN** `/api/sessions/{id}` returns 404
- **THEN** the graph view shows a "session not found" message with a link back to the dashboard

#### Scenario: Empty chain

- **WHEN** the chain endpoint returns zero nodes
- **THEN** the canvas shows an empty-state message and no graph is attempted
