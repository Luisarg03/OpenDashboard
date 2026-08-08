## MODIFIED Requirements

### Requirement: KPI card styling
KPI cards SHALL use opaque borders, 8px radius, and status tokens for accent colors instead of hardcoded Tailwind color classes.

#### Scenario: KPI card border
- **WHEN** a KPI card renders
- **THEN** it uses `border-border` (fully opaque) instead of `border-border/50`

#### Scenario: KPI card radius
- **WHEN** a KPI card renders
- **THEN** it uses `rounded-lg` (8px) instead of `rounded-xl` (16px)

#### Scenario: KPI accent colors
- **WHEN** a KPI card displays a status indicator
- **THEN** it uses `var(--status-success)` or `var(--status-error)` tokens instead of hardcoded `border-l-emerald-500` or `border-l-red-500`

### Requirement: Typography density
Dashboard components SHALL use `text-xs` (12px) as the default for data cells, labels, and buttons. `text-sm` (14px) SHALL be reserved for body copy only. Headings SHALL use `font-medium` (500) not `font-bold` (700).

#### Scenario: Button text size
- **WHEN** a button renders
- **THEN** its text uses `text-xs` (12px)

#### Scenario: KPI value text
- **WHEN** a KPI card displays a numeric value
- **THEN** it uses `text-xs` with `font-data` (JetBrains Mono) and `tabular-nums`

#### Scenario: Heading weight
- **WHEN** a page heading renders
- **THEN** it uses `font-medium` (500), not `font-bold` (700)
