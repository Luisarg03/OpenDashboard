## MODIFIED Requirements

### Requirement: Brand color
The system SHALL use a single brand color (`--primary`) that remains identical in both light and dark themes. The teal accent color (`--accent`) SHALL be removed.

#### Scenario: Primary color consistency
- **WHEN** the application is in light mode
- **THEN** `--primary` is `239 84% 67%` (indigo-500)

#### Scenario: Dark mode primary unchanged
- **WHEN** the application is in dark mode
- **THEN** `--primary` remains `239 84% 67%` (same value as light)

#### Scenario: Accent removed
- **WHEN** the application loads
- **THEN** `--accent` is not defined or falls back to `--secondary`

### Requirement: Border tokens
The system SHALL define border tokens with full opacity for surface separation. Dark mode borders SHALL use `#2a2a2a` (fully opaque).

#### Scenario: Light mode border
- **WHEN** the application is in light mode
- **THEN** `--border` is `240 5.9% 90%` (fully opaque)

#### Scenario: Dark mode border
- **WHEN** the application is in dark mode
- **THEN** `--border` is `240 4% 16%` mapped to `#2a2a2a` (fully opaque, not semi-transparent)

### Requirement: Animation plugin
The system SHALL NOT use `tailwindcss-animate` plugin. Animations SHALL be handled by the `motion` library (Framer Motion successor) which is already installed.

#### Scenario: Popover animations
- **WHEN** a popover/dropdown opens
- **THEN** it uses motion library animation, not tailwindcss-animate classes
