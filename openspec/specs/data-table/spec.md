# data-table Specification

## Purpose
TBD - created by archiving change frontend-modernization-wave-1. Update Purpose after archive.
## Requirements
### Requirement: A data-table primitive supports column sort

The `DataTable` primitive in `frontend/src/components/ui/data-table.tsx` SHALL accept a column definition array and a row array, and SHALL render a table where each column is sortable by clicking its header. The active sort column SHALL be visually indicated (a caret icon next to the header), and toggling SHALL cycle through `asc -> desc -> unsorted` (or `asc -> desc` if the column is not nullable).

#### Scenario: A user sorts a column ascending

- **WHEN** the user clicks an unsorted column header
- **THEN** the rows re-order by that column ascending and the header shows the ascending caret

#### Scenario: A user sorts the same column descending

- **WHEN** the user clicks a column header that is already sorted ascending
- **THEN** the rows re-order by that column descending and the header shows the descending caret

### Requirement: A data-table primitive supports per-column filter

Each column declared with `enableColumnFilter: true` SHALL expose a filter input in the table toolbar (or in the column header for narrow columns). The filter SHALL debounce input by 150ms and SHALL re-evaluate the visible row set on every settled change. Filtered-out rows SHALL be removed from the rendered table without affecting the underlying data.

#### Scenario: A user filters by agent name

- **WHEN** the session list's data table renders and the user types `orchestrator` in the `Agent` column filter
- **THEN** only the rows whose `agent` column contains `orchestrator` are visible after the debounce

#### Scenario: Filter input is debounced

- **WHEN** the user types `o-r-c-h` quickly (one character per 50ms)
- **THEN** the row re-evaluation fires at most twice (once on the first settle, once on the final), not on every keystroke

### Requirement: A data-table primitive supports column visibility toggle

A column visibility menu (rendered via a `DropdownMenu` triggered by a `Settings` icon in the table toolbar) SHALL list every column with a checkbox. Toggling a checkbox SHALL show or hide the column; the choice SHALL persist in component state for the lifetime of the page.

#### Scenario: A user hides the Cost column

- **WHEN** the user opens the column visibility menu and unchecks `Cost`
- **THEN** the `Cost` column disappears from the table and the remaining columns reflow to fill the available width

#### Scenario: A user re-shows the hidden column

- **WHEN** the user opens the menu and re-checks `Cost`
- **THEN** the `Cost` column reappears in its original position

### Requirement: A data-table primitive supports a row-density toggle

A density toggle in the table toolbar SHALL switch the table between `comfortable` (default) and `compact` row heights. The `compact` mode SHALL halve the row's vertical padding and reduce the font size of cell content by one Tailwind size step. The toggle SHALL be a single button with a clear `comfortable` / `compact` label or icon pair.

#### Scenario: The user switches to compact

- **WHEN** the user clicks the density toggle from `comfortable`
- **THEN** the row padding shrinks to the `compact` value, the cell font size drops one step, and the toggle now indicates the active state

#### Scenario: Switching back restores comfortable

- **WHEN** the user clicks the density toggle from `compact`
- **THEN** the row padding and font size return to the `comfortable` values

### Requirement: A data-table primitive shows an empty state when there are no rows

When the row array passed to the `DataTable` is empty (after filters are applied), the table body SHALL render an `Empty` row that spans all columns and shows a title and a description (passed as props) instead of leaving the table blank.

#### Scenario: The empty state appears on no data

- **WHEN** the session list has zero matching rows
- **THEN** the table body renders a single row with the `Empty` title and description

#### Scenario: The empty state respects filters

- **WHEN** the row array is non-empty but the active filters reduce the visible set to zero
- **THEN** the same empty state appears, with copy that references the active filters

