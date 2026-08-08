## Requirement: Chart cards use explicit border and padding

Chart containers use proper border and padding instead of `ring-border`.

### Scenarios

- GIVEN the dashboard with the cost-by-day chart
  WHEN I look at the chart card
  THEN it has `border border-border p-5` (not `ring-border`)

- GIVEN the dashboard with the agent breakdown chart
  WHEN I look at the chart card
  THEN it has `border border-border p-5` (not `ring-border`)

- GIVEN either chart card
  WHEN I look at its classes
  THEN there is no `ring-border` class present
