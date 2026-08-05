# OpenDashboard

**Visualizer for OpenCode agent delegation chains.**

FastAPI + Vite/React web app that reads the OpenCode SQLite DB and renders an
interactive delegation graph (React Flow) plus a live SSE tail.

```bash
uv sync
uv run opendashboard
# → http://127.0.0.1:8080  (serves the built SPA + JSON API)
```

## Documentation

| File | Contents |
|------|----------|
| [docs/README.md](docs/README.md) | Project overview, quick start, architecture diagram, UI layout |
| [docs/architecture.md](docs/architecture.md) | Stack (Vite + React + React Flow), route map, data flow, SSE live tail |
| [docs/trace-visualization.md](docs/trace-visualization.md) | Delegation graph rendering (React Flow), timeline slider, focus mode, live tail |
| [frontend/README.md](frontend/README.md) | Frontend structure, scripts, dev workflow, adding components |

**Stack:** Python 3.12+ · FastAPI · Vite 5 · React 19 · TypeScript · React Flow 12 · TanStack Query 5 · Tailwind CSS 4 · SQLite (read-only)

## Frontend Development

The frontend is a Vite + React 19 + TypeScript SPA in `frontend/` developed
alongside the FastAPI backend. Two processes in parallel:

```bash
# Install dependencies (first time only)
uv sync
cd frontend && npm install --legacy-peer-deps && cd ..

# Start backend (FastAPI on :8080) + frontend (Vite on :5173 with HMR)
make dev
# → SPA: http://127.0.0.1:5173  ·  API: http://127.0.0.1:8080/api/*
```

`scripts/dev.sh` starts the FastAPI backend in the background, waits 2s, and
runs the Vite dev server; it kills the backend on exit. Vite proxies `/api` and
`/static` to the backend, so no backend changes are needed for frontend dev.

A production build writes straight to the FastAPI static dir:

```bash
cd frontend
npm run build   # → ../src/opendashboard/static/ (index.html + assets/)
```

`uv run opendashboard` then serves the SPA at `/` and the JSON API at `/api/*`
from the same server.

## Local generated artifacts

Build and cache outputs are generated locally and should not be tracked in Git. To build SPA assets for production:

```bash
cd frontend
npm run build   # → ../src/opendashboard/static/ (index.html + assets/)
```

If you accidentally commit generated files, remove them locally and add appropriate .gitignore entries.
