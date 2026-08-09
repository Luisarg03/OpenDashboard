# OpenDashboard Frontend

Vite 5 + React 19 + TypeScript SPA for OpenDashboard. Renders the FastAPI JSON
API (`/api/*`) into a dashboard, a React Flow delegation graph, and a live SSE
tail.

## Scripts

```bash
npm install --legacy-peer-deps  # Tremor 3.x has a peer dependency issue with React 19
npm run dev                     # Vite dev server on :5173, proxies /api and /static to :8420
npm run build                   # typecheck + build; writes to ../src/opendashboard/static/
npm run lint                    # eslint
npm run typecheck               # tsc -b --noEmit
npm run format                  # prettier --write .
npm run format:check            # prettier --check .
```

The dev proxy is defined in `vite.config.ts`: `/api` and `/static` are forwarded
to `http://127.0.0.1:8420`, so no backend work is needed for frontend dev.
`npm run build` outputs directly to the FastAPI static dir, so a production
server serves the SPA from `/`.

## Structure

```
src/
├── main.tsx               # ReactDOM entry, QueryClientProvider + Router
├── App.tsx                # Route definitions: / (dashboard), /session/:id (graph)
├── app-shell.tsx          # Layout: sidebar/topbar, theme toggle, content area
├── theme-provider.tsx     # next-themes light/dark wrapper
├── theme-toggle.tsx       # Dark/light toggle button
├── index.css              # Tailwind 4 + CSS-variable theming
├── pages/
│   ├── dashboard.tsx      # Dashboard page (KPI + charts + session list)
│   ├── session-detail.tsx # Session graph + live tail page
│   └── not-found.tsx      # 404 state
├── features/              # Feature components, one folder per feature
│   ├── dashboard/         # kpi-section, cost-timeseries, agent-breakdown,
│   │                      # dashboard-filters, session-list, states
│   └── session/           # delegation-graph, delegation-node, node-types,
│                          # timeline-slider, session-states, chain-to-flow, layout
├── components/ui/         # shadcn primitives (button, card, badge, select, ...)
├── lib/
│   ├── api/               # TanStack Query hooks (sessions, stats, agents, stream)
│   └── format.ts          # Currency/token/number formatting helpers
└── test/                  # Vitest setup
```

## Adding components

- **shadcn primitive:** `npx shadcn@latest add <name>` from `frontend/`. It
  drops the component into `src/components/ui/`.
- **Feature component:** add a file under `src/features/<feature>/` and export
  a typed component; wire it into the page in `src/pages/`.

## Tooling

- Tailwind CSS v4 (`@tailwindcss/vite` plugin, CSS-first config in `index.css`)
- React Flow v12 (`@xyflow/react`) for the delegation graph
- TanStack Query v5 for data fetching and `refetchInterval`
- Tremor 3.x + recharts for charts
- shadcn/ui primitives for the app shell
