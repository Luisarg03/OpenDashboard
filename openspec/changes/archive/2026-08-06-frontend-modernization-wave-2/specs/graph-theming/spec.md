## ADDED Requirements

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
