## ADDED Requirements

### Requirement: Side panel for node inspection
The session detail page SHALL display a right-side drawer (400px) when a node is selected in the delegation graph.

#### Scenario: Node click opens drawer
- **WHEN** user clicks a node in the delegation graph
- **THEN** a drawer slides in from the right showing the node's details (agent, model, tokens, cost, duration, status, timestamps)

#### Scenario: Drawer preserves graph context
- **WHEN** the drawer is open
- **THEN** the delegation graph remains visible on the left side of the screen

### Requirement: Drawer close behavior
The drawer SHALL close when user clicks outside it, presses Escape, or clicks the close button.

#### Scenario: Close via escape key
- **WHEN** the drawer is open and user presses Escape
- **THEN** the drawer closes

#### Scenario: Close via outside click
- **WHEN** the drawer is open and user clicks on the graph area
- **THEN** the drawer closes

### Requirement: Mobile bottom sheet
On screens narrower than 640px, the drawer SHALL display as a full-screen bottom sheet instead of a side panel.

#### Scenario: Mobile drawer behavior
- **WHEN** the viewport is less than 640px wide and user taps a node
- **THEN** a bottom sheet slides up covering the full screen with node details
