## ADDED Requirements

### Requirement: JetBrains Mono for data values
All data values in the delegation graph and session list SHALL use JetBrains Mono font. This includes timestamps, token counts, IDs, model names, and costs.

#### Scenario: Node data uses monospace
- **WHEN** a delegation node renders data values (tokens, cost, timestamp, model)
- **THEN** those values are displayed in JetBrains Mono

#### Scenario: Session list data uses monospace
- **WHEN** the session list renders data columns (duration, tokens, cost)
- **THEN** those values are displayed in JetBrains Mono

### Requirement: Global tabular-nums
The application SHALL set font-variant-numeric: tabular-nums globally so that numbers do not shift position during live updates.

#### Scenario: Numbers stable during SSE updates
- **WHEN** a node's token count or cost updates via SSE
- **THEN** the number does not shift horizontally (fixed-width digits)

### Requirement: Font loading
JetBrains Mono SHALL be loaded via Google Fonts with font-display: swap to avoid blocking render.

#### Scenario: Font loads asynchronously
- **WHEN** the page first loads
- **THEN** text renders immediately with fallback font and swaps to JetBrains Mono when loaded
