# dashboard-filters Specification

## Purpose
TBD - created by archiving change frontend-modernization-wave-2. Update Purpose after archive.
## Requirements
### Requirement: The dashboard filter row exposes search and month filters

The `DashboardFilters` component SHALL render a single row with two filter controls — a free-text search input and a month selector — and a reset action. The component SHALL NOT render an agent filter. The component SHALL continue to read and write the URL search parameters `?search=` and `?month=` for state persistence across reloads and shareable URLs. The component SHALL render a visible `<Reset />` button only when at least one filter is active.

#### Scenario: The filter row shows the two controls and no agent filter

- **WHEN** the user loads the dashboard at `/`
- **THEN** the filter row renders a search input, a month selector, and (when inactive) a disabled reset button
- **AND** the filter row does NOT render an "All agents" selector

#### Scenario: Typing in the search input updates the URL

- **WHEN** the user types `orchestrator` in the search input
- **THEN** the URL is updated to `/?search=orchestrator` and the session list re-fetches with the filter applied

#### Scenario: Selecting a month updates the URL

- **WHEN** the user selects `2026-08` in the month selector
- **THEN** the URL is updated to `/?month=2026-08` and the session list re-fetches with the month filter applied

#### Scenario: A legacy `?agent=` URL parameter is silently ignored

- **WHEN** the user navigates to `/?agent=orchestrator`
- **THEN** the dashboard renders without applying any agent filter
- **AND** the search input and month selector continue to work normally
- **AND** no warning or error is surfaced to the user

#### Scenario: The reset button clears all active filters

- **WHEN** the user clicks the reset button while `?search=foo&month=2026-08` is active
- **THEN** the URL is updated to `/` (no search params)
- **AND** the session list re-fetches without filters
- **AND** the reset button becomes disabled

### Requirement: The filter row is keyboard-navigable

The `DashboardFilters` component MUST be reachable in document order so that a keyboard user can `Tab` from the skip-link directly into the search input, then to the month selector, then to the reset button. The search input and the month selector MUST announce their purpose via `aria-label` (matching the Wave 1 baseline).

#### Scenario: A keyboard user can tab through the filters

- **WHEN** the user presses `Tab` from the page header
- **THEN** focus lands on the search input first
- **THEN** a second `Tab` press lands on the month selector
- **THEN** a third `Tab` press lands on the reset button (when it is enabled)

#### Scenario: The search input has an accessible label

- **WHEN** a screen reader reads the search input
- **THEN** it announces the `aria-label` value (e.g. "Search sessions")

### Requirement: The filter row is responsive

The `DashboardFilters` component MUST adapt its layout to the viewport. On viewports narrower than the `md` Tailwind breakpoint, the filter row MUST stack vertically: search input on top, month selector below, reset button last. On `md` and wider, the row MUST be horizontal: search input takes the remaining space, month selector has a fixed width, reset button is right-aligned.

#### Scenario: Mobile viewport stacks the filters

- **WHEN** the viewport width is 600px
- **THEN** the search input, month selector, and reset button stack vertically with a small gap between them

#### Scenario: Desktop viewport lays out the filters horizontally

- **WHEN** the viewport width is 1440px
- **THEN** the search input, month selector, and reset button share a single row with the documented widths

