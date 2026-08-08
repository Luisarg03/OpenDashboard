# agent-metrics Specification

## Purpose
TBD - created by archiving change frontend-modernization-wave-2. Update Purpose after archive.
## Requirements
### Requirement: Two metric cards break the session set down by sub-agent

The dashboard at `/` SHALL render two side-by-side cards in the existing 2-column grid that currently hosts `Cost by day` and the old `Sessions by agent`: `Tokens by sub-agent` and `Cost by sub-agent`. Each card SHALL display a horizontal sorted bar chart of the sub-agents that ran work in the visible session set, with one bar per sub-agent and a label that names the agent. The bars in each card SHALL be sorted by the card's own metric (tokens or cost), descending, with the longest bar at the top.

A "sub-agent" for the purposes of this card is any agent that appears in a `DelegationNode.agent` field in any non-root node of the session's chain. The root node's agent is excluded from the per-sub-agent aggregation (it is the parent session's agent and is the same in nearly every session).

#### Scenario: The dashboard shows the two cards

- **WHEN** the user loads the dashboard at `/`
- **THEN** two cards are visible: one labelled `Tokens by sub-agent` and one labelled `Cost by sub-agent`
- **AND** the old `Sessions by agent` card is no longer rendered

#### Scenario: Each card shows one bar per sub-agent

- **WHEN** the visible session set contains chains that include `builder`, `fixer`, and `librarian` as non-root agents
- **THEN** the `Tokens by sub-agent` card shows three bars labelled `builder`, `fixer`, `librarian`
- **AND** the `Cost by sub-agent` card shows the same three bars

#### Scenario: Each card sorts its bars by its own metric

- **WHEN** the `Tokens by sub-agent` card renders
- **THEN** the longest bar corresponds to the sub-agent with the most tokens
- **AND** the bars are ordered from most to least tokens, top to bottom

- **WHEN** the `Cost by sub-agent` card renders
- **THEN** the longest bar corresponds to the sub-agent with the highest cost
- **AND** the bars are ordered from most to least cost, top to bottom

#### Scenario: The root agent is excluded from the bars

- **WHEN** every visible session has a root agent of `orchestrator`
- **THEN** neither card includes a bar labelled `orchestrator`

#### Scenario: The bars use design tokens for color

- **WHEN** a bar in either card renders
- **THEN** its fill color is one of the design tokens (typically the sub-agent's color from the existing `agent-colors.ts` helper)
- **AND** no hardcoded hex / hsl values appear in the card source

### Requirement: Each card caps the default view at the top five sub-agents

Each card SHALL show at most five bars by default, sorted by the active metric. When more than five sub-agents have non-zero values, the card SHALL show the top five and a "Show all" affordance below the bars. When the user clicks "Show all", the card expands to render every sub-agent with a non-zero value. The expanded state is local to the card and resets when the page reloads or when the filter changes.

#### Scenario: The default view shows the top five

- **WHEN** the visible session set contains eight distinct sub-agents
- **THEN** each card shows the top five bars by its own metric
- **AND** a `Show all` link or button is visible below the bars

#### Scenario: The expanded view shows every sub-agent

- **WHEN** the user clicks `Show all` on the `Tokens by sub-agent` card
- **THEN** the card renders eight bars, one per sub-agent
- **AND** the other card is not affected

#### Scenario: The expanded state resets on reload

- **WHEN** the user clicks `Show all` and then reloads the page
- **THEN** the cards render the default top-five view

### Requirement: The cards have skeleton, empty, and error states

While the per-session chain payloads are loading, each card SHALL render a skeleton block of the same height as the populated card. When every chain payload returns zero non-root nodes (no sub-agents ran), the card SHALL render a `No sub-agent activity yet` empty state. When one or more chain fetches fail and the data is incomplete, the card SHALL render the existing `DashboardError` card with a `Retry` action.

#### Scenario: Skeletons render while chains load

- **WHEN** the dashboard loads and the chain fetches are pending
- **THEN** each card renders a skeleton of the same dimensions

#### Scenario: An empty session set renders the empty state

- **WHEN** the visible session set has no non-root delegation nodes
- **THEN** each card renders a `No sub-agent activity yet` empty state with a description

#### Scenario: An error renders the error card

- **WHEN** a chain fetch fails for a visible session
- **THEN** the affected card renders the `DashboardError` card with a `Retry` button
- **AND** clicking `Retry` re-issues the failed chain fetches

### Requirement: The card data is a pure function of the chain payloads

The aggregation from chain payloads to per-sub-agent totals SHALL be implemented as a pure function in `frontend/src/features/dashboard/lib/subagent-aggregate.ts` (or co-located). The function SHALL accept a list of `(sessionId, chain)` tuples and return a `Map<subagent, { tokens, cost, sessionCount }>`. The hook layer (`useSubagentMetrics(filters)`) SHALL be a thin wrapper that fires the chain fetches via TanStack Query and then calls the pure function.

#### Scenario: The pure function aggregates correctly

- **WHEN** the pure function receives one chain with two non-root nodes (`builder` with 1000 tokens, `fixer` with 500 tokens)
- **THEN** the result map contains `builder: { tokens: 1000, cost: ..., sessionCount: 1 }` and `fixer: { tokens: 500, cost: ..., sessionCount: 1 }`

#### Scenario: The pure function ignores the root node

- **WHEN** the chain contains one root node (`orchestrator`, 100 tokens) and one non-root node (`builder`, 1000 tokens)
- **THEN** the result map does NOT contain `orchestrator`
- **AND** the result map contains `builder` with the correct totals

#### Scenario: The pure function aggregates across multiple chains

- **WHEN** the function receives two chains, both with a `builder` non-root node
- **THEN** the result map contains `builder: { tokens: ..., sessionCount: 2 }` (the tokens are summed; the sessionCount is 2)

