## 1. Python Server Changes

- [ ] 1.1 Set `APP_PORT` default in `config.py` to `int(os.environ.get("OPENDASHBOARD_PORT", 8420))`, with the existing `--port` CLI flag still taking precedence
- [ ] 1.2 Update `/api/health` in `routes.py` to return `{"status": "ok", "service": "opendashboard", "version": 1}`

## 2. Plugin Rewrite

- [ ] 2.1 Delete `findFreePort()` function
- [ ] 2.2 Delete `opendashboard.url` file write/unlink logic
- [ ] 2.3 Delete `enabled` option handling — remove all `options?.enabled` checks
- [ ] 2.4 Add discovery probe: `fetch("http://127.0.0.1:<PORT>/api/health")` with three-outcome handling (our server / foreign service / connection refused)
- [ ] 2.5 Change spawn `cwd` to absolute path: `--directory /home/hiro03/Private/Projects/OpenCodeGlobal/OpenDashboard`
- [ ] 2.6 Add boot-race fallback: after spawn fails with exit code 3 (`EADDRINUSE`), re-probe health once; if identity marker found, reuse instead of error
- [ ] 2.7 Fix `dispose()`: kill child only if this instance spawned it (`if (childProcess)`)
- [ ] 2.8 Fix `app.log()` call: pass `{ body: { service: "opendashboard", level: "info", message: "..." } }` instead of bare string
- [ ] 2.9 Add `client.tui.showToast()` call delayed ~500ms after spawn, showing `"OpenDashboard :<PORT>"` with variant `"success"`
- [ ] 2.10 Update `dashboard_url` tool: report fixed port when health probe answers with identity marker; "not running" otherwise

## 3. Config Cleanup

- [ ] 3.1 Remove the `["opendashboard", { "enabled": true }]` entry from `opencode.json` plugin array
- [ ] 3.2 Delete `~/.config/opencode/opendashboard.url` if it exists

## 4. Verification

- [ ] 4.1 Standalone usage: `uv run opendashboard` still binds default port and serves `/api/health`
- [ ] 4.2 First instance: plugin spawns dashboard, healthcheck passes, TUI toast shown
- [ ] 4.3 Second instance: plugin probes health, finds identity marker, reuses server, does NOT spawn
- [ ] 4.4 Foreign service: start a plain HTTP server on port 8420, verify plugin surfaces toast and does NOT spawn
- [ ] 4.5 Owner graceful exit: close the owning OpenCode TUI normally, verify `dispose()` fires and Python server dies
- [ ] 4.6 No zombie: after graceful owner exit, confirm no orphaned Python process remains
