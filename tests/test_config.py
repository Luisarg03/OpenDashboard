"""Tests for config module."""
from opendashboard.config import __version__, APP_TITLE, APP_HOST, APP_PORT


class TestConfig:
    def test_version(self):
        assert __version__ == "0.1.0"

    def test_app_title(self):
        assert APP_TITLE == "OpenDashboard"

    def test_host(self):
        assert APP_HOST == "127.0.0.1"

    def test_port(self):
        assert APP_PORT == 8080
