## Why

OpenDashboard currently runs as a standalone Python FastAPI server, requiring manual start/stop and consuming resources independently of OpenCode. Packaging it as an OpenCode plugin ties its lifecycle to OpenCode's own — the dashboard starts when OpenCode starts and stops when OpenCode exits, guaranteeing zero resource consumption when inactive. A single dashboard instance serves all OpenCode processes on the machine.

## What Changes

- TypeScript plugin (`~/.config/opencode/plugins/opendashboard.ts`) that manages the OpenDashboard Python server as a child process
- Plugin discovers an existing dashboard via health probe before spawning; exactly one dashboard runs per machine regardless of how many OpenCode instances are open
- Fixed default port `8420`, overridable via `OPENDASHBOARD_PORT` env var
- `findFreePort()` removed — the fixed port makes `bind()` the mutex
- Python server reads `OPENDASHBOARD_PORT` env var for default port, still overridable by `--port` CLI flag
- `/api/health` returns `{"status": "ok", "service": "opendashboard"}` (identity marker, not just `{"status":"ok"}`)
- Plugin surfaces status to TUI via `client.tui.showToast()`
- `dispose()` kills the child process only if this instance spawned it
- `opencode.json` plugin tuple entry removed — auto-discovery loads the plugin; toggle is by file presence
- `~/.config/opencode/opendashboard.url` file removed
- `dashboard_url` custom tool retained (reports known fixed port when server is alive)

## Capabilities

### New Capabilities
- `singleton-server`: One OpenDashboard server per machine on a fixed port, with discovery-before-spawn and boot-race resolution
- `plugin-lifecycle`: OpenCode plugin that spawns, monitors, and kills the OpenDashboard Python server; ownership-based dispose

### Modified Capabilities
- (none — existing specs are replaced, not patched)

## Impact

- **Affected code**: `src/opendashboard/config.py` (env-backed default port), `src/opendashboard/routes.py` (health endpoint identity marker)
- **New files**: `~/.config/opencode/plugins/opendashboard.ts` (plugin entry point)
- **Deleted files**: `~/.config/opencode/opendashboard.url`
- **Dependencies**: No new runtime dependencies. Plugin uses Bun's built-in `fetch` for health probe and `Bun.spawn` for process management
- **User action required**: **Remove** the existing `["opendashboard", { "enabled": true }]` entry from `opencode.json` plugin array — the glob auto-discovers it and the duplicate registration is what broke the plugin
- **Breaking**: None — standalone usage (`uv run opendashboard`) still works exactly as before
