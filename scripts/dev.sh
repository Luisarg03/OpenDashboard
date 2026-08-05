#!/usr/bin/env bash
# Dev runner: starts the FastAPI backend and the Vite frontend together.
set -euo pipefail

# Start the FastAPI backend in the background.
uv run opendashboard &
BACKEND_PID=$!

# Stop the backend when this script exits.
trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT

# Give the backend time to bind its port.
sleep 2

# Start the Vite dev server in the foreground.
cd frontend
npm run dev
