## Context

OpenDashboard is a standalone Python FastAPI + React SPA that visualizes OpenCode agent delegation chains. It reads OpenCode's SQLite DB read-only and serves a JSON API + SPA on `127.0.0.1:8080`. Currently it must be started/stopped manually via `uv run opendashboard`.

OpenCode's plugin system loads JS/TS modules from `{plugin,plugins}/*.{ts,js}` via auto-discovery and also accepts explicit entries in the `plugin` array of `opencode.json`. Each plugin exports an async function receiving `PluginInput` (client, project, directory, worktree, `$` BunShell, serverUrl) and returns a `Hooks` object. The `dispose()` hook fires on OpenCode exit. Plugins load once per OpenCode **process** (not per session), but users commonly have multiple OpenCode processes open simultaneously.

The mismatch: OpenCode plugins run in Bun/JS, OpenDashboard is Python. The bridge is process management — the plugin spawns Python as a child process and manages its lifecycle.

### Root cause of the failed first attempt

The plugin file at `~/.config/opencode/plugins/opendashboard.ts` was also listed explicitly in the `plugin` array of `opencode.json` as `["./plugins/opendashboard.ts", { "enabled": true }]`. OpenCode's `deduplicatePluginOrigins` dedupes by resolved `file://` URL and keeps the **last** occurrence. The glob-discovered entry (carrying `options: undefined`) is merged after the config entry and wins. Result: `options` arrives as `undefined`, so `options?.enabled ?? false` evaluates to `false` and the plugin returned `{}` immediately — no spawn, no log, no error. Load-stage errors are also swallowed in v1.18.4 (`publishPluginError` is commented out with a TODO).

Consequence: **auto-discovery and plugin tuple options are mutually exclusive by design.** A plugin in the conventional `plugins/` directory can never receive tuple options.

Two additional API misuses were also found:

1. `ctx.client.app.log("some string")` — the SDK signature is `log(options?: Options<AppLogData>)` where `AppLogData.body = { service, level, message, extra? }`. A bare string produces a malformed POST /log and the 400 is swallowed.
2. `app.log` writes to `~/.local/share/opencode/log/`, never to the TUI screen. The correct API for user-visible surfacing is `client.tui.showToast({ body: { message, variant, duration? } })`.

## Goals / Non-Goals

**Goals:**
- Exactly one dashboard server per machine (singleton), regardless of how many OpenCode instances are open
- Fixed default port `8420`, overridable via `OPENDASHBOARD_PORT` env var
- Discovery-before-spawn: plugin probes health endpoint before deciding to spawn
- Boot-race handling: if two instances race, the loser detects the winner and reuses
- Ownership-based cleanup: `dispose()` kills only the child this instance spawned
- TUI toast surfacing so the user sees the dashboard address
- `dashboard_url` custom tool retained
- Standalone usage (`uv run opendashboard`) preserved unchanged

**Non-Goals:**
- Per-session dashboard instances (senseless fan-out, explicitly rejected)
- Refcounted shutdown or lockfile-based ownership tracking (overkill for a personal tool)
- Auto-opening browser
- Embedding dashboard UI inside OpenCode TUI
- Rewriting Python backend in TypeScript
- Persistent state between OpenCode restarts

## Decisions

### 1. Plugin spawns Python as child process via `Bun.spawn`

**Why:** OpenCode plugins are JS/TS-only. The only way to run Python from a plugin is subprocess execution. `Bun.spawn` gives us direct process control (kill, stdout/stderr, exit detection).

**Alternative considered:** HTTP-triggered on-demand start (plugin sends request to an always-listening launcher daemon). Rejected — adds a daemon process that defeats the "zero resources when inactive" goal.

### 2. Fixed port `8420` with env var override, replaces ephemeral allocation

**Why:** A fixed port makes the kernel's `bind()` the mutex. Discovery becomes a single GET to a known address. With an ephemeral port there is no address to ask "is one already running?", which is exactly what the singleton requirement needs. Both sides read the same env var (`OPENDASHBOARD_PORT`) so they cannot drift: Python's `APP_PORT` default becomes `int(os.environ.get("OPENDASHBOARD_PORT", 8420))`, still overridable by the existing `--port` CLI flag.

**Alternative considered:** Port-range scan to find a running instance. Rejected — reintroduces the discovery problem and makes the startup race unresolvable (the loser of a race would not know where to retry).

**Alternative considered:** Hardcoded 8080. Rejected — conflicts with common development servers; 8420 is in the unregistered range and less likely to collide.

### 3. Discovery before spawn

**Why:** The plugin must not spawn a second dashboard if one is already running. On init, the plugin sends `GET http://127.0.0.1:<PORT>/api/health`. Three outcomes:
- 200 with `{"service": "opendashboard", "version": 1}` → reuse, do not spawn, do not take ownership
- Connection refused → port free, spawn
- 200/404/anything without identity marker → foreign service holds the port. Do NOT spawn (bind would fail). Surface a toast telling the user to change `OPENDASHBOARD_PORT`.

### 4. Self-identifying health endpoint

**Why:** `GET /api/health` must return an identity marker, not just `{"status":"ok"}` — any service can return that. New body: `{"status": "ok", "service": "opendashboard", "version": 1}`. The version field follows Ollama's precedent (`GET /api/version` → magic JSON body identifies the service). Custom HTTP headers were considered and add nothing on loopback — a coincidental foreign service emits neither your header nor your magic JSON, so the discrimination is identical with one less moving part. This is what makes the "foreign service on our port" case detectable instead of a mute 5s timeout.

### 5. Plugin stays in conventional directory, loaded by auto-discovery

**Why:** The file stays at `~/.config/opencode/plugins/opendashboard.ts`. The explicit entry is **removed** from `opencode.json` — the glob already loads it, and the duplicate registration is precisely what broke it. Both `plugin/` (singular) and `plugins/` (plural) are auto-discovered. Moving the file outside both was considered (it would make tuple options work) and rejected: the user wants to stay inside the convention the OpenCode community is establishing, and real-world plugins all live in the auto-discovered directory and get their config from elsewhere.

Toggle semantics: the plugin is on when the file is present. Disable by moving it aside (e.g. `opendashboard.ts.off`). The `enabled` option is deleted.

### 6. Absolute working directory for spawn

**Why:** The plugin is global, so it loads in every project. `cwd: ctx.directory` was wrong — `uv run opendashboard` only resolves inside the OpenDashboard repo and would fail (5s healthcheck timeout on every OpenCode start) anywhere else. Spawn becomes:
`uv run --directory /home/hiro03/Private/Projects/OpenCodeGlobal/OpenDashboard opendashboard --port <PORT>`
Path hardcoded — this plugin is personal, single-machine, and making it configurable is unjustified complexity.

### 7. Ownership-based cleanup

**Why:** `dispose()` kills the child only if this instance spawned it (`if (childProcess)`). Instances that reused an existing server hold no reference and kill nothing. Consequence, accepted knowingly: if the owning instance exits while others are still using the dashboard, the dashboard dies and the others are not notified. Refcounting via lockfile was rejected — stale-entry GC after crashes is more complexity than the problem deserves for a personal tool.

Note: a future app-level idle self-shutdown is viable — shut down when `now - last_inbound_request > T` **AND** `active_sse_streams == 0`. Implementation shape: a FastAPI middleware stamps `last_request`; the SSE generator increments a counter on start and decrements it in a `finally` block (which fires on client crash via `GeneratorExit`); a background asyncio task sets `server.should_exit` when both conditions hold. A naive "last request" timer alone is defeated because SSE heartbeats are outbound writes and never refresh an inbound-request timestamp. Roughly 15 lines of Python. Precedent: Jupyter ships `shutdown_no_activity_timeout` (a 60s-granularity `PeriodicCallback`), though its notion of activity is kernel activity rather than HTTP requests (`serverapp.py` ~line 2593). Recorded as a possible future direction, NOT as scope for this change.

### 8. Startup race (TOCTOU) handling

**Why:** Two OpenCode instances boot simultaneously, both see the port refused, both spawn, one loses with `EADDRINUSE`. uvicorn exits with code 3 (`STARTUP_FAILURE`) on `EADDRINUSE` — the plugin detects this via the child's `exitCode === 3`, then re-probes `/api/health` once. If it now answers with our identity marker, the other instance won the race — the local child is already dead, so drop the reference and reuse. This connect → fail → spawn → reconnect shape is the same pattern Watchman uses. Only resolvable because the port is fixed.

### 9. Correct logging + TUI surfacing

**Why:** The user's actual complaint was "no lo veo en la TUI." Correct APIs:
- `client.app.log({ body: { service: "opendashboard", level: "info", message: "..." } })`
- `client.tui.showToast({ body: { message: "OpenDashboard :8420", variant: "success", duration: 3000 } })`, delayed ~500ms so the TUI is initialized.

### 10. URL file deleted

**Why:** `~/.config/opencode/opendashboard.url` (written/unlinked by the plugin) is removed. With one server on a known port it carries no information. It was also a correctness bug: a single global file being overwritten and unlinked by independent instances.

### 11. `dashboard_url` tool retained

**Why:** The current design.md listed "custom tool" as a Non-Goal, but the implementation ships a `dashboard_url` tool. Resolved by keeping the tool and removing it from Non-Goals. Its logic changes: instead of reporting the in-memory `currentPort` (which is null for instances that reused a server), it reports the known fixed port when `/api/health` answers with our identity marker (`{"service": "opendashboard", "version": 1}`), and reports "not running" otherwise.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Foreign service already occupies port 8420 | Plugin detects identity marker mismatch (no `{"service": "opendashboard", "version": 1}`) and surfaces a toast telling the user to set `OPENDASHBOARD_PORT`. Does not spawn. |
| Owner instance exits while other instances still use dashboard | Dashboard dies; others lose their server. Accepted trade-off over refcounted shutdown. Future: app-level idle self-shutdown (SSE already has `IDLE_TIMEOUT_S = 300`). |
| Two instances boot simultaneously, both try to spawn | Boot-race fallback: child exits with code 3 on `EADDRINUSE`; plugin re-probes health once. Loser detects winner's identity marker and reuses. |
| `uv run` slow on cold venv | Healthcheck has 5s timeout. `uv` caches venv after first run — subsequent starts are fast. |
| Python process crashes after successful healthcheck | Out of scope for v1. Plugin manages lifecycle, not resilience. User restarts OpenCode to restart dashboard. |
| Plugin never receives `enabled` option (auto-discovers without options) | By design. Toggle is file presence, not config flag. Removing the file disables the plugin. |
| OpenCode killed with SIGKILL / crashes | `dispose()` never fires; Python server orphaned until manually killed or machine reboots. Same default behaviour as Jupyter. Recovery: `pkill -f opendashboard`. |
| Browser-facing SSE endpoint has no Host-header validation | Out of scope for this change but a real gap: DNS rebinding from a remote page can reach `127.0.0.1`. Jupyter 403s requests whose Host header is not a local IP (`jupyter_server/serverapp.py` ~line 1348); code-server had CVE GHSA-p483-wpfp-42cj in this area. Follow-up worth its own change. |
