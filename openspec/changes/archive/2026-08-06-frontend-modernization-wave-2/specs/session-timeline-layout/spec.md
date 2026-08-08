## ADDED Requirements

### Requirement: The session-detail graph supports a horizontal timeline layout

The `DelegationGraph` component SHALL accept a third `viewMode` value `'timeline'` in addition to the existing `'expanded'` and `'aggregated'`. When `viewMode === 'timeline'`, the component SHALL lay out the chain using the new `getTimelineLayout` function from `features/session/lib/timeline-layout.ts`, which arranges nodes by `time_created` on the X axis and groups them into lanes by `parent_id` on the Y axis. The cascade (`'expanded'`) and the aggregated-by-agent (`'aggregated'`) layouts continue to behave exactly as they did in Wave 1.

#### Scenario: The graph dispatches to the timeline layout

- **WHEN** `viewMode === 'timeline'` and the chain is non-empty
- **THEN** the graph renders with the X axis representing time (left is earlier, right is later)
- **AND** the Y axis groups nodes by their `parent_id` (siblings share a lane)

#### Scenario: The cascade layout still works

- **WHEN** `viewMode === 'expanded'` and the chain is non-empty
- **THEN** the graph renders the same vertical cascade as in Wave 1
- **AND** the new timeline layout is not used

#### Scenario: The aggregated layout still works

- **WHEN** `viewMode === 'aggregated'` and the chain is non-empty
- **THEN** the graph renders the aggregated-by-agent layout from Wave 1
- **AND** the new timeline layout is not used

### Requirement: The timeline layout sorts nodes by `time_created`

The `getTimelineLayout` function SHALL sort the chain by `time_created` ascending and assign each node an X position proportional to its position in the sorted list. Earlier nodes are to the left; later nodes are to the right. Nodes with the same `time_created` (rare but possible) SHALL be placed at adjacent X positions with a small horizontal offset to avoid overlap.

#### Scenario: Earlier nodes render to the left of later nodes

- **WHEN** the chain has three nodes with `time_created` of `t=0`, `t=1000`, and `t=2000`
- **THEN** the node at `t=0` renders at the leftmost X position
- **AND** the node at `t=2000` renders at the rightmost X position
- **AND** the node at `t=1000` renders between them

#### Scenario: The X spacing is proportional

- **WHEN** the canvas width is 800px and there are three nodes
- **THEN** the X positions are approximately `padding`, `padding + (800 - 2*padding) / 2`, and `padding + (800 - 2*padding)` for the first, second, and third nodes respectively
- **AND** the proportional spacing holds for any chain length, not just 3

### Requirement: The timeline layout groups siblings into lanes

The `getTimelineLayout` function SHALL assign each node a Y lane based on its `parent_id`. The root node is always in lane 0. Children of the root take the lowest free lane at their depth. Siblings share a lane; cousins do not. Lane heights are constant within a render.

#### Scenario: The root is in lane 0

- **WHEN** the chain has a root node
- **THEN** the root node's Y position is the smallest Y value in the layout

#### Scenario: Siblings share a lane

- **WHEN** the root has two direct children (`builder` and `fixer`)
- **THEN** `builder` and `fixer` have the same Y position
- **AND** that Y position is different from the root's Y position

#### Scenario: Cousins do not share a lane

- **WHEN** the root has two children, each of which has a child of its own
- **THEN** the two grandchildren do not share a Y position with each other
- **AND** each grandchild shares a Y position with its parent (its own lane)

### Requirement: Edges curve between lanes in the timeline layout

The `getTimelineLayout` function SHALL produce an `Edge` per parent-to-child relationship. In the timeline layout, the edge stroke is the design token `hsl(var(--border))` (the Wave 1 `graph-theming` requirement), and the edge path curves so the parent line lands at the child's Y position. Cross-lane edges are accepted.

#### Scenario: An edge connects parent to child

- **WHEN** the chain has a parent at `(x1, y1)` and a child at `(x2, y2)` with `y1 !== y2`
- **THEN** the edge between them renders as a curve that starts at `(x1, y1)` and ends at `(x2, y2)`

#### Scenario: The edge uses the border token

- **WHEN** any edge renders in the timeline layout
- **THEN** its stroke color resolves to `hsl(var(--border))`
- **AND** no hardcoded color values appear in the layout output

### Requirement: The timeline layout is a pure function

`getTimelineLayout(chain, liveIds)` SHALL be a pure function with no side effects and no React/DOM dependencies. The function SHALL be unit-testable with a chain fixture and a live-ids set as inputs. The function SHALL be placed in `frontend/src/features/session/lib/timeline-layout.ts`.

#### Scenario: The function is deterministic

- **WHEN** `getTimelineLayout` is called twice with the same `chain` and `liveIds` arguments
- **THEN** the two results are deeply equal

#### Scenario: The function does not mutate its inputs

- **WHEN** `getTimelineLayout` is called with a `chain` array
- **THEN** the input array is not mutated (no push / splice / sort on the input)

#### Scenario: The function handles an empty chain

- **WHEN** `getTimelineLayout` is called with `chain = []`
- **THEN** the result is `{ nodes: [], edges: [] }` (no throw, no error)
