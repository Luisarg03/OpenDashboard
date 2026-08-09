# How-to Guide: Add a New Route

**Audience:** Developers extending OpenDashboard with new pages, partials, or data views.

**What you'll learn:** How to add a new route handler, template, and optional DB query to the OpenDashboard application.

---

## When to Add a New Route

Consider adding a route when you need:

| Need | Route Type | Example |
|------|------------|---------|
| A new full page | Full-page route | `/analytics` — a new analytics dashboard page |
| A new HTMX partial for swapping | Partial route | `/session/{id}/cost-breakdown` — a partial panel swapped into the main area |
| A new data filter or view | Route with query params | `/sessions?status=failed` — filtered session list |
| A legacy endpoint that was removed | Compatibility route | `/session/{id}/tree` (the existing legacy `tree` route) |

**When NOT to add a route:**
- If the data can be added to an existing route's context dict
- If a template partial can be extended instead
- If a new query parameter on an existing route suffices

---

## Step-by-Step

### Step 1: Plan Your Route

Decide:

| Aspect | Decision |
|--------|----------|
| **HTTP method** | Always `GET` for OpenDashboard (read-only) |
| **Path** | E.g., `/session/{session_id}/analytics` |
| **Full page or partial?** | Full uses `base.html` → `session_detail.html`. Partial uses `_session_detail_body.html` or a new `*.html` |
| **HTMX?** | If partial, add `hx-get` + `hx-target` in the calling template |
| **New DB query needed?** | Only if existing `db.py` functions don't cover the data |

Check existing routes in `routes.py` to see if your use case overlaps:

| Route | Type | Purpose |
|-------|------|---------|
| `GET /` | Full page + preloaded partial | Dashboard shell |
| `GET /session/{id}/map` | Partial | Trace map for main panel |
| `GET /session/{id}` | Both (HTMX-aware) | Session detail |
| `GET /project/{id}` | Partial | Project-filtered sessions (legacy) |
| `GET /session/{id}/tree` | Partial | Delegation tree only (legacy) |

### Step 2: Add a DB Query (If Needed)

Open `src/opendashboard/db.py` and add your new query function.

**Pattern:**

```python
def get_cost_breakdown(session_id: str) -> list[dict]:
    """Get per-agent cost breakdown for a session."""
    conn = get_db()
    rows = conn.execute(
        """
        SELECT agent, COUNT(*) as calls, SUM(cost) as total_cost,
               SUM(tokens_input + tokens_output) as total_tokens
        FROM session
        WHERE parent_id = ? OR id = ?
        GROUP BY agent
        ORDER BY total_cost DESC
        """,
        (session_id, session_id),
    ).fetchall()
    return [dict(r) for r in rows]
```

**Guidelines:**
- Always use `PRAGMA query_only` (this is set at connection level — you don't need to set it again)
- Always use parameterized queries (`?` placeholders) — never f-strings
- Return simple dicts or Pydantic models
- Add type hints

### Step 3: Add the Route Handler

Open `src/opendashboard/routes.py` and add your handler.

**Pattern — Full page:**

```python
@router.get("/session/{session_id}/analytics", response_class=HTMLResponse)
async def session_analytics(request: Request, session_id: str):
    try:
        session = db.get_session_by_id(session_id)
        if not session:
            return HTMLResponse("Session not found", status_code=404)

        cost_data = db.get_cost_breakdown(session_id)

        return templates.TemplateResponse(
            request,
            "analytics.html",                    # new template
            {
                "request": request,
                "session": session,
                "cost_data": cost_data,
            },
        )
    except Exception as e:
        logger.exception("Analytics route error")
        return templates.TemplateResponse(
            request,
            "error.html",
            {"request": request, "error": f"Internal error: {e}"},
        )
```

**Pattern — HTMX partial:**

```python
@router.get("/session/{session_id}/cost-partial", response_class=HTMLResponse)
async def session_cost_partial(request: Request, session_id: str):
    try:
        cost_data = db.get_cost_breakdown(session_id)
        return templates.TemplateResponse(
            request,
            "_cost_breakdown.html",              # partial template (no <html> wrapper)
            {
                "request": request,
                "cost_data": cost_data,
            },
        )
    except Exception as e:
        logger.exception("Cost partial error")
        return templates.TemplateResponse(
            request,
            "error.html",
            {"request": request, "error": f"Internal error: {e}"},
        )
```

**Guidelines:**
- Use `response_class=HTMLResponse`
- Use try/except with `logger.exception()` for error logging
- For partials, render a template fragment without `<html>` or `<body>` wrapper
- For full pages, extend `base.html`
- Return `404` with `HTMLResponse("Not found", status_code=404)` for missing sessions

### Step 4: Create or Reuse a Jinja2 Template

**Option A: New full-page template**

Create `src/opendashboard/templates/analytics.html`:

```jinja
{% extends "base.html" %}
{% block content %}
<div class="session-detail-panel">
    <h2>Analytics: {{ session.title }}</h2>
    <div class="cost-breakdown">
        {% for item in cost_data %}
        <div class="cost-row">
            <span class="agent-badge agent-{{ item.agent }}">{{ item.agent }}</span>
            <span>{{ item.calls }} calls</span>
            <span>${{ "%.4f"|format(item.total_cost) }}</span>
            <span>{{ item.total_tokens }} tokens</span>
        </div>
        {% endfor %}
    </div>
</div>
{% endblock %}
```

**Option B: New partial template**

Create `src/opendashboard/templates/_cost_breakdown.html` (no `{% extends %}` — just a fragment):

```jinja
<div class="cost-breakdown">
    <h3>Cost Breakdown</h3>
    {% if cost_data %}
    <table class="cost-table">
        <tr><th>Agent</th><th>Calls</th><th>Cost</th><th>Tokens</th></tr>
        {% for item in cost_data %}
        <tr>
            <td><span class="agent-badge agent-{{ item.agent }}">{{ item.agent }}</span></td>
            <td>{{ item.calls }}</td>
            <td>${{ "%.4f"|format(item.total_cost) }}</td>
            <td>{{ item.total_tokens }}</td>
        </tr>
        {% endfor %}
    </table>
    {% else %}
    <p>No data available.</p>
    {% endif %}
</div>
```

**Guidelines:**
- Partial templates (for HTMX swap) conventionally start with `_` (e.g., `_cost_breakdown.html`)
- Use existing filters: `timestamp_to_str`, `time_ago`, `date_group_label`, `month_label`
- Reuse existing CSS classes for consistency: `agent-badge`, `trace-node`, `session-detail-panel`

### Step 5: Wire Up HTMX (If Partial)

To make the partial interactive, add an `hx-get` trigger in the calling template. For example, in `_session_detail_body.html`:

```jinja
<button hx-get="/session/{{ session.id }}/cost-partial"
        hx-target="#cost-panel"
        hx-trigger="click"
        class="btn-cost">
    Show Cost Breakdown
</button>
<div id="cost-panel"></div>
```

The route is already registered — `APIRouter` in `routes.py` handles registration automatically. No need to modify `main.py`.

### Step 6: Write a Test

Open `tests/` and add your test.

**Pattern — testing the route:**

```python
# tests/test_routes.py (add to existing file)

def test_session_analytics(client, sample_db):
    response = client.get("/session/test-root-1/analytics")
    assert response.status_code == 200
    assert "Analytics" in response.text

def test_session_analytics_not_found(client, sample_db):
    response = client.get("/session/nonexistent/analytics")
    assert response.status_code == 404
```

**Pattern — testing the DB function:**

```python
# tests/test_db.py (add to existing file)

def test_get_cost_breakdown(sample_db):
    from opendashboard.db import get_cost_breakdown
    data = get_cost_breakdown("test-root-1")
    assert len(data) > 0
    assert data[0]["agent"] == "orchestrator"
    assert data[0]["total_cost"] >= 0
```

**Run tests:**

```bash
uv run pytest tests/ -v
```

### Step 7: Verify with the Running App

1. Start the server: `uv run opendashboard`
2. Open `http://127.0.0.1:8420`
3. Navigate to trigger your new route
4. Check the browser console for any errors
5. For partials, verify that HTMX swaps the content correctly

---

## Checklist

Before submitting, verify:

- [ ] Route handler has try/except with error logging
- [ ] Template exists and extends the correct base template (or is a standalone partial)
- [ ] DB query uses parameterized `?` placeholders
- [ ] No f-strings or string concatenation in SQL
- [ ] Partial templates render without `<html>`/`<body>` wrapper
- [ ] HTMX `hx-target` targets an existing element ID
- [ ] Tests pass for the new route and DB function
- [ ] All existing routes still work (regression check)
- [ ] CSS doesn't break (check anti-jitter chain: `min-width: 0`)

---

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Missing `response_class=HTMLResponse` | Returns JSON instead of HTML | Add `response_class=HTMLResponse` to decorator |
| Partial includes `<html>` tag | Broken page layout | Remove `{% extends "base.html" %}` — render only the fragment |
| HTMX swap targets wrong ID | Content appears in wrong place | Check `hx-target` matches an existing `id` in the page |
| SQL injection via f-strings | Security risk | Always use `?` placeholders with parameter tuples |
| New DB function not exported | ImportError | Export the function from `__init__.py` if needed |
| Route conflicts with existing path | 404 or wrong handler | Check all existing `@router.get()` decorators first |
