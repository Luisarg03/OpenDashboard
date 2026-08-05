import asyncio
import json
import logging
import os
import time
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from . import db
from .config import STATIC_DIR
from .models import build_tree, to_dict

logger = logging.getLogger(__name__)

router = APIRouter()

# SSE stream timing (seconds). Module-level so tests can patch them.
SESSION_UPDATE_INTERVAL_S = 5
HEARTBEAT_INTERVAL_S = 15
IDLE_TIMEOUT_S = 300


def compute_trace_summary(nodes):
    """Compute aggregate summary from delegation chain nodes."""
    if not nodes:
        return {
            "total_tasks": 0,
            "total_cost": 0.0,
            "total_tokens": 0,
            "completed_count": 0,
            "running_count": 0,
            "failed_count": 0,
            "duration_minutes": 0,
        }

    total_tasks = len(nodes)
    total_cost = sum(n.cost for n in nodes)
    total_tokens = sum(n.tokens_input + n.tokens_output for n in nodes)

    earliest_time = min(n.time_created for n in nodes)
    latest_time = max(n.time_created for n in nodes)

    # Cannot reliably determine running state from stored data alone;
    # a completed leaf may have the latest timestamp.  Default to 0.
    running_count = 0
    failed_count = 0
    completed_count = total_tasks - running_count - failed_count

    duration_minutes = max(0, (latest_time - earliest_time) // 60000)

    return {
        "total_tasks": total_tasks,
        "total_cost": total_cost,
        "total_tokens": total_tokens,
        "completed_count": completed_count,
        "running_count": running_count,
        "failed_count": failed_count,
        "duration_minutes": duration_minutes,
    }


# ---------------------------------------------------------------------------
# JSON API layer (/api/*) — feeds the Vite + React SPA. The legacy Jinja HTML
# routes were removed with the legacy frontend (change
# modernize-frontend-vite-react-flow); `/` and any other non-/api GET path are
# served by the SPA catch-all at the bottom of this file.
# ---------------------------------------------------------------------------


@router.get("/api/sessions")
async def api_list_sessions(
    search: str = "",
    agent: str = "",
    month: str = "",
    limit: int = 50,
):
    """List sessions as JSON, optionally filtered by search/agent/month."""
    try:
        sessions = db.list_sessions(
            limit=limit,
            search=search or None,
            agent=agent or None,
        )
        if month:
            sessions = [
                s for s in sessions
                if datetime.fromtimestamp(s.time_created / 1000).strftime("%Y-%m") == month
            ]
        return {"sessions": [to_dict(s) for s in sessions]}
    except Exception as e:
        logger.exception("GET /api/sessions failed")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/sessions/roots")
async def api_list_root_sessions(
    search: str = "",
    agent: str = "",
    month: str = "",
    limit: int = 50,
):
    """List only parent (root) sessions as JSON.

    Delegated child sessions (parent_id NOT NULL) belong to their parent's
    delegation graph, so the dashboard lists only roots as independent
    sessions; children stay reachable via /api/sessions/{id}/chain.

    Declared before /api/sessions/{session_id} so "roots" is not captured
    as a session id.
    """
    try:
        sessions = db.list_root_sessions(
            limit=limit,
            search=search or None,
            agent=agent or None,
        )
        if month:
            sessions = [
                s for s in sessions
                if datetime.fromtimestamp(s.time_created / 1000).strftime("%Y-%m") == month
            ]
        return {"sessions": [to_dict(s) for s in sessions]}
    except Exception as e:
        logger.exception("GET /api/sessions/roots failed")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/sessions/{session_id}")
async def api_session_detail(session_id: str):
    """Return a single session summary, or 404 when unknown."""
    try:
        session = db.get_session_by_id(session_id)
        if session is None:
            return JSONResponse({"error": "Session not found"}, status_code=404)
        return {"session": to_dict(session)}
    except Exception as e:
        logger.exception("GET /api/sessions/{id} failed")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/sessions/{session_id}/chain")
async def api_session_chain(session_id: str):
    """Return the delegation chain as flat nodes plus tree and summary."""
    try:
        session = db.get_session_by_id(session_id)
        if session is None:
            return JSONResponse({"error": "Session not found"}, status_code=404)
        nodes = db.get_delegation_chain(session_id)
        tree = build_tree(nodes)
        return {
            "chain": [to_dict(n) for n in nodes],
            "tree": [to_dict(n) for n in tree],
            "summary": compute_trace_summary(nodes),
        }
    except Exception as e:
        logger.exception("GET /api/sessions/{id}/chain failed")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/agents")
async def api_list_agents():
    """Return the distinct agent names."""
    try:
        return {"agents": db.list_agents()}
    except Exception as e:
        logger.exception("GET /api/agents failed")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/stats")
async def api_stats():
    """Return aggregate dashboard statistics."""
    try:
        return {"stats": db.get_dashboard_stats()}
    except Exception as e:
        logger.exception("GET /api/stats failed")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/months")
async def api_list_months():
    """Return the distinct year-month buckets of sessions."""
    try:
        return {"months": db.list_session_months()}
    except Exception as e:
        logger.exception("GET /api/months failed")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/sessions/{session_id}/events")
async def api_session_events(
    session_id: str,
    since: Optional[int] = None,
) -> StreamingResponse:
    """SSE stream: emit node:new events as new delegation nodes appear.

    Polls the read-only SQLite connection every 2 seconds and diffs against
    the last emitted timestamp. Also emits periodic session:updated totals,
    heartbeat comments, and closes the stream after an idle window.

    The client may pass `?since=<ms>` = the max `time_created` it already
    loaded (via the chain query). Starting the diff from that value prevents
    the first poll from re-emitting every historical node as node:new, which
    the frontend would otherwise mark as live/running (SSE running bug).
    Clients that omit `?since` keep the legacy behavior (all nodes emitted).
    """
    if db.get_session_by_id(session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        # Diff baseline: client-provided max time_created, or 0 (emit all).
        last_seen_time = since if since is not None else 0
        last_heartbeat = time.monotonic()
        last_session_update = time.monotonic()
        last_change_time = time.monotonic()
        try:
            while True:
                now = time.monotonic()
                nodes = db.get_delegation_chain(session_id)
                new_nodes = [n for n in nodes if n.time_created > last_seen_time]
                for node in new_nodes:
                    payload = json.dumps({"type": "node:new", "node": to_dict(node)})
                    # bytes: uvicorn/h11 requires binary bodies for ASGI.
                    yield f"data: {payload}\n\n".encode("utf-8")
                    last_seen_time = max(last_seen_time, node.time_created)
                    last_change_time = now
                if now - last_session_update >= SESSION_UPDATE_INTERVAL_S:
                    totals = {
                        "cost": sum(n.cost for n in nodes),
                        "tokens_input": sum(n.tokens_input for n in nodes),
                        "tokens_output": sum(n.tokens_output for n in nodes),
                    }
                    payload = json.dumps({
                        "type": "session:updated",
                        "session_id": session_id,
                        "totals": totals,
                    })
                    yield f"data: {payload}\n\n".encode("utf-8")
                    last_session_update = now
                if now - last_heartbeat >= HEARTBEAT_INTERVAL_S:
                    yield b": ping\n\n"
                    last_heartbeat = now
                if now - last_change_time > IDLE_TIMEOUT_S:
                    yield b"event: close\ndata: {}\n\n"
                    break
                await asyncio.sleep(2)  # poll every 2s
        except asyncio.CancelledError:
            # Client disconnected; stop the generator cleanly.
            logger.info("SSE client disconnected for session %s", session_id)
            raise
        except Exception as e:
            # Surface stream errors as an event instead of crashing the stream.
            logger.exception("SSE error for session %s", session_id)
            payload = json.dumps({"type": "error", "message": str(e)})
            yield f"data: {payload}\n\n".encode("utf-8")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/{full_path:path}", response_class=FileResponse, include_in_schema=False)
async def spa_catchall(full_path: str):
    """Serve the Vite SPA build output for any non-/api GET path.

    Declared last so the specific /api/* routes match first.
    """
    static_index = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(static_index):
        return static_index
    # Dev fallback: serve a placeholder when SPA hasn't been built yet.
    raise HTTPException(status_code=404, detail="SPA not built. Run `npm run build` in frontend/.")
