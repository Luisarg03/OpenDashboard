## ADDED Requirements

### Requirement: Status color semantics
The delegation graph SHALL use a fixed semantic color palette for node status: accent/blue for running, emerald for completed, rose for failed, purple for retry.

#### Scenario: Running node displays accent color
- **WHEN** a delegation node has status "running"
- **THEN** the node displays an accent/blue status indicator with pulse ring animation on the dot only

#### Scenario: Completed node displays emerald
- **WHEN** a delegation node has status "completed"
- **THEN** the node displays a static emerald dot with no animation

#### Scenario: Failed node displays rose
- **WHEN** a delegation node has status "failed"
- **THEN** the node displays a static rose dot and rose text for the status label

### Requirement: Pulse animation on dot only
The pulse animation SHALL be applied only to the status dot element, not to the entire card component.

#### Scenario: Pulse ring pattern
- **WHEN** a node is in running state
- **THEN** only the status indicator dot shows a pulse ring animation (double-dot pattern: solid dot + expanding ring)

### Requirement: MiniMap colored by status
The React Flow MiniMap SHALL color nodes by their current status using the same semantic palette.

#### Scenario: MiniMap reflects node statuses
- **WHEN** the delegation graph is rendered with nodes in various states
- **THEN** the MiniMap shows accent for running nodes, emerald for completed, rose for failed, and muted for idle

### Requirement: Edge time delta labels
Edges between parent and child nodes SHALL display the time delta (duration) between them.

#### Scenario: Edge shows time between nodes
- **WHEN** a parent node delegates to a child node
- **THEN** the connecting edge displays a label showing the time difference (e.g., "+2.3s")

### Requirement: FitView stability
FitView SHALL only execute when the layout data changes, not on every SSE node update.

#### Scenario: FitView on layout change
- **WHEN** a new layout is computed (new node added, topology changes)
- **THEN** the viewport fits to the graph with padding

#### Scenario: No FitView on status update
- **WHEN** an SSE event updates a node's status or tokens
- **THEN** the viewport does not re-fit or pan

### Requirement: Show Failures Only filter
The session detail page SHALL include a toggle to filter the graph to show only failed nodes and their ancestor chains.

#### Scenario: Filter enabled
- **WHEN** user enables "Show Failures Only" toggle
- **THEN** only nodes with status "failed" and their ancestors are visible in the graph

#### Scenario: Filter disabled
- **WHEN** user disables "Show Failures Only" toggle
- **THEN** all nodes are visible again
