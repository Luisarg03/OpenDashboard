## ADDED Requirements

### Requirement: Plugin loads via auto-discovery, toggle by file presence
The plugin SHALL be loaded automatically by OpenCode's glob-based discovery (`{plugin,plugins}/*.{ts,js}`). There is no `enabled` config option — the plugin is active when the file exists and inactive when it is absent or renamed (e.g. `opendashboard.ts.off`).

#### Scenario: Plugin file present
- **WHEN** `~/.config/opencode/plugins/opendashboard.ts` exists
- **THEN** OpenCode auto-discovers and loads the plugin during startup

#### Scenario: Plugin file absent
- **WHEN** `~/.config/opencode/plugins/opendashboard.ts` does not exist
- **THEN** OpenCode does not load the plugin; the dashboard does not start

---

### Requirement: Plugin spawns dashboard on OpenCode startup
During initialization, the plugin SHALL probe the health endpoint to determine if a dashboard is already running. If no server is found, the plugin SHALL spawn the OpenDashboard Python server as a child process.

#### Scenario: No server running, plugin spawns
- **WHEN** OpenCode starts and the health probe returns connection-refused
- **THEN** the plugin spawns `uv run --directory <path-to-opendashboard-repo> opendashboard --port <PORT>` and polls healthcheck

#### Scenario: Server already running, plugin reuses
- **WHEN** OpenCode starts and the health probe returns 200 with `{"service": "opendashboard", "version": 1}`
- **THEN** the plugin does not spawn a new server and holds no child process reference

---

### Requirement: Plugin kills dashboard on OpenCode exit (ownership only)
The plugin SHALL implement the `dispose()` hook. When `dispose()` fires, the plugin SHALL terminate the child Python process **only** if this instance spawned it.

#### Scenario: Owning instance exits
- **WHEN** OpenCode exits and this instance spawned the dashboard
- **THEN** `dispose()` fires and the Python process is killed

#### Scenario: Non-owning instance exits
- **WHEN** OpenCode exits and this instance reused an existing server
- **THEN** `dispose()` fires but takes no action (no child process to kill)

#### Scenario: Plugin never started dashboard
- **WHEN** OpenCode exits without the dashboard ever starting (health probe found existing server, or spawn failed)
- **THEN** `dispose()` fires but takes no action

---

### Requirement: Python server accepts --port CLI flag
The Python server SHALL accept a `--port` CLI argument. When provided, the server SHALL bind to that port instead of the default.

#### Scenario: Server started with --port flag
- **WHEN** the server is invoked as `uv run opendashboard --port 9000`
- **THEN** the server binds to `127.0.0.1:9000`

#### Scenario: Server started without --port flag
- **WHEN** the server is invoked as `uv run opendashboard`
- **THEN** the server binds to the port determined by `OPENDASHBOARD_PORT` env var or the default `8420`

---

### Requirement: TUI toast surfacing
The plugin SHALL display a TUI toast when the dashboard is ready or when a startup error occurs. The toast SHALL be delayed ~500ms after spawn to allow TUI initialization.

#### Scenario: Dashboard started successfully
- **WHEN** the healthcheck passes after spawn
- **THEN** a TUI toast is shown with message `"OpenDashboard :<PORT>"` and variant `"success"`

#### Scenario: Dashboard already running (reuse)
- **WHEN** the health probe finds an existing dashboard
- **THEN** a TUI toast is shown with message `"OpenDashboard :<PORT>"` and variant `"success"`

#### Scenario: Foreign service on port
- **WHEN** the health probe finds a non-OpenDashboard service on the port
- **THEN** a TUI toast is shown instructing the user to set `OPENDASHBOARD_PORT`

#### Scenario: Startup failure
- **WHEN** the healthcheck times out after spawn
- **THEN** a TUI toast is shown with an error message

---

### Requirement: Correct app.log usage
The plugin SHALL call `client.app.log()` with a structured body `{ service, level, message }`, not a bare string.

#### Scenario: Logging a startup message
- **WHEN** the plugin logs a message
- **THEN** the call is `client.app.log({ body: { service: "opendashboard", level: "info", message: "..." } })`

---

### Requirement: dashboard_url tool
The plugin SHALL expose a `dashboard_url` tool that reports the dashboard address when the server is running.

#### Scenario: Server running
- **WHEN** the tool is invoked and `/api/health` returns 200 with `{"service": "opendashboard", "version": 1}`
- **THEN** the tool returns the known fixed port URL (e.g. `http://127.0.0.1:8420`)

#### Scenario: Server not running
- **WHEN** the tool is invoked and `/api/health` returns connection-refused or a non-matching response
- **THEN** the tool reports "not running"
