## ADDED Requirements

### Requirement: Aggregated/Expanded toggle
The session detail page SHALL include a toggle to switch between aggregated and expanded views of the delegation chain.

#### Scenario: Aggregated view collapses repeated agents
- **WHEN** user selects "Aggregated" view mode
- **THEN** nodes with the same agent name are collapsed into a single node showing a counter (e.g., "orchestrator (3)")

#### Scenario: Expanded view shows all nodes
- **WHEN** user selects "Expanded" view mode
- **THEN** all individual delegation nodes are shown as separate nodes in the graph

### Requirement: Cycle detection in aggregated view
The aggregated view SHALL detect and display cycles (repeated agent invocations) as loop edges.

#### Scenario: Loop displayed as cycle edge
- **WHEN** the same agent appears multiple times in a chain creating a cycle
- **THEN** the aggregated view draws a cycle edge back to the agent node with a loop counter

### Requirement: Toggle persistence
The aggregated/expanded toggle state SHALL persist across node selections within the same session.

#### Scenario: Toggle state preserved
- **WHEN** user switches to aggregated view and then selects a different session
- **THEN** the view mode remains aggregated for the new session
