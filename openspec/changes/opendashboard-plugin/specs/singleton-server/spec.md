## ADDED Requirements

### Requirement: Fixed port with environment variable override
The server SHALL bind to port `8420` by default. The port SHALL be overridable via the `OPENDASHBOARD_PORT` environment variable. The `--port` CLI flag SHALL take precedence over the environment variable.

#### Scenario: Default port
- **WHEN** the server is started without `OPENDASHBOARD_PORT` or `--port`
- **THEN** the server binds to `127.0.0.1:8420`

#### Scenario: Env var override
- **WHEN** `OPENDASHBOARD_PORT=9000` is set and no `--port` flag is provided
- **THEN** the server binds to `127.0.0.1:9000`

#### Scenario: CLI flag override
- **WHEN** `OPENDASHBOARD_PORT=9000` is set and `--port 7777` is provided
- **THEN** the server binds to `127.0.0.1:7777`

---

### Requirement: Self-identifying health endpoint
The server SHALL expose `GET /api/health` returning HTTP 200 with body `{"status": "ok", "service": "opendashboard", "version": 1}`.

#### Scenario: Healthcheck requested
- **WHEN** a client sends `GET /api/health`
- **THEN** the server responds with `200 OK` and body `{"status": "ok", "service": "opendashboard", "version": 1}`

---

### Requirement: Discovery before spawn
The plugin SHALL probe `GET http://127.0.0.1:<PORT>/api/health` before attempting to spawn the server.

#### Scenario: No server running (port refused)
- **WHEN** the health probe returns a connection-refused error
- **THEN** the plugin spawns the server as a child process

#### Scenario: Our server already running
- **WHEN** the health probe returns 200 with `{"service": "opendashboard", "version": 1}`
- **THEN** the plugin does NOT spawn a new server and does NOT take ownership (will not kill on dispose)

#### Scenario: Foreign service on our port
- **WHEN** the health probe returns 200 or 404 but the body does NOT contain `{"service": "opendashboard", "version": 1}`
- **THEN** the plugin does NOT spawn, and surfaces a TUI toast instructing the user to change `OPENDASHBOARD_PORT`

---

### Requirement: Boot-race resolution
When a spawn attempt fails with exit code 3 (uvicorn's `STARTUP_FAILURE` on `EADDRINUSE`), the plugin SHALL re-probe the health endpoint once.

#### Scenario: Another instance won the race
- **WHEN** the child exits with code 3 and the subsequent health probe returns 200 with `{"service": "opendashboard", "version": 1}`
- **THEN** the plugin drops its (dead) child reference and reuses the existing server

#### Scenario: Port held by foreign service after spawn failure
- **WHEN** the child exits with code 3 and the health probe returns a response without `{"service": "opendashboard", "version": 1}`
- **THEN** the plugin surfaces a TUI toast instructing the user to change `OPENDASHBOARD_PORT`

---

### Requirement: Healthcheck polling after spawn
After spawning the server, the plugin SHALL poll `GET /api/health` every 200ms until it returns 200 with our identity marker, or 5 seconds elapse.

#### Scenario: Server becomes ready within timeout
- **WHEN** the server starts in 800ms and begins serving `/api/health` with `{"service": "opendashboard", "version": 1}`
- **THEN** the healthcheck succeeds after ~4 polls (800ms) and the TUI toast is displayed

#### Scenario: Server never becomes ready
- **WHEN** the health endpoint never returns 200 with `{"service": "opendashboard", "version": 1}` within 5 seconds
- **THEN** the plugin kills the child process and surfaces an error TUI toast
