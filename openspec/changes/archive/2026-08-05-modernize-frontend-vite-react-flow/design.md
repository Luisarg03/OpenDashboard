# Design: Modernize Frontend to Vite + React + React Flow

## Context

OpenDashboard is a localhost-only viewer for OpenCode agent delegation chains. Today it is a FastAPI app (8 Python files in `src/opendashboard/`) serving ~9 Jinja2 templates with HTMX partials and ~40 KB of hand-maintained CSS. The delegation graph is rendered as a collapsible `<details>` tree: no drag, zoom, or pan.

Decision (user): migrate the frontend to **Vite + React 19 + `@xyflow/react` 12 + Motion + shadcn/ui + Tremor**, keep FastAPI untouched, live updates via SSE, no SSR.

Reference implementations (verified):
- **Archon** `WorkflowDagViewer.tsx` — same problem (agent DAG with per-node state); key pattern is module-level `nodeTypes` to avoid node remounts.
- **Vercel vibe-coding-ide** — FastAPI + SSE frontend; `useAgentStream` hook using `new EventSource(url)`; backend streams events from FastAPI.
- React Flow official AI-workflow template and Tremor/shadcn dashboard blocks for composition patterns.

Backend facts this design builds on (read-only data layer, unchanged):
- `db.py`: single cached SQLite connection, `PRAGMA query_only = 1`; functions `list_sessions`, `list_root_sessions`, `get_session_by_id`, `get_delegation_chain` (flat `DelegationNode[]`), `get_dashboard_stats`, `list_agents`, `list_session_months`.
- `models.py`: `DelegationNode`/`SessionSummary` with token/cost mixin; `build_tree` derives hierarchy from `parent_id`.
- Known limitation (documented in `routes.py`): running/failed state **cannot be derived from stored data** — `compute_trace_summary` defaults all tasks to completed.
- `main.py`: static mount `/static` → `src/opendashboard/static/`; server on `127.0.0.1:8080`.

## Goals / Non-Goals

**Goals**
- Interactive delegation graph: drag/zoom/pan, automatic layout, custom nodes with per-node state (agent, model, title, cost, tokens, timing).
- Live updates of the active session via SSE, merged into the running view without reloads.
- KPI dashboard (sessions, cost, tokens, agents) with charts, filterable.
- Backend data logic (`db.py`, `models.py`) untouched; FastAPI serves JSON + the built SPA.
- Composable, maintainable UI: shadcn/ui primitives + Tremor charts, no hand-rolled component library.

**Non-Goals**
- Graph editing (node drag-and-drop, add/remove nodes) — this is a read-only viewer.
- Multi-user, authentication, or public deployment.
- SSR / SEO / Next.js.
- Paid React Flow Pro features (obstacle-avoiding edge routing, layout transition animations) — free-tier workarounds instead.
- Backend rewrite; keeping legacy Jinja templates long-term.

## Decisions

### D1. Layout: Vite SPA in `frontend/`, FastAPI serves the build
- New `frontend/` workspace at repo root: Vite 5 + React 19 + TypeScript + Tailwind.
- Dev: `vite` dev server (default 5173) with `server.proxy['/api']` → `http://127.0.0.1:8080`.
- Build: Vite `outDir` set to `../src/opendashboard/static/` (existing static mount). FastAPI serves the built SPA at `/` via a catch-all route returning `index.html`; `/api/*` stays JSON.
- Keeps single-server localhost usage (`python -m opendashboard` on 8080) while dev gets HMR.
- Legacy Jinja templates deleted only after parity (see tasks group 8).

### D2. JSON API layer, 1:1 with existing `db.py` functions — no new backend logic
Existing HTML routes convert to JSON under `/api/*`:
- `GET /api/sessions` — `list_sessions` (query: `limit`, `search`, `agent`, `project_id`, `month`).
- `GET /api/sessions/{id}` — `get_session_by_id`.
- `GET /api/sessions/{id}/chain` — `get_delegation_chain` as flat nodes (client builds edges from `parent_id`; `build_tree` not needed by the graph).
- `GET /api/stats` — `get_dashboard_stats()` (`total_sessions`, `total_cost`, `total_tokens`, `unique_agents`).
- `GET /api/agents` — `list_agents`.
- `GET /api/sessions/{id}/events` — SSE (see D4).
- Response shapes serialize Pydantic models as-is (ISO/timestamps stay epoch ms; `time_created` is epoch ms in DB).

### D3. Graph: `@xyflow/react` 12 + `@dagrejs/dagre` auto-layout
- Flat nodes + `parent_id` → React Flow `nodes`/`edges` (directed edges, no cycles expected).
- Layout: dagre `rankdir: 'TB'` (top-to-bottom matches delegation depth), node dimensions measured from rendered content; layout runs client-side in a `useLayoutedGraph`-style util (layout once per chain, re-run when nodes change).
- **`nodeTypes` declared at module level** (Archon pattern) to prevent node remounts on every render.
- Custom node component (`DelegationNode` type) shows agent badge, model, title, cost, token usage, timestamps; state sourced from `DelegationNode` fields; status badge derived where possible, defaulting to completed per the known DB limitation.
- `MiniMap`, `Controls`, `Background` enabled; attribution notice remains until Pro license (accepted, localhost).
- Free-tier animation workaround: CSS transitions over `transform` + imperative RAF interpolation via Motion `useSpring` for node position changes (Pro layout-transition animation is paid).
- Performance guard (>1000 nodes): `React.memo` custom nodes, `useCallback` handlers, fine-grained selectors via `useStore`; per React Flow stress guidance "hundreds of nodes" is the supported envelope, delegation chains (tens to hundreds) fit comfortably.
- Timeline slider: scrub window over `[earliest_time, latest_time]` of the chain, filtering visible nodes by `time_created` — client-side, no new backend.

### D4. Live tail: SSE from FastAPI, EventSource hook on the client
- Backend: `GET /api/sessions/{id}/events` returns `StreamingResponse(media_type="text/event-stream")`. Async generator polls the existing read-only connection every ~1s, diffs against the last-seen node ids, emits:
  - `node:new` — `{node: DelegationNode}` for newly inserted rows in the chain.
  - `session:updated` — `{session: SessionSummary}` when the session row changes (cost/tokens).
  - `heartbeat` comment (`: ping`) to keep the stream alive; closes when the session is stable for N seconds.
- Framing is hand-rolled (`data: <json>\n\n`), no new dependency; `sse-starlette` only if the raw generator grows awkward.
- Frontend: `useSessionEvents(sessionId)` hook modeled on Vibe Coding IDE's `useAgentStream` — `new EventSource(url)`, `message`/`error`/`open` handlers, native auto-reconnect plus explicit backoff guard, `close()` on unmount, connection status surfaced in UI.
- Merging: new nodes appended to the graph via `addNodes`/`setNodes` (or `applyNodeChanges`), KPI totals recomputed from merged state; no full refetch on `node:new`.
- Only the active session view subscribes; dashboard lists use TanStack Query polling/refetch instead.

### D5. Data fetching: TanStack Query v5
- `QueryClientProvider` at app root; `useQuery` for `/api/sessions`, `/api/stats`, `/api/agents`, `/api/sessions/{id}`, `/api/sessions/{id}/chain`.
- List/stats queries use `staleTime` + `refetchInterval` (few seconds) for live-ish dashboard; SSE is reserved for the active session detail view (cheaper than polling everything).
- v5 API: `isPending`/`isError`/`data`, `queryKey` arrays.

### D6. Routing: `react-router-dom` v7, two client routes
- `/` — dashboard (metrics + session list).
- `/session/:id` — session detail (graph + live tail).
- Rationale: deep-linking sessions on localhost (refresh keeps view), matches shadcn/Tremor block conventions. Alternative (state-only view switch) rejected: no deep links, more manual state.
- `BrowserRouter` is fine on localhost; FastAPI catch-all returns `index.html` for unknown non-`/api` paths.

### D7. UI: shadcn/ui + Tailwind + Tremor
- `npx shadcn@latest init` in `frontend/` (Tailwind + CSS-variable theming, dark/light); components copied into `frontend/src/components/ui/` (button, card, badge, tabs, select, input, dropdown-menu, tooltip, skeleton, scroll-area, separator).
- Tremor 3.x for metrics: `Card`, `Metric`, `Title`, `Text`, `Badge`, `AreaChart`, `BarList`, `DonutChart`, `TabGroup/TabList/Tab/TabPanels/TabPanel`, `Flex` — React-only, which is what ruled out Svelte.
- Motion for micro-interactions: `motion`, `AnimatePresence`, `useSpring`, `useMotionValue` from `motion/react` (hover/expand, panel transitions, focus-mode zoom).
- Custom CSS kept minimal; Tailwind utilities + shadcn tokens replace the 40 KB stylesheet.

### D8. Node/session status honesty
- Stored data cannot distinguish running/failed (existing limitation). The graph shows status from live-tail events when present (`running` while SSE is delivering updates), otherwise renders as completed with the recorded timestamps. No fabricated status derivation.

## Risks / Trade-offs

- **React Flow attribution + Pro features**: attribution badge visible until a paid license; Pro-only obstacle edge routing and layout-transition animations replaced by CSS transitions + `useSpring` interpolation. Accepted (localhost viewer).
- **Performance ceiling**: React Flow's supported stress envelope is hundreds of nodes; chains of 1000+ rich nodes need `React.memo` + `useStore` selectors. Delegation chains are tens-to-hundreds, so this is headroom, not a current constraint.
- **Status accuracy**: running/failed status is not in the SQLite schema; live-tail provides it only while a session is active. Historical sessions show completed.
- **SSE vs polling on read-only DB**: SSE endpoint polls SQLite every ~1s per active viewer; the DB is local and tiny, cost negligible. Multiple tabs = multiple streams; acceptable for localhost.
- **Dual-stack period**: Jinja templates and the SPA coexist until parity; deleted in the final validation group to keep the diff reviewable.
- **Version drift risk**: stack pins (React Flow 12.11.x, Motion 11.x, Vite 5.x, React 19.x, Tremor 3.x, TanStack Query v5, react-router 7) — verify API names against installed versions during setup, notably Motion's `motion/react` import path and Tremor's chart component naming.
- **shadcn/Tremor styling defaults**: both bring opinionated styles; keep them scoped to `frontend/` and rely on Tailwind tokens for theming so the SPA does not leak into any remaining backend-rendered pages.
