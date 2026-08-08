# graph-theming Specification

## Purpose
TBD - created by archiving change frontend-modernization-wave-1. Update Purpose after archive.
## Requirements
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

### Requirement: The session-detail toolbar exposes a layout selector

The session-detail page toolbar (the row of buttons above the timeline scrubber, currently hosting `Failures Only` (removed in Wave 1), `Aggregated`, play / pause / reset, and the playback speed selector) SHALL expose a layout selector that toggles between the `Cascade`, `Timeline`, and `Aggregated` views. The selector SHALL be a button group with one button per mode; the active mode is highlighted using the Wave 1 button-group active state. Switching modes updates the `viewMode` state and the graph re-renders without a full page reload.

#### Scenario: The toolbar shows the three layout buttons

- **WHEN** the user loads a session with a non-empty chain
- **THEN** the toolbar renders three layout buttons: `Cascade`, `Timeline`, `Aggregated`
- **AND** the currently active mode is visually highlighted (background + accent bar per the Wave 1 `graph-theming` spec)

#### Scenario: Clicking a layout button switches the view

- **WHEN** the user clicks the `Timeline` button while the current mode is `Cascade`
- **THEN** the `viewMode` state updates to `'timeline'`
- **AND** the graph re-renders with the timeline layout

#### Scenario: The active state moves with the mode

- **WHEN** the user switches from `Cascade` to `Timeline`
- **THEN** the `Cascade` button loses its active highlight
- **AND** the `Timeline` button gains the active highlight

#### Scenario: The layout selector is keyboard-navigable

- **WHEN** the user focuses the layout button group
- **THEN** pressing `Tab` cycles through the three buttons in order
- **AND** pressing `Enter` or `Space` on a focused button activates that mode

### Requirement: The timeline layout animates with the timeline-scrubber cutoff

When `viewMode === 'timeline'`, the graph SHALL animate the entrance and exit of nodes as the timeline-scrubber's `cutoff` changes. A node whose `time_created <= cutoff` SHALL be visible; a node whose `time_created > cutoff` SHALL be hidden. When a node's visibility transitions from hidden to visible, it SHALL slide in from the left (the "ladder" effect); when a node's visibility transitions from visible to hidden, it SHALL slide out to the right.

#### Scenario: A new node slides in when the cutoff advances past it

- **WHEN** the user advances the timeline-scrubber cutoff past a node's `time_created` and `viewMode === 'timeline'`
- **THEN** the node transitions from hidden to visible
- **AND** the transition slides the node in from the left over 200ms
- **AND** the easing is the Wave 1 easing `cubic-bezier(0.16, 1, 0.3, 1)`

#### Scenario: A node slides out when the cutoff retreats past it

- **WHEN** the user retreats the timeline-scrubber cutoff below a node's `time_created` and `viewMode === 'timeline'`
- **THEN** the node transitions from visible to hidden
- **AND** the transition slides the node out to the right over 200ms

#### Scenario: The Cascade and Aggregated layouts are not animated by the cutoff

- **WHEN** `viewMode === 'expanded'` or `viewMode === 'aggregated'`
- **THEN** nodes appear and disappear without the slide animation
- **AND** the existing Wave 1 visibility behavior is preserved

### Requirement: The slide animation respects `prefers-reduced-motion`

When the user has set `prefers-reduced-motion: reduce` in their OS / browser settings, the slide animation SHALL be replaced with an instant in/out (no horizontal translation). The opacity transition MAY still apply (a small visual change, not a motion).

#### Scenario: Reduced motion disables the slide

- **WHEN** the user has `prefers-reduced-motion: reduce` and the cutoff advances past a hidden node
- **THEN** the node transitions to visible without horizontal translation
- **AND** the transition duration is `0ms` (instant)

#### Scenario: The reduced-motion match is reactive to the media query

- **WHEN** the user changes their `prefers-reduced-motion` setting without reloading the page
- **THEN** the next cutoff change uses the new setting
- **AND** no page reload is required for the new behavior to take effect

### Requirement: The timeline layout shares the Wave 1 theming and focus mode

The timeline layout SHALL satisfy the existing Wave 1 `graph-theming` requirements: dark mode by default, tokenized node and edge colors, tokenized MiniMap palette, focus mode that dims non-ancestor nodes, and `prefers-reduced-motion` support for the focus dim. The new layout does not introduce any new color tokens, any new theming CSS, or any new MiniMap configuration; it uses the same theming surface as the cascade.

#### Scenario: The timeline graph uses tokenized colors

- **WHEN** the graph renders in `viewMode === 'timeline'`
- **THEN** every node border, every edge stroke, and the MiniMap's `nodeColor` and `maskColor` resolve to design tokens
- **AND** no hardcoded hex / hsl values appear in the timeline layout source

#### Scenario: The focus mode works in the timeline layout

- **WHEN** the user clicks a node in the timeline layout
- **THEN** the focused node and its ancestors remain at full opacity
- **AND** every other node is dimmed to the documented `data-dim` value
- **AND** clicking the focused node again clears the focus

