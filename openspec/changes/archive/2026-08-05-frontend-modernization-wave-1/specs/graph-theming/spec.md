## ADDED Requirements

### Requirement: React Flow renders in dark mode by default

The `DelegationGraph` component SHALL configure `@xyflow/react` with `colorMode="dark"` and a `theme` object that overrides the canvas background, the default edge stroke, the node background, the node border, and the focus ring. In dark mode (the application default), the graph canvas SHALL match the surrounding `--card` token. In light mode, the canvas SHALL use the same surface tokens as the rest of the page.

#### Scenario: The graph canvas matches the surface in dark mode

- **WHEN** the application is in dark mode and the user opens a session with a non-empty chain
- **THEN** the React Flow canvas background matches the `--card` token in `index.css`

#### Scenario: The graph canvas matches the surface in light mode

- **WHEN** the application is in light mode and the user opens a session with a non-empty chain
- **THEN** the React Flow canvas background matches the `--card` token in `index.css` and is not white

### Requirement: Edge and node colors derive from the design tokens

Every edge stroke and every node border in the `DelegationGraph` SHALL resolve to a value declared in `index.css` (typically `--border` or `--muted-foreground`). No hardcoded hex / hsl values SHALL appear in `delegation-graph.tsx` or `delegation-node.tsx`. A node in the `Done` state SHALL use `--status-success`; a node in the `Running` (live) state SHALL use `--primary`; a node in the `Failed` state SHALL use `--status-error` once the failure-detection predicate is implemented.

#### Scenario: An edge uses the border token

- **WHEN** the graph renders two connected nodes in dark mode
- **THEN** the edge stroke resolves to `hsl(var(--border))` (or the token's CSS color equivalent), not a hardcoded value

#### Scenario: A Done node uses the success token

- **WHEN** the chain contains a node with status `Done`
- **THEN** the node's border color resolves to `hsl(var(--status-success))`

#### Scenario: A Running node uses the primary token

- **WHEN** the SSE stream reports a new node and the `liveNodeIds` set contains its id
- **THEN** the node's border color resolves to `hsl(var(--primary))`

### Requirement: The MiniMap uses the design-token palette

The `<MiniMap />` `nodeColor` callback SHALL return a value from the status / primary / muted token set, not a hardcoded hex. The `maskColor` SHALL use a token-derived translucent surface (e.g. `hsl(var(--background) / 0.7)`). The MiniMap background SHALL use the `--muted` token in both themes.

#### Scenario: Live nodes are primary on the MiniMap

- **WHEN** the graph renders and `liveNodeIds` is non-empty
- **THEN** the corresponding MiniMap nodes are colored with `hsl(var(--primary))`

#### Scenario: The MiniMap mask uses a token-derived surface

- **WHEN** the graph renders in dark mode
- **THEN** the MiniMap `maskColor` is a translucent background token, not `rgba(0, 0, 0, 0.7)`

### Requirement: Focus mode dims non-ancestor nodes via tokenized opacity

When the user clicks a node, the `DelegationGraph` enters focus mode and SHALL dim every node that is not the focused node or an ancestor of it. The dim opacity SHALL be expressed as a tokenized value (e.g. a `data-dim` attribute or an `opacity` value derived from `--muted-foreground`). The transition SHALL respect the application's `prefers-reduced-motion` setting.

#### Scenario: Clicking a node dims siblings

- **WHEN** the user clicks a node with two children
- **THEN** the focused node and its children remain at full opacity, and every other node is dimmed to the documented `data-dim` value

#### Scenario: Reduced motion disables the transition

- **WHEN** the user's `prefers-reduced-motion` is set to `reduce` and focus mode is toggled
- **THEN** the dim transition is instant; no CSS transition runs

#### Scenario: Clicking the focused node clears focus

- **WHEN** the user clicks the same node a second time
- **THEN** focus mode is cleared and every node returns to full opacity
