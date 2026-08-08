## ADDED Requirements

### Requirement: Dark-first color palette
The system SHALL define a dark-first color palette with near-black background, grayscale surfaces, and a single vivid accent color.

#### Scenario: Dark mode background colors
- **WHEN** the application renders in dark mode
- **THEN** the background SHALL use near-black (#0A0A0B or equivalent HSL)
- **AND** card surfaces SHALL use slightly lighter gray (#18181B or equivalent)
- **AND** elevated surfaces SHALL use even lighter gray (#27272A or equivalent)

#### Scenario: Accent color consistency
- **WHEN** any interactive element (button, link, active state) renders
- **THEN** it SHALL use the primary accent color (indigo-500 family)
- **AND** no other accent colors SHALL compete for visual attention

### Requirement: Tremor chart visibility in dark mode
The system SHALL render Tremor charts with visible axes, labels, and gridlines in dark mode.

#### Scenario: AreaChart axis visibility
- **WHEN** an AreaChart renders in dark mode
- **THEN** the x-axis and y-axis labels SHALL be visible (white or light gray)
- **AND** the axis lines SHALL be visible against the dark background

#### Scenario: BarList label visibility
- **WHEN** a BarList renders in dark mode
- **THEN** the value labels and category names SHALL be visible

### Requirement: Border-only card elevation
The system SHALL use borders instead of shadows for card elevation in dark mode.

#### Scenario: Card rendering in dark mode
- **WHEN** a Card component renders in dark mode
- **THEN** it SHALL NOT use box-shadow for elevation
- **AND** it SHALL use a subtle border (white at low opacity) for separation
- **AND** the card background SHALL be slightly lighter than the page background

### Requirement: Data typography with monospace
The system SHALL render all data-layer values (IDs, timestamps, token counts, costs) in a monospace font.

#### Scenario: KPI metric rendering
- **WHEN** a KPI card displays a numeric value
- **THEN** the value SHALL use JetBrains Mono or system monospace fallback

#### Scenario: Session list data rendering
- **WHEN** a session row displays cost, token count, or timestamp
- **THEN** the value SHALL use monospace font

### Requirement: Brighter agent colors in dark mode
The system SHALL use brighter color variants for agent identification in dark mode.

#### Scenario: Agent badge in dark mode
- **WHEN** an agent badge renders in dark mode
- **THEN** the background color SHALL use the 400-level shade (not 500)
- **AND** the text color SHALL use the corresponding light variant

#### Scenario: Graph node agent colors
- **WHEN** a delegation node renders in dark mode
- **THEN** the left border and accent colors SHALL use the brighter 400-level shade
