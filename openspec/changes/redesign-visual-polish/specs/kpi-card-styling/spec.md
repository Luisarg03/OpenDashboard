## Requirement: KPI cards use valid border styles

KPI cards remove the invalid `ring-border` class and use consistent border-left width.

### Scenarios

- GIVEN the dashboard with KPI cards
  WHEN I look at any KPI card
  THEN it does NOT have `ring-border` class

- GIVEN a KPI card
  WHEN I look at the left accent border
  THEN it is `border-l-[3px]` (not `border-l-4`)

- GIVEN a KPI card
  WHEN I look at its classes
  THEN it has `border border-border` for the outer border
