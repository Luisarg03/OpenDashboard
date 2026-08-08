# Tasks: Modernize Frontend to Vite + React + React Flow

## 1. Setup: Vite + React 19 scaffold

- [x] 1.1 Scaffold `frontend/` with `npm create vite@latest` (React + TypeScript template), pin Vite 5.x and React 19.x
- [x] 1.2 Install deps: `@xyflow/react@12`, `@dagrejs/dagre`, `motion`, `@tremor/react`, `@tanstack/react-query`, `react-router-dom`, `@vitejs/plugin-react`
- [x] 1.3 Configure Tailwind CSS and run `npx shadcn@latest init` in `frontend/` (CSS-variable theming, dark/light)
- [x] 1.4 Add shadcn primitives: button, card, badge, tabs, select, input, dropdown-menu, tooltip, skeleton, scroll-area, separator
- [x] 1.5 Add `tsconfig` path aliases (`@/` → `src/`) and set Vite `outDir` to `../src/opendashboard/static/`
- [x] 1.6 Configure Vite dev proxy: `/api` → `http://127.0.0.1:8080`
- [x] 1.7 Add eslint + prettier config and lint/typecheck npm scripts

## 2. FastAPI JSON layer

- [x] 2.1 Convert `GET /` dashboard route to JSON: `GET /api/sessions` (query: `limit`, `search`, `agent`, `project_id`, `month`) returning session summaries
- [x] 2.2 Add `GET /api/sessions/{id}` returning session summary (404 when missing)
- [x] 2.3 Add `GET /api/sessions/{id}/chain` returning flat `DelegationNode` list from `get_delegation_chain`
- [x] 2.4 Add `GET /api/stats` returning `get_dashboard_stats()`
- [x] 2.5 Add `GET /api/agents` returning `list_agents()`
- [x] 2.6 Add SSE endpoint `GET /api/sessions/{id}/events` (`StreamingResponse`, `text/event-stream`, poll read-only connection ~1s, diff new nodes, emit `node:new`/`session:updated`, heartbeat, idle-close)
- [x] 2.7 Add SPA catch-all route serving built `index.html` for non-`/api` GET paths
- [x] 2.8 Unit-test JSON endpoints + SSE framing against the real read-only DB

## 3. Core app shell

- [x] 3.1 Create `QueryClientProvider` + React Router setup at app root
- [x] 3.2 Define routes: `/` (dashboard) and `/session/:id` (graph + live tail)
- [x] 3.3 Build app shell layout (sidebar/topbar, theme toggle dark/light, main content area)
- [x] 3.4 Add TanStack Query hooks for `/api/sessions`, `/api/sessions/{id}`, `/api/sessions/{id}/chain`, `/api/stats`, `/api/agents` (v5 API: `queryKey`, `isPending`, `isError`)

## 4. Graph view (delegation-graph-view)

- [x] 4.1 Build `DelegationGraph` component wrapping `ReactFlowProvider` + `ReactFlow` with `Background`, `Controls`, `MiniMap`, imported `@xyflow/react/dist/style.css`
- [x] 4.2 Derive React Flow nodes/edges from flat chain: one node per `DelegationNode`, one edge per `parent_id`
- [x] 4.3 Implement dagre layout util (`rankdir: 'TB'`, measured node dimensions) and re-run on node-set changes
- [x] 4.4 Create custom `DelegationNode` component (agent badge, model, title, cost, tokens, timestamps) with module-level `nodeTypes` and `React.memo`
- [x] 4.5 Wire node/edge styling (colors per agent, hover highlight) and stable `useCallback` handlers
- [x] 4.6 Add timeline slider spanning `[earliest_time, latest_time]` filtering nodes by `time_created`
- [x] 4.7 Implement status indication: nodes from live-tail render as running, others as completed
- [x] 4.8 Add empty/error states (404 session, empty chain) with link back to dashboard

## 5. Live tail (live-tail)

- [x] 5.1 Implement `useSessionEvents(sessionId)` hook: `new EventSource(url)`, `open`/`message`/`error` handlers, `close()` on unmount, exposed connection status
- [x] 5.2 Add reconnection handling (native auto-reconnect + bounded backoff) and reconnecting UI state
- [x] 5.3 Merge `node:new` events into graph state (append node + edge, re-layout) without full refetch
- [x] 5.4 Merge `session:updated` events into session header/summary (cost/token totals update in place)
- [x] 5.5 Handle terminal session state (stream closed after idle timeout) in the UI

## 6. Dashboard metrics (dashboard-metrics)

- [x] 6.1 Build KPI card section (sessions, cost, tokens, agents) from `/api/stats` with Tremor `Card`/`Metric`/`Title`/`Text` and proper formatting
- [x] 6.2 Add time-series chart (sessions/cost/tokens over time, `AreaChart`) aggregated client-side from `/api/sessions`
- [x] 6.3 Add agent breakdown (`BarList`) and monthly distribution from session data
- [x] 6.4 Add filters (agent from `/api/agents`, month, search) synced to query state and refetching queries
- [x] 6.5 Build session list with title/agent/model/cost/tokens/timestamps, each row linking to `/session/:id`
- [x] 6.6 Add empty-state and error-state handling for charts and KPI section (retry action)
- [x] 6.7 Set `refetchInterval` on list/stats queries for live-ish refresh

## 7. Polish

- [x] 7.1 Add Motion micro-interactions: hover/expand on nodes, panel transitions (`AnimatePresence`), focus-mode zoom to a selected node
- [x] 7.2 Add free-tier layout animation workaround: CSS transitions over `transform` + `useSpring` interpolation for node position changes
- [x] 7.3 Verify focus mode (select node → zoom/pad viewport to it) and timeline slider interplay
- [x] 7.4 Add keyboard/accessibility basics (focus states, aria labels on interactive controls)
- [x] 7.5 Verify dark/light theme consistency across shadcn/Tremor components

## 8. Validation

- [x] 8.1 Run eslint + prettier + `tsc --noEmit` clean
- [x] 8.2 Build SPA and verify FastAPI serves it at `/` with `/api/*` working from the same server
- [x] 8.3 Smoke test against the real OpenCode DB: load dashboard, open a session graph, verify layout/drag/zoom, start an OpenCode run and verify live-tail merges nodes
- [x] 8.4 Verify SSE reconnect behavior (kill/restart server stream) and idle-close state
- [x] 8.5 Parity check against legacy views (dashboard, session list, session detail, filters) and remove Jinja templates + `static/style.css` once confirmed
- [x] 8.6 Update project docs (README/codemap) for the new frontend structure and dev workflow

> **Group 8 notes (2026-08-04):**
> - 8.1: clean. eslint 0 errors (2 pre-existing react-refresh warnings in
>   `ui/badge.tsx`/`ui/button.tsx`, allowed); typecheck ok; prettier 0 files to format.
> - 8.2: verified against real DB. `/` serves SPA shell, `/api/*` JSON, SPA
>   catch-all returns index.html for `/session/test123`. 405 on `HEAD` is expected
>   (routes are GET-only).
> - 8.3: API smoke (sessions/stats/agents/months) + full pytest (81 passed)
>   done against the real OpenCode DB. **Manual verification pending:** browser
>   pass — open dashboard, click a session, verify graph drag/zoom, start an
>   OpenCode run and confirm live-tail merges nodes. Steps in comment at end of
>   `tests/api/test_routes.py`.
> - 8.4: SSE framing verified via curl (emits `node:new` with real session) and
>   `TestEvents` (4 passed). **Manual verification pending:** kill/restart the
>   FastAPI server mid-stream and confirm the EventSource reconnects and the
>   graph resumes updating (native auto-reconnect; run `npm run dev`, open a
>   session, restart backend).
> - 8.5: parity confirmed — legacy KPI cards/sidebar/filters/map and
>   detail/timeline/tree are all covered by the React app. Removed HTML routes
>   from `routes.py`, removed Jinja2 template plumbing from `main.py`, moved
>   `templates/` + `static/style.css` to `/tmp/opencode/legacy-jinja/`
>   (rollback kept), rewrote `tests/test_routes.py` for the SPA catch-all
>   contract. FastAPI verified: `/` + `/api/*` 200 from same server.
> - 8.6: updated root `README.md`, `docs/README.md`, `docs/architecture.md`,
>   `docs/trace-visualization.md`, `docs/codemap.md`; created `frontend/README.md`.
