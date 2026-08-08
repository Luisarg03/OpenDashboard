# dashboard-metrics Spec

## Purpose

Provide a KPI dashboard for the OpenDashboard home view: aggregate metrics (sessions, cost, tokens, agents) rendered with Tremor/shadcn components, backed by the existing read-only FastAPI JSON endpoints. The panel is composable and extensible (per-project metric cards), filterable by agent/month/search, and links into the session graph view.

## Requirements

### REQ-1: KPI cards

The system MUST render KPI cards for total sessions, total cost, total tokens, and unique agents, sourced from `GET /api/stats` (`total_sessions`, `total_cost`, `total_tokens`, `unique_agents`), using Tremor `Card`/`Metric`/`Title`/`Text` primitives.

#### Scenario: Dashboard loads

- **WHEN** the user opens `/` and `/api/stats` succeeds
- **THEN** four KPI cards show the aggregate values with proper formatting (currency for cost, human-readable counts/tokens)

#### Scenario: Stats fetch fails

- **WHEN** `/api/stats` errors
- **THEN** the KPI section shows an error state with a retry action instead of stale or missing data

### REQ-2: Charts and breakdowns

The system MUST render time-series and distribution charts from `GET /api/sessions` (and `GET /api/agents` where useful): sessions/cost/tokens over time (`AreaChart`), sessions per agent (`BarList`), and monthly distribution (from the `time_created` epoch-ms field). It MUST handle an empty dataset with an empty-state message.

#### Scenario: Chart data present

- **WHEN** sessions exist for the current filters
- **THEN** charts render from the session list, aggregating client-side per period/agent

#### Scenario: No sessions

- **WHEN** the session list is empty
- **THEN** charts show an empty-state message and no misleading zero-only charts are displayed

### REQ-3: Filters

The system MUST allow filtering the dashboard by agent, month, and free-text search, synced to the query state and reflected in refetches of the session/stats queries. The agent and month options MUST come from `GET /api/agents` and the sessions API's month values respectively.

#### Scenario: Filter by agent

- **WHEN** the user selects an agent
- **THEN** the session list and charts refetch and show only that agent's sessions

### REQ-4: Session list navigation

The system MUST list sessions with title, agent, model, cost, tokens, and timestamps, and MUST link each session to its graph view (`/session/:id`).

#### Scenario: Open session from dashboard

- **WHEN** the user clicks a session row
- **THEN** the app navigates to `/session/:id` and loads the delegation graph for that session

### REQ-5: Extensibility

The system MUST structure the dashboard as composable components (one card/chart component per metric or breakdown) so new project-specific KPIs can be added without touching existing ones, and MUST support both the root dashboard and per-project views (`/api/sessions?project_id=...`).

#### Scenario: Per-project dashboard

- **WHEN** the user views a project-scoped session list
- **THEN** the same KPI/chart components render against the project-filtered queries

### REQ-6: Live-ish refresh

The system MUST refresh list and stats queries on a short interval (TanStack Query `refetchInterval`) so the dashboard tracks an in-progress session without a full SSE subscription.

#### Scenario: Session completes while dashboard is open

- **WHEN** a run finishes while the dashboard is visible
- **THEN** within the refresh interval the KPI cards and charts reflect the new totals
