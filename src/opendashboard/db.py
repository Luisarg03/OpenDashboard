import sqlite3
import threading
from typing import Optional
from .models import SessionSummary, DelegationNode
from .config import DB_PATH

_connection: sqlite3.Connection | None = None
_connection_lock = threading.Lock()


def get_db() -> sqlite3.Connection:
    """Get (cached) read-only connection to opencode database."""
    global _connection
    if _connection is not None:
        return _connection

    with _connection_lock:
        # Double-check after acquiring lock
        if _connection is not None:
            return _connection
        if not DB_PATH.exists():
            raise FileNotFoundError(
                f"OpenCode database not found at {DB_PATH}. "
                "Make sure OpenCode has been run at least once."
            )
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA query_only = 1")
        _connection = conn
        return _connection


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
    return [SessionSummary.from_row(dict(r)) for r in rows]


def get_dashboard_stats() -> dict:
    """Get aggregate dashboard statistics across all projects."""
    conn = get_db()
    row = conn.execute("""
        SELECT
            COUNT(*) as total_sessions,
            COALESCE(SUM(CASE WHEN parent_id IS NULL THEN 1 ELSE 0 END), 0)
                as total_root_sessions,
            COALESCE(SUM(cost), 0) as total_cost,
            COALESCE(SUM(tokens_input + tokens_output), 0) as total_tokens,
            COUNT(DISTINCT agent) as unique_agents
        FROM session
    """).fetchone()
    return dict(row)


def list_agents() -> list[str]:
    """Get distinct agent names from sessions."""
    conn = get_db()
    rows = conn.execute(
        "SELECT DISTINCT agent FROM session ORDER BY agent"
    ).fetchall()
    return [r["agent"] for r in rows]


def list_session_months(project_id: Optional[str] = None) -> list[dict]:
    """Get distinct year-month combos with session counts, ordered desc."""
    conn = get_db()
    query = """
        SELECT 
            strftime('%Y-%m', time_created / 1000, 'unixepoch') AS ym,
            COUNT(*) as count
        FROM session
        WHERE 1=1
    """
    params: list = []
    if project_id:
        query += " AND project_id = ?"
        params.append(project_id)
    query += " GROUP BY ym ORDER BY ym DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


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
    return [DelegationNode.from_row(dict(r)) for r in rows]


def list_root_sessions(
    limit: int = 100,
    search: Optional[str] = None,
    agent: Optional[str] = None,
) -> list[SessionSummary]:
    """List root sessions (parent_id IS NULL), optionally filtered.

    Includes per-root child stats (child_count, chain_cost, chain_tokens).
    ponytail: counts direct children only, not recursive descendants; a root
    with grandchildren underreports chain totals. Upgrade to a recursive CTE
    if multi-level delegation matters.
    """
    conn = get_db()
    query = """
        WITH child_stats AS (
            SELECT parent_id,
                   COUNT(*) as child_count,
                   COALESCE(SUM(cost), 0) as chain_cost,
                   COALESCE(SUM(tokens_input + tokens_output), 0) as chain_tokens
            FROM session
            WHERE parent_id IS NOT NULL
            GROUP BY parent_id
        )
        SELECT s.id, s.parent_id, s.project_id, s.agent, s.model, s.title,
               s.time_created, s.time_updated, s.cost, s.tokens_input, s.tokens_output,
               s.tokens_reasoning, s.tokens_cache_read, s.tokens_cache_write,
               s.summary_additions, s.summary_deletions, s.summary_files, s.summary_diffs,
               s.time_archived, s.time_compacting,
               COALESCE(cs.child_count, 0) as child_count,
               COALESCE(cs.chain_cost, 0) as chain_cost,
               COALESCE(cs.chain_tokens, 0) as chain_tokens
        FROM session s
        LEFT JOIN child_stats cs ON cs.parent_id = s.id
        WHERE s.parent_id IS NULL
    """
    params: list = []

    if search:
        query += " AND title LIKE ?"
        params.append(f"%{search}%")
    if agent:
        query += " AND agent = ?"
        params.append(agent)

    query += " ORDER BY s.time_created DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
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
    if row is None:
        return None
    return SessionSummary.from_row(dict(row))
