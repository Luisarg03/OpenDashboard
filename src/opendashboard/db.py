import sqlite3
from pathlib import Path
from typing import Optional
from .models import SessionSummary, DelegationNode
from .config import DB_PATH


def get_db() -> sqlite3.Connection:
    """Get read-only connection to opencode database."""
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"OpenCode database not found at {DB_PATH}. "
            "Make sure OpenCode has been run at least once."
        )
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA query_only = 1")
    return conn


def list_projects() -> list[dict]:
    """List all projects with session counts."""
    conn = get_db()
    rows = conn.execute("""
        SELECT p.id, p.name, p.worktree, COUNT(s.id) as session_count,
               MAX(s.time_created) as last_session
        FROM project p
        LEFT JOIN session s ON s.project_id = p.id
        GROUP BY p.id
        ORDER BY last_session DESC
    """).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        if not d.get("name"):
            d["name"] = Path(d["worktree"]).name if d.get("worktree") else d["id"]
        result.append(d)
    return result


def list_sessions(
    project_id: Optional[str] = None,
    limit: int = 50,
    search: Optional[str] = None,
    agent: Optional[str] = None,
) -> list[SessionSummary]:
    """List sessions, optionally filtered by project, search, or agent."""
    conn = get_db()
    query = """
        SELECT id, parent_id, project_id, agent, model, title,
               time_created, time_updated, cost, tokens_input, tokens_output,
               tokens_reasoning, tokens_cache_read, tokens_cache_write
        FROM session
        WHERE 1=1
    """
    params: list = []

    if project_id:
        query += " AND project_id = ?"
        params.append(project_id)
    if search:
        query += " AND title LIKE ?"
        params.append(f"%{search}%")
    if agent:
        query += " AND agent = ?"
        params.append(agent)

    query += " ORDER BY time_created DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [SessionSummary.from_row(dict(r)) for r in rows]


def get_dashboard_stats() -> dict:
    """Get aggregate dashboard statistics across all projects."""
    conn = get_db()
    row = conn.execute("""
        SELECT
            COUNT(*) as total_sessions,
            COALESCE(SUM(cost), 0) as total_cost,
            COALESCE(SUM(tokens_input + tokens_output), 0) as total_tokens,
            COUNT(DISTINCT agent) as unique_agents
        FROM session
    """).fetchone()
    conn.close()
    return dict(row)


def list_agents() -> list[str]:
    """Get distinct agent names from sessions."""
    conn = get_db()
    rows = conn.execute(
        "SELECT DISTINCT agent FROM session ORDER BY agent"
    ).fetchall()
    conn.close()
    return [r["agent"] for r in rows]


def get_delegation_chain(session_id: str) -> list[DelegationNode]:
    """Recursive CTE to get full delegation chain for a session."""
    conn = get_db()
    rows = conn.execute(
        """
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
        """,
        (session_id,),
    ).fetchall()
    conn.close()
    return [DelegationNode.from_row(dict(r)) for r in rows]


def list_root_sessions(
    limit: int = 100,
    search: Optional[str] = None,
    agent: Optional[str] = None,
) -> list[SessionSummary]:
    """List root sessions (parent_id IS NULL), optionally filtered."""
    conn = get_db()
    query = """
        SELECT id, parent_id, project_id, agent, model, title,
               time_created, time_updated, cost, tokens_input, tokens_output,
               tokens_reasoning, tokens_cache_read, tokens_cache_write
        FROM session
        WHERE parent_id IS NULL
    """
    params: list = []

    if search:
        query += " AND title LIKE ?"
        params.append(f"%{search}%")
    if agent:
        query += " AND agent = ?"
        params.append(agent)

    query += " ORDER BY time_created DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [SessionSummary.from_row(dict(r)) for r in rows]


def get_session_by_id(session_id: str) -> Optional[SessionSummary]:
    """Get a single session by ID."""
    conn = get_db()
    row = conn.execute(
        """
        SELECT id, parent_id, project_id, agent, model, title,
               time_created, time_updated, cost, tokens_input, tokens_output,
               tokens_reasoning, tokens_cache_read, tokens_cache_write
        FROM session
        WHERE id = ?
        """,
        (session_id,),
    ).fetchone()
    conn.close()
    if row is None:
        return None
    return SessionSummary.from_row(dict(row))
