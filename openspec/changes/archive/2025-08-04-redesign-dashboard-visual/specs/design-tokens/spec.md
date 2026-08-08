## ADDED Requirements

### Requirement: Status color tokens
The system SHALL define CSS custom properties for status colors: `--status-success`, `--status-warning`, `--status-error`, `--status-info` in HSL format. These tokens SHALL be available in both light and dark themes.

#### Scenario: Status tokens defined in CSS
- **WHEN** the application loads
- **THEN** CSS variables `--status-success`, `--status-warning`, `--status-error`, `--status-info` are defined with valid HSL values

#### Scenario: Dark mode status tokens
- **WHEN** the application is in dark mode
- **THEN** status tokens use lightened variants appropriate for dark backgrounds

### Requirement: Bloom glow utility
The system SHALL provide `.bloom-low` and `.bloom-high` CSS utility classes that apply a colored box-shadow glow effect. The glow color SHALL be configurable via `--bloom-color` CSS variable, defaulting to `currentColor`.

#### Scenario: Bloom low applied
- **WHEN** an element has class `bloom-low`
- **THEN** `box-shadow: 0 0 4px var(--bloom-color, currentColor)` is applied

#### Scenario: Bloom high applied
- **WHEN** an element has class `bloom-high`
- **THEN** `box-shadow: 0 0 7px var(--bloom-color, currentColor)` is applied

#### Scenario: Custom bloom color
- **WHEN** an element has `--bloom-color: hsl(var(--status-success))` and class `bloom-low`
- **THEN** the glow uses the success color

### Requirement: Radius scale
The system SHALL use a 3-step radius scale: 4px (`rounded-sm`), 5px (`rounded-md`, base), 8px (`rounded-lg`). No component SHALL use `rounded-xl` (16px).

#### Scenario: Card radius
- **WHEN** a card component renders
- **THEN** it uses `rounded-lg` (8px) radius

#### Scenario: Button radius
- **WHEN** a button component renders
- **THEN** it uses `rounded-md` (5px) radius

### Requirement: Border opacity
The system SHALL use opaque borders (100% opacity) for surface separation. Semi-transparent borders (`border-border/50`) SHALL NOT be used.

#### Scenario: Card border
- **WHEN** a card renders in dark mode
- **THEN** its border uses `border-border` (fully opaque), not `border-border/50`
