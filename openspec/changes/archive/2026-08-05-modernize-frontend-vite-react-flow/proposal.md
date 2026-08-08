# Modernize Frontend to Vite + React + React Flow

## Why

The current frontend (FastAPI + Jinja2 + HTMX + CSS vanilla) cannot express the delegation chains it is meant to visualize: the graph is a collapsible `<details>` tree with no drag, zoom, or pan, and ~40 KB of hand-maintained CSS is getting expensive to evolve. We migrate to a Vite + React 19 SPA so the delegation graph becomes a real interactive canvas and the dashboard gets modern, composable UI components. The FastAPI backend and its read-only SQLite data layer stay intact.

## What Changes

- **BREAKING**: Jinja2/HTMX templates replaced by a React SPA served by Vite. The FastAPI backend remains but its HTML routes are converted to a JSON API under `/api/*`, plus one new SSE endpoint.
- **BREAKING**: `src/opendashboard/templates/` and `src/opendashboard/static/style.css` are removed once the SPA reaches feature parity.
- New `frontend/` workspace: Vite 5 + React 19 + TypeScript, Tailwind CSS, shadcn/ui primitives, Tremor for metrics.
- `delegation-graph-view`: delegation chains rendered with `@xyflow/react` 12 — drag/zoom/pan, automatic dagre layout, custom stateful nodes, minimap/controls, timeline slider.
- `live-tail`: SSE stream from FastAPI pushing new delegation nodes and session updates to the active session view in real time.
- `dashboard-metrics`: KPI panel (sessions, cost, tokens, agents) with Tremor/shadcn cards and charts, filterable by agent/month/search.
- Data fetching via TanStack Query v5 (cache + revalidation); Motion (ex Framer Motion) for micro-interactions.
- No SSR: the SPA is served locally only, no SEO or public deployment requirements.

## Capabilities

### New Capabilities

- `delegation-graph-view`: renders the agent delegation chain as an interactive React Flow graph with automatic layout, custom nodes showing per-node state, and drag/zoom/pan navigation.
- `live-tail`: streams session updates from FastAPI to the frontend over SSE and merges them into the running view without reloads.
- `dashboard-metrics`: shows aggregate KPIs and charts (sessions, cost, tokens, agents) built with Tremor/shadcn, extensible per project needs.

### Modified Capabilities

## Impact

- **Backend**: `src/opendashboard/routes.py` — HTML endpoints converted to JSON under `/api/*`; new `GET /api/sessions/{id}/events` SSE endpoint (polls the existing read-only SQLite connection). `db.py`, `models.py`, `config.py`, `main.py` logic unchanged; static mount in `main.py` keeps serving the Vite build output from `src/opendashboard/static/`.
- **Frontend**: new `frontend/` directory (Vite + React 19 + TypeScript + Tailwind + shadcn/ui + Tremor). Jinja templates and `static/style.css` deleted after parity.
- **Dependencies added**: `@xyflow/react` 12.11.x, `@dagrejs/dagre`, `motion` 11.x, `@tremor/react` 3.x, `@tanstack/react-query` v5, `react-router-dom` v7, shadcn/ui (Tailwind + Radix + `class-variance-authority` + `clsx` + `tailwind-merge`), `vite` 5.x, `@vitejs/plugin-react`.
- **Systems touched**: dashboard index (`/`), project sessions (`/project/{id}`), session detail (`/session/{id}`) — all become SPA client routes backed by the JSON API.
