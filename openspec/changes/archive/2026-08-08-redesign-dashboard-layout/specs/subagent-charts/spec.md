## ADDED Requirements

### Requirement: Sub-agent charts exclude the parent agent
The "Tokens by sub-agent" card and the "Cost by sub-agent" card SHALL display only agents whose `isParent` flag is `false` (i.e. only true sub-agents, never the root/orchestrator node of a session chain). The aggregator (`aggregateSubagents`) SHALL continue to include the parent in its returned `SubagentMap`; the filter is applied at the chart data selector so other consumers see the full map.

#### Scenario: Parent agent is not rendered in either chart
- **WHEN** the dashboard loads with at least one session that has a parent node
- **THEN** neither chart includes a row for the parent agent, regardless of how many tokens or dollars the parent consumed

#### Scenario: Other consumers of the aggregator are unaffected
- **WHEN** a future component reads `useSubagentMetrics().data`
- **THEN** the returned `SubagentMap` still contains an entry for the parent agent with `isParent: true`

### Requirement: Chart labels render without overlap
The sub-agent charts SHALL render exactly two labels per bar: the agent name (inside the bar at the left edge) and the formatted value (just outside the bar on the right). The "parent" caption label, the dashed stroke on the parent bar, and any other parent-specific decoration SHALL be removed.

#### Scenario: No labels overlap each other or extend past the chart edge
- **WHEN** any bar in either sub-agent chart is rendered
- **THEN** its two labels are visually separated (agent name on the bar, value label after the bar end) and neither label is clipped or overlaps another label
