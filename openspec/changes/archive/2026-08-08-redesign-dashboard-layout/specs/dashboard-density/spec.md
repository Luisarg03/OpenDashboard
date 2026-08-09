## ADDED Requirements

### Requirement: Dashboard content is capped at a wide-viewport max-width
The main content area SHALL cap at `max-w-screen-2xl` and center with `mx-auto` so that on viewports wider than 1536px the layout does not stretch edge-to-edge. Below the cap, the content fills the available width as it does today.

#### Scenario: Wide viewports do not stretch content
- **WHEN** the viewport is 1920px wide
- **THEN** the main content area is at most 1536px wide and centered, with equal margins on both sides

#### Scenario: Normal viewports fill the available width
- **WHEN** the viewport is 1440px wide
- **THEN** the main content area fills the full 1440px minus the page padding (no max-width cap is reached)

### Requirement: Dashboard uses the existing density tokens
The dashboard page and the KPI section SHALL use the project's existing density tokens (`--density-comfortable`, `--density-row-padding-compact`) so the gap between sections, the KPI tile padding, and the sessions-table row padding all share a single source of truth. The tokens are defined in `index.css` and currently unused; this requirement wires them in.

#### Scenario: KPI tile padding matches the token
- **WHEN** the KPI section is rendered
- **THEN** each tile's internal padding equals `var(--density-comfortable)` (36px target via Tailwind's `p-[var(--density-comfortable)]` or the `density-comfortable` spacing utility)

#### Scenario: Sessions table rows use compact padding
- **WHEN** the sessions table is rendered
- **THEN** each row's vertical padding is set to the DataTable's `compact` mode (`py-1`, 0.25rem) instead of the default TanStack table row padding

#### Scenario: Section gap is tightened
- **WHEN** the dashboard page is rendered
- **THEN** the vertical gap between the header, filters, KPI section, charts grid, and sessions table is `gap-4` (1rem), not the current `gap-6` (1.5rem)
