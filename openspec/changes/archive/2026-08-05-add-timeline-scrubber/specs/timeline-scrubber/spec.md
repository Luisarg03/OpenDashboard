# timeline-scrubber Spec

## Purpose

Visualize the temporal evolution of a delegation chain and filter the cascade graph by a cutoff timestamp. A horizontal timeline renders one color-coded marker per node at its `time_created`, a draggable cutoff handle selects which nodes stay visible (`time_created <= cutoff`), and optional auto-play animates the cutoff across the session's duration. Pure frontend capability: it consumes the existing flat `DelegationNode[]` chain (fields `time_created`, `agent`, `parent_id` already available) and never touches the backend.

## Requirements

### REQ-1: Horizontal timeline above the graph

The system SHALL display a horizontal timeline above the cascade graph, spanning from the earliest to the latest `time_created` among all nodes in the chain.

#### Scenario: Timeline covers full session

- **WHEN** a session with nodes at timestamps T1 < T2 < ... < Tn is loaded
- **THEN** a horizontal timeline is rendered above the graph whose left edge maps to T1 and whose right edge maps to Tn

### REQ-2: One marker per node

The system SHALL render one marker (dot) per node on the timeline, positioned at that node's `time_created` and colored by its `agent`.

#### Scenario: Node position and color

- **WHEN** the timeline is rendered for a chain with nodes from multiple agents
- **THEN** each node has exactly one dot at the x-position proportional to its `time_created`, and dots belonging to the same agent share the agent's color

### REQ-3: Draggable cutoff filters the graph

The system SHALL provide a draggable cutoff handle on the timeline; nodes with `time_created` greater than the cutoff SHALL NOT be visible in the cascade graph.

#### Scenario: Scrub the session

- **WHEN** the user drags the cutoff handle to a timestamp T
- **THEN** the cascade graph renders exactly the nodes with `time_created <= T` and hides the rest

### REQ-4: Inline stats

The system SHALL display inline stats next to the timeline: "N/M nodes shown", "Up to HH:MM" (formatted cutoff), and "Total duration Xm Ys" (latest minus earliest `time_created`).

#### Scenario: Stats reflect cutoff

- **WHEN** the cutoff is at a timestamp that includes N of M nodes
- **THEN** the stats read "N/M nodes shown", show the formatted cutoff time, and show the session's total duration in minutes and seconds

### REQ-5: Deep-linkable cutoff

The system SHALL support the URL query parameter `?cutoff=<timestamp>` so the cutoff state survives refresh and is shareable.

#### Scenario: Load session with cutoff in URL

- **WHEN** the user opens `/session/:id?cutoff=<ms>` with a timestamp within the chain's range
- **THEN** the timeline and graph initialize with the cutoff at that timestamp

#### Scenario: Cutoff updates URL

- **WHEN** the user drags the cutoff or plays the animation
- **THEN** the URL query parameter `cutoff` is updated without reloading the page

### REQ-6: Playback controls

The system SHALL provide playback controls: play, pause, reset, and speed selection among 0.5x, 1x, and 2x.

#### Scenario: Control playback

- **WHEN** the user presses play, pause, or reset, or selects a speed
- **THEN** the cutoff animates forward while playing, stops at the current value on pause, jumps to the earliest `time_created` on reset, and advances at the selected speed

### REQ-7: Auto-play duration

The system SHALL animate the cutoff from the earliest to the latest `time_created` in roughly 10 seconds at 1x speed (proportionally shorter/longer at 2x/0.5x).

#### Scenario: Full playthrough

- **WHEN** the user presses play at 1x speed from reset
- **THEN** the cutoff reaches the latest `time_created` in approximately 10 seconds and playback stops

### REQ-8: Edge cases

The system SHALL handle edge-case chains without breaking: a single-node chain, an empty chain, and a very long chain (200+ nodes) without layout thrash.

#### Scenario: Single-node chain

- **WHEN** the chain contains exactly one node
- **THEN** the timeline renders one dot, the stats read "1/1 nodes shown", and the graph renders the single node

#### Scenario: Empty chain

- **WHEN** the chain contains zero nodes
- **THEN** no timeline or scrubber is rendered and the existing empty state is preserved

#### Scenario: Very long chain

- **WHEN** the chain contains 200+ nodes
- **THEN** the timeline and graph remain interactive with no layout thrash, and nearby dots are visually grouped when they are closer than the marker spacing threshold

### REQ-9: Responsiveness during playback

The system SHALL remain responsive during playback, performing at most 30 layout recomputations per second.

#### Scenario: Playback stays smooth

- **WHEN** the auto-play animation is running on a large chain
- **THEN** the cutoff advances at no more than 30 updates per second and the graph filtering recomputes at that same bounded rate
