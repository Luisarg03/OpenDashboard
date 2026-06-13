"""Tests for database queries."""
import pytest
from opendashboard import db
from opendashboard.models import SessionSummary, DelegationNode


class TestListProjects:
    def test_returns_projects(self, test_db):
        projects = db.list_projects()
        assert len(projects) == 2
        names = {p["name"] for p in projects}
        assert names == {"Test Project", "Another Project"}

    def test_ordered_by_last_session(self, test_db):
        projects = db.list_projects()
        # proj_002 has last_session = 1700000600000
        # proj_001 has last_session = 1700000400000
        timestamps = [p["last_session"] for p in projects]
        assert timestamps == sorted(timestamps, reverse=True)

    def test_session_count(self, test_db):
        projects = db.list_projects()
        proj1 = next(p for p in projects if p["id"] == "proj_001")
        assert proj1["session_count"] == 3
        proj2 = next(p for p in projects if p["id"] == "proj_002")
        assert proj2["session_count"] == 1

    def test_worktree(self, test_db):
        projects = db.list_projects()
        proj1 = next(p for p in projects if p["id"] == "proj_001")
        assert proj1["worktree"] == "/tmp/test"


class TestListSessions:
    def test_all_sessions(self, test_db):
        sessions = db.list_sessions()
        assert len(sessions) == 4
        assert all(isinstance(s, SessionSummary) for s in sessions)

    def test_filter_by_project(self, test_db):
        sessions = db.list_sessions(project_id="proj_001")
        assert len(sessions) == 3
        assert all(s.project_id == "proj_001" for s in sessions)

    def test_filter_by_other_project(self, test_db):
        sessions = db.list_sessions(project_id="proj_002")
        assert len(sessions) == 1
        assert sessions[0].project_id == "proj_002"

    def test_limit(self, test_db):
        sessions = db.list_sessions(limit=2)
        assert len(sessions) == 2

    def test_ordered_by_time_desc(self, test_db):
        sessions = db.list_sessions()
        timestamps = [s.time_created for s in sessions]
        assert timestamps == sorted(timestamps, reverse=True)

    def test_empty_project(self, test_db):
        sessions = db.list_sessions(project_id="nonexistent")
        assert sessions == []


class TestListRootSessions:
    def test_returns_root_sessions(self, test_db):
        roots = db.list_root_sessions()
        assert len(roots) == 2
        assert all(r.parent_id is None for r in roots)
        assert all(isinstance(r, SessionSummary) for r in roots)

    def test_root_sessions_titles(self, test_db):
        roots = db.list_root_sessions()
        titles = {r.title for r in roots}
        assert titles == {"Root session", "Other project root"}

    def test_filter_by_search(self, test_db):
        roots = db.list_root_sessions(search="Root session")
        assert len(roots) == 1
        assert roots[0].title == "Root session"

    def test_filter_by_agent(self, test_db):
        roots = db.list_root_sessions(agent="orchestrator")
        assert len(roots) == 2

    def test_filter_no_match(self, test_db):
        roots = db.list_root_sessions(search="nonexistent")
        assert roots == []


class TestGetDelegationChain:
    def test_root_session_includes_all_descendants(self, test_db):
        nodes = db.get_delegation_chain("ses_001")
        assert len(nodes) == 3
        assert all(isinstance(n, DelegationNode) for n in nodes)
        ids = {n.id for n in nodes}
        assert ids == {"ses_001", "ses_002", "ses_003"}

    def test_leaf_session(self, test_db):
        nodes = db.get_delegation_chain("ses_003")
        assert len(nodes) == 1
        assert nodes[0].id == "ses_003"

    def test_middle_session(self, test_db):
        nodes = db.get_delegation_chain("ses_002")
        assert len(nodes) == 2
        ids = {n.id for n in nodes}
        assert ids == {"ses_002", "ses_003"}

    def test_no_such_session(self, test_db):
        nodes = db.get_delegation_chain("nonexistent")
        assert nodes == []


class TestGetSessionById:
    def test_existing(self, test_db):
        session = db.get_session_by_id("ses_001")
        assert session is not None
        assert isinstance(session, SessionSummary)
        assert session.id == "ses_001"
        assert session.title == "Root session"
        assert session.project_id == "proj_001"

    def test_nonexistent(self, test_db):
        session = db.get_session_by_id("nonexistent")
        assert session is None

    def test_other_session(self, test_db):
        session = db.get_session_by_id("ses_004")
        assert session is not None
        assert session.project_id == "proj_002"


class TestListSessionsSearch:
    def test_search_by_title(self, test_db):
        sessions = db.list_sessions(search="Grandchild")
        assert len(sessions) == 1
        assert sessions[0].title == "Grandchild session"

    def test_search_case_insensitive(self, test_db):
        sessions = db.list_sessions(search="child")
        assert len(sessions) >= 1
        assert all("child" in s.title.lower() for s in sessions)

    def test_search_no_match(self, test_db):
        sessions = db.list_sessions(search="zzznonexistent")
        assert sessions == []

    def test_search_with_project_filter(self, test_db):
        sessions = db.list_sessions(project_id="proj_001", search="Root")
        assert len(sessions) == 1


class TestListSessionsAgent:
    def test_filter_by_agent(self, test_db):
        sessions = db.list_sessions(agent="explorer")
        assert len(sessions) == 1
        assert sessions[0].agent == "explorer"

    def test_filter_by_orchestrator(self, test_db):
        sessions = db.list_sessions(agent="orchestrator")
        assert len(sessions) == 2

    def test_filter_agent_no_match(self, test_db):
        sessions = db.list_sessions(agent="nonexistent")
        assert sessions == []

    def test_agent_with_project_filter(self, test_db):
        sessions = db.list_sessions(project_id="proj_001", agent="orchestrator")
        assert len(sessions) == 1


class TestListAgents:
    def test_returns_distinct_agents(self, test_db):
        agents = db.list_agents()
        assert set(agents) == {"orchestrator", "explorer", "fixer"}
        # Verify order is alphabetical
        assert agents == sorted(agents)


class TestDashboardStats:
    def test_returns_stats_dict(self, test_db):
        stats = db.get_dashboard_stats()
        assert isinstance(stats, dict)
        assert set(stats.keys()) == {"total_sessions", "total_cost", "total_tokens", "unique_agents"}

    def test_total_sessions(self, test_db):
        stats = db.get_dashboard_stats()
        assert stats["total_sessions"] == 4

    def test_total_cost(self, test_db):
        stats = db.get_dashboard_stats()
        assert stats["total_cost"] == pytest.approx(2.0)

    def test_total_tokens(self, test_db):
        stats = db.get_dashboard_stats()
        # ses_001: 150, ses_002: 110, ses_003: 80, ses_004: 300 = 640
        assert stats["total_tokens"] == 640

    def test_unique_agents(self, test_db):
        stats = db.get_dashboard_stats()
        assert stats["unique_agents"] == 3
