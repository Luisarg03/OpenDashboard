"""Tests for the JSON API layer and SSE endpoint (change Group 2).

Fixtures `test_db` and `client` come from tests/conftest.py (temporary SQLite
database with known sessions + FastAPI TestClient).
"""
import asyncio
import json
from typing import AsyncGenerator, cast

import pytest

from opendashboard import db, routes
from opendashboard.routes import api_session_events


class TestListSessions:
    def test_list_sessions_returns_json_with_sessions_key(self, client):
        response = client.get("/api/sessions")
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert len(data["sessions"]) == 4

    def test_search_filter(self, client):
        response = client.get("/api/sessions", params={"search": "Grandchild"})
        sessions = response.json()["sessions"]
        assert [s["id"] for s in sessions] == ["ses_003"]

    def test_agent_filter(self, client):
        response = client.get("/api/sessions", params={"agent": "fixer"})
        sessions = response.json()["sessions"]
        assert [s["id"] for s in sessions] == ["ses_003"]

    def test_month_filter(self, client):
        response = client.get("/api/sessions", params={"month": "2023-11"})
        assert len(response.json()["sessions"]) == 4

    def test_limit_param(self, client):
        response = client.get("/api/sessions", params={"limit": 2})
        assert len(response.json()["sessions"]) == 2


class TestRootSessions:
    def test_list_root_sessions_returns_only_parents(self, client):
        """Child sessions (parent_id set) must be excluded."""
        response = client.get("/api/sessions/roots")
        assert response.status_code == 200
        sessions = response.json()["sessions"]
        assert [s["id"] for s in sessions] == ["ses_004", "ses_001"]
        assert all(s["parent_id"] is None for s in sessions)

    def test_search_filter(self, client):
        response = client.get("/api/sessions/roots", params={"search": "Other"})
        sessions = response.json()["sessions"]
        assert [s["id"] for s in sessions] == ["ses_004"]

    def test_agent_filter(self, client):
        response = client.get("/api/sessions/roots", params={"agent": "orchestrator"})
        sessions = response.json()["sessions"]
        assert [s["id"] for s in sessions] == ["ses_004", "ses_001"]

    def test_month_filter(self, client):
        response = client.get("/api/sessions/roots", params={"month": "2023-11"})
        assert len(response.json()["sessions"]) == 2

    def test_limit_param(self, client):
        response = client.get("/api/sessions/roots", params={"limit": 1})
        assert len(response.json()["sessions"]) == 1

    def test_child_stats_in_response(self, client):
        """Roots carry child_count/chain_cost/chain_tokens for direct children."""
        response = client.get("/api/sessions/roots")
        by_id = {s["id"]: s for s in response.json()["sessions"]}

        ses_001 = by_id["ses_001"]  # direct child: ses_002
        assert ses_001["child_count"] == 1
        assert ses_001["chain_cost"] == 0.3
        assert ses_001["chain_tokens"] == 110
        assert ses_001["summary_additions"] == 247
        assert ses_001["summary_deletions"] == 89
        assert ses_001["summary_files"] == 3

        ses_004 = by_id["ses_004"]  # no children
        assert ses_004["child_count"] == 0
        assert ses_004["chain_cost"] == 0
        assert ses_004["chain_tokens"] == 0

    def test_ordered_by_time_created_desc(self, client):
        response = client.get("/api/sessions/roots")
        sessions = response.json()["sessions"]
        times = [s["time_created"] for s in sessions]
        assert times == sorted(times, reverse=True)
        assert sessions[0]["id"] == "ses_004"

    def test_archived_and_compacting_flags(self, client):
        response = client.get("/api/sessions/roots")
        by_id = {s["id"]: s for s in response.json()["sessions"]}
        assert by_id["ses_001"]["is_compacting"] is True
        assert by_id["ses_001"]["is_archived"] is False
        assert by_id["ses_004"]["is_archived"] is True
        assert by_id["ses_004"]["is_compacting"] is False


class TestSessionDetail:
    def test_get_session_detail_returns_404_for_unknown_id(self, client):
        response = client.get("/api/sessions/nonexistent")
        assert response.status_code == 404
        assert "error" in response.json()

    def test_get_session_detail_returns_session_for_known_id(self, client):
        response = client.get("/api/sessions/ses_001")
        assert response.status_code == 200
        session = response.json()["session"]
        assert session["id"] == "ses_001"
        assert session["title"] == "Root session"


class TestSessionChain:
    def test_get_chain_returns_chain_and_tree(self, client):
        response = client.get("/api/sessions/ses_001/chain")
        assert response.status_code == 200
        data = response.json()
        assert set(data) == {"chain", "tree", "summary"}
        assert len(data["chain"]) == 3
        assert data["chain"][0]["id"] == "ses_001"
        assert data["tree"][0]["id"] == "ses_001"
        assert data["tree"][0]["children"][0]["id"] == "ses_002"
        assert data["summary"]["total_tasks"] == 3

    def test_get_chain_returns_404_for_unknown_session(self, client):
        response = client.get("/api/sessions/nonexistent/chain")
        assert response.status_code == 404


class TestAgents:
    def test_get_agents_returns_agents_list(self, client):
        response = client.get("/api/agents")
        assert response.status_code == 200
        assert response.json()["agents"] == ["explorer", "fixer", "orchestrator"]


class TestStats:
    def test_get_stats_returns_stats_dict(self, client):
        response = client.get("/api/stats")
        assert response.status_code == 200
        stats = response.json()["stats"]
        assert stats["total_sessions"] == 4
        assert stats["total_root_sessions"] == 2
        assert stats["total_tokens"] == 640
        assert stats["total_cost"] == 2.0
        assert stats["unique_agents"] == 3


class TestMonths:
    def test_get_months_returns_months_list(self, client):
        response = client.get("/api/months")
        assert response.status_code == 200
        assert response.json()["months"] == [{"ym": "2023-11", "count": 4}]


class TestEvents:
    @pytest.mark.asyncio
    async def test_events_endpoint_returns_event_stream_content_type(self, test_db):
        # Drop the cached connection (possibly opened by the TestClient thread)
        # so this test's event loop opens its own connection to the temp DB.
        db._connection = None
        response = await api_session_events("ses_001")
        generator = cast(AsyncGenerator[bytes, None], response.body_iterator)
        # Calling the endpoint directly avoids an infinite TestClient stream;
        # the generator emits the first event immediately.
        first_chunk = await generator.__anext__()
        await generator.aclose()

        assert response.status_code == 200
        assert response.media_type == "text/event-stream"
        assert response.headers["cache-control"] == "no-cache"
        assert response.headers["x-accel-buffering"] == "no"
        assert first_chunk.startswith(b"data: ")
        event = json.loads(first_chunk[6:].strip())
        assert event["type"] == "node:new"
        assert event["node"]["id"] == "ses_001"

    def test_events_returns_404_for_unknown_session(self, client):
        response = client.get("/api/sessions/nonexistent/events")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_events_emits_node_new_and_session_updated_framing(
        self, test_db, monkeypatch
    ):
        """Each data event must be framed as `data: <json>\\n\\n`."""
        db._connection = None
        # Fake clock: 0 at init + first poll, 20s for the second poll
        # (session:updated + heartbeat fire), 400s for the third (idle close).
        # Falls back to 400 after the scripted values so pytest's own
        # time.monotonic() calls during teardown don't exhaust the iterator.
        clock = iter([0, 0, 0, 0, 20, 400])

        def _fake_monotonic():
            try:
                return next(clock)
            except StopIteration:
                return 400

        monkeypatch.setattr(routes.time, "monotonic", _fake_monotonic)

        async def _no_sleep(*args, **kwargs):
            return None

        monkeypatch.setattr(asyncio, "sleep", _no_sleep)

        response = await api_session_events("ses_001")
        generator = cast(AsyncGenerator[bytes, None], response.body_iterator)
        chunks = [await generator.__anext__() for _ in range(6)]
        await generator.aclose()

        # First three chunks: one node:new per delegation node.
        for i in range(3):
            assert chunks[i].startswith(b"data: ")
            event = json.loads(chunks[i][6:].strip())
            assert event["type"] == "node:new"
            assert event["node"]["id"] == f"ses_00{i + 1}"

        # Next chunk: session:updated with aggregated totals.
        update = json.loads(chunks[3][6:].strip())
        assert update["type"] == "session:updated"
        assert update["session_id"] == "ses_001"
        assert update["totals"] == {
            "cost": 1.0,
            "tokens_input": 240,
            "tokens_output": 100,
        }

    @pytest.mark.asyncio
    async def test_events_emits_heartbeat_and_idle_close(self, test_db, monkeypatch):
        db._connection = None
        clock = iter([0, 0, 0, 0, 20, 400])

        def _fake_monotonic():
            try:
                return next(clock)
            except StopIteration:
                return 400

        monkeypatch.setattr(routes.time, "monotonic", _fake_monotonic)

        async def _no_sleep(*args, **kwargs):
            return None

        monkeypatch.setattr(asyncio, "sleep", _no_sleep)

        response = await api_session_events("ses_001")
        generator = cast(AsyncGenerator[bytes, None], response.body_iterator)
        chunks = []
        while True:
            try:
                chunks.append(await generator.__anext__())
            except StopAsyncIteration:
                break
        await generator.aclose()

        # Heartbeat is a bare SSE comment, no data field.
        assert b": ping\n\n" in chunks
        # Idle timeout terminates the stream with a close event.
        assert b"event: close\ndata: {}\n\n" in chunks

    @pytest.mark.asyncio
    async def test_events_with_future_since_emits_no_node_new(
        self, test_db, monkeypatch
    ):
        """?since=<future> must not re-emit historical nodes as node:new.

        Regression for the SSE running bug: the frontend passes the max
        time_created it already loaded; without it the first poll re-emits
        every node and the graph marks old sessions as running.
        """
        db._connection = None
        clock = iter([0, 0, 0, 0, 20, 400])

        def _fake_monotonic():
            try:
                return next(clock)
            except StopIteration:
                return 400

        monkeypatch.setattr(routes.time, "monotonic", _fake_monotonic)

        async def _no_sleep(*args, **kwargs):
            return None

        monkeypatch.setattr(asyncio, "sleep", _no_sleep)

        response = await api_session_events("ses_001", since=1700000500000)
        generator = cast(AsyncGenerator[bytes, None], response.body_iterator)
        chunks = []
        while True:
            try:
                chunks.append(await generator.__anext__())
            except StopAsyncIteration:
                break
        await generator.aclose()

        data_events = [
            json.loads(chunk[6:].strip())
            for chunk in chunks
            if chunk.startswith(b"data: ")
        ]
        assert all(event["type"] != "node:new" for event in data_events)

    @pytest.mark.asyncio
    async def test_events_with_since_emits_only_newer_nodes(
        self, test_db, monkeypatch
    ):
        """?since=<ts> emits only nodes created after ts."""
        db._connection = None
        clock = iter([0, 0, 0, 0, 20, 400])

        def _fake_monotonic():
            try:
                return next(clock)
            except StopIteration:
                return 400

        monkeypatch.setattr(routes.time, "monotonic", _fake_monotonic)

        async def _no_sleep(*args, **kwargs):
            return None

        monkeypatch.setattr(asyncio, "sleep", _no_sleep)

        # ses_002 was created at 1700000200000; only ses_003 is newer.
        response = await api_session_events("ses_001", since=1700000200000)
        generator = cast(AsyncGenerator[bytes, None], response.body_iterator)
        chunks = []
        while True:
            try:
                chunks.append(await generator.__anext__())
            except StopAsyncIteration:
                break
        await generator.aclose()

        node_new = [
            json.loads(chunk[6:].strip())
            for chunk in chunks
            if chunk.startswith(b"data: ")
        ]
        node_new = [event for event in node_new if event["type"] == "node:new"]
        assert [event["node"]["id"] for event in node_new] == ["ses_003"]


class TestSpaCatchall:
    def test_catchall_serves_spa_index_or_404(self, client):
        """Non-/api GET paths hit the SPA catch-all, not a 404 from Starlette."""
        response = client.get("/some/nonexistent/page")
        assert response.status_code in (200, 404)
        if response.status_code == 404:
            assert response.json()["detail"].startswith("SPA not built")
        else:
            assert response.headers["content-type"].startswith("text/html")

    def test_root_still_serves_html_template(self, client):
        """The `/` HTML route must win over the catch-all."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/html")


class TestHtmlRoutes:
    def test_html_routes_still_work(self, client):
        """Regression: legacy HTML routes must keep working alongside /api/*."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/html")


# ---------------------------------------------------------------------------
# Manual smoke test (requires real OpenCode DB + running session):
# 1. uv run opendashboard  # terminal 1
# 2. cd frontend && npm run dev  # terminal 2
# 3. open http://127.0.0.1:5173  # dashboard
# 4. click a session → /session/:id
# 5. verify graph renders, drag/zoom works
# 6. start a new OpenCode session in another terminal
# 7. verify the graph auto-updates (live tail)
# 8. kill the FastAPI server, wait 5s, restart it
# 9. verify SSE reconnects and the graph continues to update
#
# SSE framing (server only):
#
#     curl -N http://127.0.0.1:8080/api/sessions/<session_id>/events
#
# Should print `data: {"type":"node:new","node":{...}}` for every node in
# the session's chain immediately, then keep polling: any new node written to
# the OpenCode DB for that session appears within ~2 seconds.
# ---------------------------------------------------------------------------
