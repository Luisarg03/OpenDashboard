"""Tests for HTTP routes (SPA catch-all behavior).

The legacy Jinja HTML routes were removed by change
modernize-frontend-vite-react-flow; `/` and every non-/api GET path now serve
the built SPA shell from `src/opendashboard/static/index.html`. The SPA does
its own client-side routing, so unknown session/project ids return the shell
(200) instead of a server-side 404.
"""
class TestRoot:
    def test_returns_200(self, client):
        response = client.get("/")
        assert response.status_code == 200

    def test_html_response(self, client):
        response = client.get("/")
        assert response.headers["content-type"].startswith("text/html")

    def test_serves_spa_shell(self, client):
        response = client.get("/")
        assert '<div id="root">' in response.text

    def test_no_legacy_template_content(self, client):
        """The SPA shell must not contain server-rendered legacy markup."""
        response = client.get("/")
        assert "Test Project" not in response.text
        assert "Total Cost" not in response.text
        assert "No sessions found" not in response.text


class TestSpaCatchall:
    def test_project_path_serves_spa(self, client):
        response = client.get("/project/proj_001")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/html")
        assert '<div id="root">' in response.text

    def test_session_path_serves_spa(self, client):
        response = client.get("/session/ses_001")
        assert response.status_code == 200
        assert '<div id="root">' in response.text

    def test_session_tree_path_serves_spa(self, client):
        response = client.get("/session/ses_001/tree")
        assert response.status_code == 200
        assert '<div id="root">' in response.text

    def test_session_map_path_serves_spa(self, client):
        response = client.get("/session/ses_001/map")
        assert response.status_code == 200
        assert '<div id="root">' in response.text

    def test_unknown_session_serves_spa(self, client):
        """Unknown ids hit the SPA shell; the React app shows the 404 state."""
        response = client.get("/session/nonexistent")
        assert response.status_code == 200
        assert '<div id="root">' in response.text

    def test_query_params_do_not_affect_spa(self, client):
        response = client.get("/project/proj_001?search=Child&agent=fixer")
        assert response.status_code == 200
        assert '<div id="root">' in response.text
