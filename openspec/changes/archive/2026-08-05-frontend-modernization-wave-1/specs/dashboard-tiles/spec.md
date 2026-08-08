## ADDED Requirements

### Requirement: A KPI tile renders title, value, delta, and sparkline

Each KPI tile in the `KpiSection` SHALL render four regions in a fixed order: (1) a title (e.g. `Sessions`), (2) a current value formatted in the data font with tabular numerals, (3) a delta indicator that shows the change vs. the previous equal-length period with a positive/negative icon and a percentage, and (4) a 7-day sparkline that visualises the trend. The tile MUST be readable at a width of 240px without horizontal overflow.

#### Scenario: The Sessions tile shows all four regions

- **WHEN** the dashboard loads and the stats query succeeds
- **THEN** the `Sessions` tile renders, in order: `Sessions`, the formatted session count, a delta percentage with an up or down icon, and a sparkline with 7 data points

#### Scenario: The Total Cost tile formats currency

- **WHEN** the dashboard loads and the stats query succeeds
- **THEN** the `Total Cost` tile renders the value in the `$X.XX` format and the sparkline shows 7 daily values

#### Scenario: A positive delta is green

- **WHEN** a tile's current value is greater than the previous-period value
- **THEN** the delta indicator uses `text-status-success` and an up-pointing icon

#### Scenario: A negative delta is red

- **WHEN** a tile's current value is less than the previous-period value
- **THEN** the delta indicator uses `text-status-error` and a down-pointing icon

### Requirement: KPI tiles have skeleton, empty, and error states

While the `useStats()` query is pending, each tile MUST render a skeleton block of the same dimensions as the real tile so the layout does not shift when the data arrives. On error, each tile SHALL render the same `DashboardError` card used by other dashboard widgets, and the section SHALL expose a `Retry` action that re-runs the query.

#### Scenario: Skeletons match tile dimensions

- **WHEN** the dashboard loads and the stats query is pending
- **THEN** four skeleton blocks render in the same row as the real tiles, each with the same height and width

#### Scenario: Error renders the DashboardError card

- **WHEN** the stats query fails
- **THEN** the `KpiSection` renders the `DashboardError` card with a `Retry` button

#### Scenario: Retry re-runs the query

- **WHEN** the user clicks `Retry` on the error card
- **THEN** the stats query is re-issued and the section transitions out of the error state

### Requirement: KPI tiles fall back gracefully when per-metric time series is unavailable

If the per-metric time series used for the sparkline is unavailable from the API, the tile SHALL render a flat sparkline (a single horizontal line in `text-muted-foreground`) and the delta indicator SHALL show a neutral icon (a horizontal dash) with no percentage. The fallback MUST be visually distinct from a "no data" empty state.

#### Scenario: Static sparkline when no series is available

- **WHEN** the stats query succeeds but no per-metric series is returned for a tile
- **THEN** the tile renders the value, a neutral delta indicator, and a flat sparkline

#### Scenario: Per-tile fallback is independent

- **WHEN** the time series is available for `Sessions` but not for `Total Cost`
- **THEN** the `Sessions` tile shows a real sparkline and the `Total Cost` tile shows the flat fallback, in the same render
