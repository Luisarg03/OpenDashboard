# API Reference

**OpenDashboard v0.1.0**

This reference documents all public modules, functions, models, and configuration constants in the OpenDashboard application.

---

## Table of Contents

- [Routes](#routes)
- [DB Functions](#db-functions)
- [Pydantic Models](#pydantic-models)
- [Template Filters](#template-filters)
- [Config Constants](#config-constants)
- [Helper Functions](#helper-functions)

---

## Routes

All routes are defined in `src/opendashboard/routes.py` on a shared `APIRouter` instance. Each returns `HTMLResponse` and is registered in `main.py` via `app.include_router(router)`.

### `GET /`

Full dashboard page. Returns the shell layout (sidebar + main panel) with preloaded first root session.

**Signature:**

```python
@router.get("/", response_class=HTMLResponse)
async def index(
    request: Request,
    search: str = "",
    agent: str = "",
    month: str = "",
) -> HTMLResponse:
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `str` | `""` | Filter sessions by title (SQL `LIKE`) |
| `agent` | `str` | `""` | Filter sessions by agent name (exact match) |
| `month` | `str` | `""` | Filter sessions by year-month (`"2026-06"` format) |

**Templates:**

| Condition | Template |
|-----------|----------|
| Non-HTMX request | `index.html` |
| HTMX request (`hx-request: true`) | `session_list.html` |

**Context Keys (non-HTMX):**

| Key | Type | Description |
|-----|------|-------------|
| `request` | `Request` | FastAPI request object |
| `sessions` | `list[SessionSummary]` | All sessions (up to 200) |
| `root_sessions` | `list[SessionSummary]` | Root sessions (parent_id IS NULL, up to 50) |
| `agents` | `list[str]` | Distinct agent names |
| `months` | `list[dict]` | Year-month objects `{ym: str, count: int}` |
| `stats` | `dict` | Aggregate stats (see `get_dashboard_stats()`) |
| `first_map` | `dict\|None` | Preloaded delegation map for first root session |
| `search` | `str` | Current search filter |
| `agent` | `str` | Current agent filter |
| `month` | `str` | Current month filter |
| `hx_target` | `str` | Always `"main-content-area"` |

**Errors:** Returns `error.html` with HTTP 200 for `FileNotFoundError` or generic exceptions.

---

### `GET /session/{session_id}/map`

HTMX partial endpoint. Returns the delegation map for a session, swapped into `#map-panel`.

**Signature:**

```python
@router.get("/session/{session_id}/map", response_class=HTMLResponse)
async def session_map_partial(request: Request, session_id: str) -> HTMLResponse:
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `session_id` | `str` | OpenCode session ID |

**Template:** `_session_detail_body.html`

**Context Keys:**

| Key | Type | Description |
|-----|------|-------------|
| `request` | `Request` | FastAPI request |
| `session` | `SessionSummary` | Session metadata |
| `tree` | `list[DelegationNode]` | Root-level nodes from `build_tree()` |
| `total_cost` | `float` | Sum of all node costs in the chain |
| `total_tokens` | `int` | Sum of all token usage |
| `earliest_time` | `int` | Minimum `time_created` in ms |
| `latest_time` | `int` | Maximum `time_created` in ms |
| `trace_summary` | `dict` | Aggregate stats from `compute_trace_summary()` |
| `use_htmx_nav` | `bool` | Always `False` |

**Errors:** Returns plain text `"Session not found"` with 404, or `error.html` for exceptions.

---

### `GET /session/{session_id}`

Session detail page. Dual-mode: returns full page or partial depending on HTMX header.

**Signature:**

```python
@router.get("/session/{session_id}", response_class=HTMLResponse)
async def session_detail(request: Request, session_id: str) -> HTMLResponse:
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `session_id` | `str` | OpenCode session ID |

**Templates:**

| Condition | Template |
|-----------|----------|
| Non-HTMX request | `session_detail.html` |
| HTMX request | `_session_detail_body.html` |

**Context Keys:**

| Key | Type | Description |
|-----|------|-------------|
| `request` | `Request` | FastAPI request |
| `session` | `SessionSummary` | Session metadata |
| `tree` | `list[DelegationNode]` | Root-level nodes from `build_tree()` |
| `total_cost` | `float` | Sum of all node costs |
| `total_tokens` | `int` | Sum of all token usage |
| `earliest_time` | `int` | Minimum `time_created` in ms |
| `latest_time` | `int` | Maximum `time_created` in ms |
| `trace_summary` | `dict` | Aggregate stats |
| `is_htmx` | `bool` | Whether this is an HTMX request |
| `use_htmx_nav` | `bool` | Same as `is_htmx` |

**Errors:** Returns plain text `"Session not found"` with 404, or `error.html` for exceptions.

---

### `GET /session/{session_id}/tree`

Legacy partial endpoint. Returns only the delegation tree HTML without session metadata.

**Signature:**

```python
@router.get("/session/{session_id}/tree", response_class=HTMLResponse)
async def session_tree_partial(request: Request, session_id: str) -> HTMLResponse:
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `session_id` | `str` | OpenCode session ID |

**Template:** `tree.html`

**Context Keys:**

| Key | Type | Description |
|-----|------|-------------|
| `request` | `Request` | FastAPI request |
| `tree` | `list[DelegationNode]` | Root-level nodes |
| `earliest_time` | `int` | Minimum `time_created` in ms |
| `latest_time` | `int` | Maximum `time_created` in ms |
| `trace_summary` | `dict` | Aggregate stats |

**Errors:** Returns `error.html` for exceptions.

---

### `GET /project/{project_id}`

Legacy partial endpoint. Returns sessions filtered by project ID.

**Signature:**

```python
@router.get("/project/{project_id}", response_class=HTMLResponse)
async def project_sessions(
    request: Request,
    project_id: str,
    search: str = "",
    agent: str = "",
    month: str = "",
) -> HTMLResponse:
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `project_id` | `str` | OpenCode project ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `str` | `""` | Filter by title |
| `agent` | `str` | `""` | Filter by agent |
| `month` | `str` | `""` | Filter by year-month |

**Template:** `session_list.html`

**Context Keys:**

| Key | Type | Description |
|-----|------|-------------|
| `request` | `Request` | FastAPI request |
| `sessions` | `list[SessionSummary]` | Filtered sessions (up to 200) |
| `project_id` | `str` | Project ID from path |
| `agents` | `list[str]` | Distinct agent names |
| `months` | `list[dict]` | Year-month objects for this project |
| `search` | `str` | Current search filter |
| `agent` | `str` | Current agent filter |
| `month` | `str` | Current month filter |

**Errors:** Returns `error.html` for exceptions.

---

## DB Functions

All functions are in `src/opendashboard/db.py`. They operate on a cached read-only SQLite connection.

### `get_db()`

Get or create the cached read-only SQLite connection. Uses double-checked locking for thread safety.

**Signature:**

```python
def get_db() -> sqlite3.Connection:
```

**Returns:** `sqlite3.Connection` with `row_factory = sqlite3.Row` and `PRAGMA query_only = 1`.

**Raises:**
- `FileNotFoundError` — If `DB_PATH` does not exist

**Notes:**
- Connection is cached in module-level `_connection` variable
- `threading.Lock()` protects initialization
- Designed for single-process, async-worker FastAPI deployment

---

### `list_sessions()`

List sessions with optional filters, ordered by `time_created DESC`.

**Signature:**

```python
def list_sessions(
    project_id: Optional[str] = None,
    limit: int = 50,
    search: Optional[str] = None,
    agent: Optional[str] = None,
) -> list[SessionSummary]:
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `project_id` | `Optional[str]` | `None` | Filter by project ID |
| `limit` | `int` | `50` | Maximum rows returned |
| `search` | `Optional[str]` | `None` | Filter by title (SQL `LIKE %search%`) |
| `agent` | `Optional[str]` | `None` | Filter by exact agent name |

**SQL Query:** `SELECT ... FROM session WHERE 1=1 [+ filters] ORDER BY time_created DESC LIMIT ?`

**Returns:** `list[SessionSummary]`

---

### `list_root_sessions()`

List root sessions (`parent_id IS NULL`) with optional filters.

**Signature:**

```python
def list_root_sessions(
    limit: int = 100,
    search: Optional[str] = None,
    agent: Optional[str] = None,
) -> list[SessionSummary]:
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | `int` | `100` | Maximum rows returned |
| `search` | `Optional[str]` | `None` | Filter by title |
| `agent` | `Optional[str]` | `None` | Filter by agent |

**SQL Query:** `SELECT ... FROM session WHERE parent_id IS NULL [+ filters] ORDER BY time_created DESC LIMIT ?`

**Returns:** `list[SessionSummary]`

---

### `get_dashboard_stats()`

Get aggregate statistics across all sessions.

**Signature:**

```python
def get_dashboard_stats() -> dict:
```

**SQL Query:**

```sql
SELECT
    COUNT(*) as total_sessions,
    COALESCE(SUM(cost), 0) as total_cost,
    COALESCE(SUM(tokens_input + tokens_output), 0) as total_tokens,
    COUNT(DISTINCT agent) as unique_agents
FROM session
```

**Returns:** `dict` with keys:
| Key | Type | Description |
|-----|------|-------------|
| `total_sessions` | `int` | Total session count |
| `total_cost` | `float` | Sum of all costs |
| `total_tokens` | `int` | Sum of all token usage |
| `unique_agents` | `int` | Distinct agent count |

---

### `list_agents()`

Get distinct agent names, sorted alphabetically.

**Signature:**

```python
def list_agents() -> list[str]:
```

**SQL Query:** `SELECT DISTINCT agent FROM session ORDER BY agent`

**Returns:** `list[str]`

---

### `list_session_months()`

Get distinct year-month combinations with session counts.

**Signature:**

```python
def list_session_months(project_id: Optional[str] = None) -> list[dict]:
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `project_id` | `Optional[str]` | `None` | Filter by project |

**SQL Query:**

```sql
SELECT strftime('%Y-%m', time_created / 1000, 'unixepoch') AS ym, COUNT(*) as count
FROM session
[WHERE project_id = ?]
GROUP BY ym ORDER BY ym DESC
```

**Returns:** `list[dict]` with keys `{ym: str, count: int}`

---

### `get_delegation_chain()`

Recursive CTE to get the full delegation chain for a session.

**Signature:**

```python
def get_delegation_chain(session_id: str) -> list[DelegationNode]:
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `session_id` | `str` | Root session ID to traverse from |

**SQL Query:**

```sql
WITH RECURSIVE chain AS (
    SELECT id, parent_id, agent, model, title,
           time_created, cost, tokens_input, tokens_output,
           tokens_reasoning, tokens_cache_read, tokens_cache_write,
           0 AS depth
    FROM session
    WHERE id = ?
    UNION ALL
    SELECT s.id, s.parent_id, s.agent, s.model, s.title,
           s.time_created, s.cost, s.tokens_input, s.tokens_output,
           s.tokens_reasoning, s.tokens_cache_read, s.tokens_cache_write,
           c.depth + 1
    FROM session s
    JOIN chain c ON s.parent_id = c.id
)
SELECT * FROM chain ORDER BY depth, time_created
```

**Returns:** `list[DelegationNode]` — flat list ordered by depth then time_created.

**Notes:** Single round-trip to SQLite. All hierarchy building happens in Python via `build_tree()`.

---

### `get_session_by_id()`

Get a single session by ID.

**Signature:**

```python
def get_session_by_id(session_id: str) -> Optional[SessionSummary]:
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `session_id` | `str` | Session ID to look up |

**SQL Query:** `SELECT ... FROM session WHERE id = ?`

**Returns:** `SessionSummary` or `None` if not found.

---

## Pydantic Models

All models are in `src/opendashboard/models.py`.

### `TokenUsageMixin`

Shared mixin for token usage fields. Inherits from `BaseModel`.

**Fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `cost` | `float` | `0` | Monetary cost of the call |
| `tokens_input` | `int` | `0` | Input token count |
| `tokens_output` | `int` | `0` | Output token count |
| `tokens_reasoning` | `int` | `0` | Reasoning token count |
| `tokens_cache_read` | `int` | `0` | Cache read tokens |
| `tokens_cache_write` | `int` | `0` | Cache write tokens |

---

### `SessionSummary`

Represents a session row from the database. Inherits from `TokenUsageMixin`.

**Fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `str` | — | Session ID (primary key) |
| `parent_id` | `Optional[str]` | `None` | Parent session ID (`None` for root sessions) |
| `project_id` | `str` | — | Project ID the session belongs to |
| `agent` | `str` | — | Agent name (e.g., "orchestrator") |
| `model` | `Optional[str]` | `None` | Model name (e.g., "gpt-4") |
| `title` | `str` | — | Human-readable session title |
| `time_created` | `int` | — | Unix timestamp in milliseconds |
| `time_updated` | `int` | — | Unix timestamp in milliseconds |
| *(inherited)* | `cost`, `tokens_input`, `tokens_output`, `tokens_reasoning`, `tokens_cache_read`, `tokens_cache_write` | | |

**Class Methods:**

```python
@classmethod
def from_row(cls, row: dict) -> SessionSummary:
```

Constructs a `SessionSummary` from a database row dict. Drops unknown keys with a warning log.

---

### `DelegationNode`

Represents a single node in the delegation tree. Inherits from `TokenUsageMixin`.

**Fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `str` | — | Session ID |
| `parent_id` | `Optional[str]` | `None` | Parent session ID |
| `agent` | `str` | — | Agent name |
| `model` | `Optional[str]` | `None` | Model name |
| `title` | `str` | — | Session title |
| `time_created` | `int` | — | Unix timestamp in milliseconds |
| `depth` | `int` | `0` | Tree depth (from recursive CTE) |
| `children` | `list[DelegationNode]` | `[]` | Child nodes (populated by `build_tree()`) |
| *(inherited)* | `cost`, `tokens_input`, `tokens_output`, `tokens_reasoning`, `tokens_cache_read`, `tokens_cache_write` | | |

**Class Methods:**

```python
@classmethod
def from_row(cls, row: dict) -> DelegationNode:
```

Constructs a `DelegationNode` from a database row dict.

---

### `model_from_row()`

Generic factory function for constructing models from DB row dicts.

**Signature:**

```python
def model_from_row(model_cls: type[BaseModel], row: dict) -> BaseModel:
```

**Behavior:**
1. Computes `dropped = set(row.keys()) - set(model_cls.model_fields.keys())`
2. If fields were dropped, logs a warning
3. Constructs `model_cls` with only recognized fields

---

### `build_tree()`

Converts a flat list of `DelegationNode` objects into a hierarchy tree.

**Signature:**

```python
def build_tree(nodes: list[DelegationNode]) -> list[DelegationNode]:
```

**Algorithm:**
1. Build a `node_map` dict: `{node.id: node}`
2. For each node, if `parent_id` exists in `node_map`, append to parent's `children` list
3. Otherwise, add to `roots` list
4. Sort each node's children by `time_created`

**Complexity:** O(n) time, O(n) space.

**Returns:** `list[DelegationNode]` — root-level nodes with nested children.

---

## Template Filters

All filters are registered in `src/opendashboard/filters.py` via `register_template_filters(templates)`.

### `timestamp_to_str`

Converts a millisecond Unix timestamp to a formatted date string.

**Signature:**

```python
def timestamp_to_str(ts: int) -> str:
```

**Format:** `"%Y-%m-%d %H:%M"` (e.g., `"2026-07-04 14:32"`)

**Usage in template:** `{{ node.time_created | timestamp_to_str }}`

---

### `time_ago`

Converts a millisecond Unix timestamp to a relative time string.

**Signature:**

```python
def time_ago(ts: int) -> str:
```

**Returns:**

| Time Delta | Output |
|------------|--------|
| < 60 seconds | `"just now"` |
| < 60 minutes | `"5m ago"` |
| < 24 hours | `"3h ago"` |
| < 30 days | `"7d ago"` |
| < 12 months | `"2mo ago"` |
| >= 12 months | `"1y ago"` |

**Usage in template:** `{{ session.time_created | time_ago }}`

---

### `date_group_label`

Converts a millisecond timestamp to a human-readable date group label.

**Signature:**

```python
def date_group_label(ts: int) -> str:
```

**Returns:**

| Condition | Output |
|-----------|--------|
| Same day as today | `"Today"` |
| Yesterday | `"Yesterday"` |
| This week (Mon-Sun) | `"This Week"` |
| Last week | `"Last Week"` |
| Older | `"Older"` |

**Usage in template:** `{{ session.time_created | date_group_label }}`

---

### `month_label`

Converts a `"YYYY-MM"` string to a human-readable month format.

**Signature:**

```python
def month_label(ym: str) -> str:
```

**Example:** `"2026-06"` → `"Jun 2026"`

**Usage in template:** `{{ "2026-06" | month_label }}`

---

### `register_template_filters()`

Registers all filters with a Jinja2 template environment.

**Signature:**

```python
def register_template_filters(templates: Jinja2Templates) -> None:
```

**Called from:** `main.py` → `lifespan()` → `register_template_filters(templates)`

---

## Config Constants

All constants are in `src/opendashboard/config.py`.

### Paths

| Constant | Type | Value | Description |
|----------|------|-------|-------------|
| `_HERE` | `Path` | `Path(__file__).resolve().parent` | Directory of `config.py` |
| `STATIC_DIR` | `str` | `str(_HERE / "static")` | Static files mount path |
| `TEMPLATES_DIR` | `str` | `str(_HERE / "templates")` | Jinja2 templates directory |
| `DB_PATH` | `Path` | `Path.home() / ".local" / "share" / "opencode" / "opencode.db"` | OpenCode SQLite database |

### Server

| Constant | Type | Value | Description |
|----------|------|-------|-------------|
| `APP_TITLE` | `str` | `"OpenDashboard"` | FastAPI `title` parameter |
| `APP_HOST` | `str` | `"127.0.0.1"` | Uvicorn bind address |
| `APP_PORT` | `int` | `8420` | Uvicorn bind port |

### Version

| Constant | Type | Value | Description |
|----------|------|-------|-------------|
| `__version__` | `str` | `"0.1.0"` | Package version |

---

## Helper Functions

### `compute_trace_summary()` (in `routes.py`)

Computes aggregate summary statistics from a list of delegation nodes.

**Signature:**

```python
def compute_trace_summary(nodes: list[DelegationNode]) -> dict:
```

**Returns:**

| Key | Type | Description |
|-----|------|-------------|
| `total_tasks` | `int` | Node count |
| `total_cost` | `float` | Sum of all costs |
| `total_tokens` | `int` | Sum of all token usage |
| `completed_count` | `int` | `total_tasks - running_count - failed_count` |
| `running_count` | `int` | Always `0` (cannot determine from stored data) |
| `failed_count` | `int` | Always `0` |
| `duration_minutes` | `int` | `(latest_time - earliest_time) // 60000` |

**Notes:** Running and failed counts default to `0`. True state detection requires a `status` column in the source database.

---

### `main()` (in `main.py`)

Entry point for the application. Starts the uvicorn server.

**Signature:**

```python
def main() -> None:
```

**Behavior:**
1. Prints startup message with URL and DB path
2. Runs `uvicorn.run(app, host=APP_HOST, port=APP_PORT, log_level="info")`

**Called from:** `__main__.py` or via `uv run opendashboard` (`pyproject.toml` script entry).

---

### `lifespan()` (in `main.py`)

FastAPI lifespan context manager. Registers template filters at startup.

**Signature:**

```python
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
```

**Behavior:**
1. Startup: calls `register_template_filters(templates)`
2. Shutdown: yields (no cleanup needed — read-only connection)
