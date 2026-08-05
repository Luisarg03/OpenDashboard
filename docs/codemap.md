# Repository Atlas: OpenDashboard

## Project Responsibility

OpenDashboard is a **read-only web dashboard** for visualizing OpenCode agent
delegation chains. It reads the OpenCode SQLite database
(`~/.local/share/opencode/opencode.db`) and renders an interactive delegation
graph in a **FastAPI + Vite/React SPA**: JSON API backend, React Flow graph,
live SSE tail.

The dashboard provides:
- Session browsing with search, agent, and month filters
- KPI dashboard (sessions, cost, tokens, agents) with time-series/agent charts
- Interactive delegation graph (React Flow + dagre layout) with timeline
  slider and focus mode
- Live SSE tail that merges `node:new`/`session:updated` events into the open
  session view
- Dark/light theme

## System Entry Points

| Entry | File | Purpose |
|-------|------|---------|
| CLI entry | `src/opendashboard/__main__.py` | `python -m opendashboard` calls `main()` |
| Script entry | `pyproject.toml` → `[project.scripts]` | `uv run opendashboard` calls `opendashboard:main` |
| Package init | `src/opendashboard/__init__.py` | Exports `main`, `app` |
| ASGI app | `src/opendashboard/main.py` | FastAPI app factory, static mount, uvicorn runner |
| Frontend entry | `frontend/src/main.tsx` | ReactDOM entry, QueryClientProvider + Router |

## Directory Map

| Directory | Responsibility Summary | Detailed Map |
|-----------|------------------------|--------------|
| `src/opendashboard/` | Core application: JSON routes, DB queries, models, static SPA bundle | [View details below](#srcopendashboard) |
| `frontend/` | Vite 5 + React 19 SPA: dashboard, graph, live tail | [View details below](#frontend) |
| `tests/` | Test suite: pytest with in-memory SQLite fixtures | Sub-map not yet created |
| `docs/` | Diátaxis documentation: README, architecture, trace viz | Sub-map not yet created |

---

## `src/opendashboard/` — Module Map

### Module Responsibilities

| File | Responsibility |
|------|----------------|
| `__init__.py` | Package exports: `main`, `app`, `__version__` |
| `__main__.py` | Entry point — calls `main()` from `main.py` |
| `main.py` | FastAPI app factory, `/static` mount, `main()` for uvicorn |
| `config.py` | Constants: paths (`DB_PATH`, `STATIC_DIR`), server config (`APP_HOST`, `APP_PORT`), `__version__` |
| `db.py` | SQLite read-only data access layer — cached connection singleton, 7 query functions |
| `models.py` | Pydantic models (`SessionSummary`, `DelegationNode`) + `build_tree()` hierarchy builder |
| `routes.py` | `/api/*` JSON routes + SSE endpoint + SPA catch-all + `compute_trace_summary()` helper |
| `static/` | Vite build output (`index.html` + `assets/`) — generated, do not edit |

### Data Flow

```
opencode.db (SQLite, read-only)
    ↓  PRAGMA query_only
db.py — cached connection, SQL queries
    ↓  SessionSummary / DelegationNode
models.py — Pydantic models + build_tree()
    ↓  to_dict()
routes.py — /api/* JSON + SSE stream + SPA catch-all
    ↓  JSON over HTTP / SSE events
frontend/ — TanStack Query hooks + useSessionEvents(EventSource)
    ↓  React Flow graph + dashboard components
Browser
```

### Key Design Patterns

- **Read-only SQLite singleton** with double-checked locking (`threading.Lock`) — safe for single-process async access
- **Recursive CTE** for delegation chain fetch — single round-trip to get tree-flat data
- **Flat chain + client-side edges** — `/api/sessions/{id}/chain` returns flat nodes; React Flow derives edges from `parent_id`
- **SSE live tail** — poll + diff new nodes, `data: <json>` framing, heartbeat, idle close (300s)
- **SPA catch-all** — declared after `/api/*` so only non-API GET paths serve the built `index.html`

### State Detection

State (running/completed) is not persisted in the source DB. The SPA marks
nodes delivered by the live-tail stream as running; everything else renders as
completed. (Legacy heuristic: leaf with `time_created == latest_time`.)

### Cross-References

- [Architecture deep-dive](architecture.md)
- [Trace visualization details](trace-visualization.md)
- [Frontend README](../frontend/README.md)

---

## `frontend/` — Module Map

### Module Responsibilities

| Path | Responsibility |
|------|----------------|
| `src/main.tsx` | Entry — QueryClientProvider + Router |
| `src/App.tsx` | Routes: `/` (dashboard), `/session/:id` (graph + live tail) |
| `src/app-shell.tsx` | Layout shell, theme toggle |
| `src/pages/` | `dashboard.tsx`, `session-detail.tsx`, `not-found.tsx` |
| `src/features/dashboard/` | KPI section, cost time-series, agent breakdown, filters, session list, states |
| `src/features/session/` | `delegation-graph.tsx`, `delegation-node.tsx`, `node-types.ts`, `timeline-slider.tsx`, `session-states.tsx`, `chain-to-flow.ts`, `layout.ts` |
| `src/components/ui/` | shadcn primitives (button, card, badge, select, tabs, ...) |
| `src/lib/api/` | TanStack Query hooks: `sessions.ts`, `stats.ts`, `agents.ts`, `stream.ts`, `client.ts` |
| `src/lib/format.ts` | Currency/token/number formatting |

### Frontend Patterns

- **TanStack Query v5** — `queryKey`/`isPending`/`isError`, `refetchInterval` for dashboard refresh
- **React Flow 12** — custom `delegation` nodes (module-level `nodeTypes`, `React.memo`), dagre `TB` layout, `useCallback` handlers
- **SSE hook** — `useSessionEvents(sessionId)` wraps `EventSource`, native auto-reconnect + bounded backoff, close on unmount
- **shadcn + Tremor** — CSS-variable theming, `next-themes` dark/light toggle
