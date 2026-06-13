"""Application configuration constants."""
import os
from pathlib import Path

__version__ = "0.1.0"

# Paths relative to this file
_HERE = Path(__file__).resolve().parent
STATIC_DIR = str(_HERE / "static")
TEMPLATES_DIR = str(_HERE / "templates")
DB_PATH = Path.home() / ".local" / "share" / "opencode" / "opencode.db"

# Server
APP_TITLE = "OpenDashboard"
APP_HOST = "127.0.0.1"
APP_PORT = 8080
