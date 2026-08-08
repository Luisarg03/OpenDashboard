## ADDED Requirements

### Requirement: Row hover accent bar
Interactive rows SHALL display a left border accent bar on hover. The bar SHALL be 2px wide, use the primary color, and animate in with a 200ms ease-out transition. The first cell's left padding SHALL increase by 4px on hover to accommodate the bar.

#### Scenario: Row hover interaction
- **WHEN** user hovers over an interactive row
- **THEN** a 2px left border appears in primary color with 200ms ease-out transition
- **AND** the first cell's padding increases from `pl-4` to `pl-5`

#### Scenario: Row hover exit
- **WHEN** user moves mouse away from an interactive row
- **THEN** the accent bar fades out and padding returns to original

### Requirement: Status indicator bloom
Status indicators (dots) SHALL support an optional bloom glow effect. When bloom is enabled, the dot SHALL have a colored box-shadow matching its status color.

#### Scenario: Status dot with bloom
- **WHEN** a status indicator has `bloom="low"`
- **THEN** the dot has `box-shadow: 0 0 4px` in the status color

#### Scenario: Status dot without bloom
- **WHEN** a status indicator has no bloom prop
- **THEN** the dot renders without glow effect

### Requirement: Tremor CSS integration
The system SHALL import Tremor's base CSS file to ensure chart and card components render with correct styles.

#### Scenario: Tremor CSS loaded
- **WHEN** the application loads
- **THEN** `@tremor/react/dist/esm/tremor.css` is imported in the CSS entry point

### Requirement: Dead dependency removal
The system SHALL NOT include `@dagrejs/dagre` in package.json if it is not used by any component.

#### Scenario: dagre removed
- **WHEN** the project is built
- **THEN** `@dagrejs/dagre` is not present in node_modules or bundle
