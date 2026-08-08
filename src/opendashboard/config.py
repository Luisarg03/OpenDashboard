"""Application configuration constants."""
import argparse
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
APP_PORT = int(os.environ.get("OPENDASHBOARD_PORT", 8420))


def _parse_args() -> None:
    """Parse CLI arguments and update module-level port."""
    global APP_PORT
    parser = argparse.ArgumentParser(description="OpenDashboard server")
    parser.add_argument("--port", type=int, default=APP_PORT, help="Port to listen on")
    args, _ = parser.parse_known_args()
    APP_PORT = args.port


_parse_args()
