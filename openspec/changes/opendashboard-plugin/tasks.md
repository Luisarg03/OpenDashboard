## 1. Python Server Changes

- [x] 1.1 Set `APP_PORT` default in `config.py` to `int(os.environ.get("OPENDASHBOARD_PORT", 8420))`, with the existing `--port` CLI flag still taking precedence
- [x] 1.2 Update `/api/health` in `routes.py` to return `{"status": "ok", "service": "opendashboard", "version": 1}`

## 2. Plugin Rewrite

- [x] 2.1 Delete `findFreePort()` function
- [x] 2.2 Delete `opendashboard.url` file write/unlink logic
- [x] 2.3 Delete `enabled` option handling — remove all `options?.enabled` checks
- [x] 2.4 Add discovery probe: `fetch("http://127.0.0.1:<PORT>/api/health")` with three-outcome handling (our server / foreign service / connection refused)
- [x] 2.5 Change spawn `cwd` to absolute path: `--directory /home/hiro03/Private/Projects/OpenCodeGlobal/OpenDashboard`
- [x] 2.6 Add boot-race fallback: after spawn fails with exit code 3 (`EADDRINUSE`), re-probe health once; if identity marker found, reuse instead of error
- [x] 2.7 Fix `dispose()`: kill child only if this instance spawned it (`if (childProcess)`)
- [x] 2.8 Fix `app.log()` call: pass `{ body: { service: "opendashboard", level: "info", message: "..." } }` instead of bare string
- [x] 2.9 Add `client.tui.showToast()` call delayed ~500ms after spawn, showing `"OpenDashboard :<PORT>"` with variant `"success"`
- [x] 2.10 Update `dashboard_url` tool: report fixed port when health probe answers with identity marker; "not running" otherwise

## 3. Config Cleanup

- [x] 3.1 Remove the `["opendashboard", { "enabled": true }]` entry from `opencode.json` plugin array
- [x] 3.2 Delete `~/.config/opencode/opendashboard.url` if it exists

## 4. Verification

- [x] 4.1 Standalone usage: `uv run opendashboard` still binds default port and serves `/api/health`
- [ ] 4.2 First instance: plugin spawns dashboard, healthcheck passes, TUI toast shown
- [ ] 4.3 Second instance: plugin probes health, finds identity marker, reuses server, does NOT spawn
- [ ] 4.4 Foreign service: start a plain HTTP server on port 8420, verify plugin surfaces toast and does NOT spawn
- [ ] 4.5 Owner graceful exit: close the owning OpenCode TUI normally, verify `dispose()` fires and Python server dies
- [ ] 4.6 No zombie: after graceful owner exit, confirm no orphaned Python process remains

## 5. Notes

1. The plugin file `~/.config/opencode/plugins/opendashboard.ts` and `~/.config/opencode/opencode.json` live outside this repository and are NOT covered by the commit for this change. Only the Python-side changes (`src/opendashboard/config.py`, `src/opendashboard/routes.py`, `tests/test_config.py`) and these planning artifacts are versioned here.
2. Two follow-ups deliberately left out of scope, each worth its own change: (a) Host-header validation on the browser-facing SSE endpoint to close the DNS-rebinding gap; (b) app-level idle self-shutdown gated on `now - last_inbound_request > T AND active_sse_streams == 0`.
