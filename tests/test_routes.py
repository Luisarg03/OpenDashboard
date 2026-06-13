"""Tests for HTTP routes."""
from opendashboard import db


class TestIndex:
    def test_returns_200(self, client):
        response = client.get("/")
        assert response.status_code == 200

    def test_html_response(self, client):
        response = client.get("/")
        assert response.headers["content-type"].startswith("text/html")

    def test_hides_projects(self, client):
        """Projects block removed from sidebar per UX fix."""
        response = client.get("/")
        assert "Test Project" not in response.text
        assert "Another Project" not in response.text

    def test_shows_sessions(self, client):
        response = client.get("/")
        assert "Root session" in response.text
        assert "Other project root" in response.text


class TestProjectSessions:
    def test_returns_200(self, client):
        response = client.get("/project/proj_001")
        assert response.status_code == 200

    def test_shows_session_titles(self, client):
        response = client.get("/project/proj_001")
        assert "Root session" in response.text
        assert "Child session" in response.text
        assert "Grandchild session" in response.text

    def test_excludes_other_project(self, client):
        response = client.get("/project/proj_001")
        assert "Other project root" not in response.text

    def test_missing_project(self, client):
        response = client.get("/project/nonexistent")
        assert response.status_code == 200


class TestSessionDetail:
    def test_returns_200(self, client):
        response = client.get("/session/ses_001")
        assert response.status_code == 200

    def test_shows_session_info(self, client):
        response = client.get("/session/ses_001")
        assert "Root session" in response.text
        assert "ses_001" in response.text

    def test_shows_delegation_tree(self, client):
        response = client.get("/session/ses_001")
        assert "Child session" in response.text
        assert "Grandchild session" in response.text

    def test_not_found_returns_404(self, client):
        response = client.get("/session/nonexistent")
        assert response.status_code == 404


class TestSessionTreePartial:
    def test_returns_200(self, client):
        response = client.get("/session/ses_001/tree")
        assert response.status_code == 200

    def test_shows_tree_nodes(self, client):
        response = client.get("/session/ses_001/tree")
        assert "Child session" in response.text
        assert "Grandchild session" in response.text

    def test_empty_for_nonexistent(self, client):
        response = client.get("/session/nonexistent/tree")
        assert response.status_code == 200


class TestProjectSessionsSearch:
    def test_search_within_project(self, client):
        response = client.get("/project/proj_001?search=Child")
        assert response.status_code == 200
        assert "Child session" in response.text
        assert "Root session" not in response.text

    def test_agent_within_project(self, client):
        response = client.get("/project/proj_001?agent=fixer")
        assert response.status_code == 200
        assert "Grandchild session" in response.text
        # Other agents in same project should not appear
        assert "Root session" not in response.text

    def test_no_match_in_project(self, client):
        response = client.get("/project/proj_001?search=nonexistent")
        assert response.status_code == 200
        assert "No sessions found" in response.text


class TestSessionMapPartial:
    def test_returns_200(self, client):
        response = client.get("/session/ses_001/map")
        assert response.status_code == 200

    def test_shows_session_info(self, client):
        response = client.get("/session/ses_001/map")
        assert "Root session" in response.text

    def test_shows_tree(self, client):
        response = client.get("/session/ses_001/map")
        assert "Child session" in response.text
        assert "Grandchild session" in response.text

    def test_not_found(self, client):
        response = client.get("/session/nonexistent/map")
        assert response.status_code == 404

    def test_root_session_in_sidebar(self, client):
        """Index sidebar shows root sessions."""
        response = client.get("/")
        assert "Root session" in response.text
        assert "Other project root" in response.text


class TestIndexDashboardStats:
    def test_shows_stats_cards(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert "Sessions" in response.text
        assert "Total Cost" in response.text
        assert "Tokens" in response.text
        assert "Agents" in response.text
        assert "4" in response.text  # total_sessions
        assert "640" in response.text  # total_tokens
