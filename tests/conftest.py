"""Test fixtures: temporary SQLite database with known data + FastAPI TestClient."""
import sqlite3
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from opendashboard.main import app

TEST_PROJECTS = [
    {"id": "proj_001", "name": "Test Project", "worktree": "/tmp/test"},
    {"id": "proj_002", "name": "Another Project", "worktree": "/tmp/another"},
]

TEST_SESSIONS = [
    {
        "id": "ses_001", "parent_id": None, "project_id": "proj_001",
        "agent": "orchestrator", "model": "gpt-4", "title": "Root session",
        "time_created": 1700000000000, "time_updated": 1700000100000,
        "cost": 0.5, "tokens_input": 100, "tokens_output": 50,
        "tokens_reasoning": 0, "tokens_cache_read": 0, "tokens_cache_write": 0,
    },
    {
        "id": "ses_002", "parent_id": "ses_001", "project_id": "proj_001",
        "agent": "explorer", "model": "gpt-4", "title": "Child session",
        "time_created": 1700000200000, "time_updated": 1700000300000,
        "cost": 0.3, "tokens_input": 80, "tokens_output": 30,
        "tokens_reasoning": 10, "tokens_cache_read": 5, "tokens_cache_write": 3,
    },
    {
        "id": "ses_003", "parent_id": "ses_002", "project_id": "proj_001",
        "agent": "fixer", "model": "claude-3", "title": "Grandchild session",
        "time_created": 1700000400000, "time_updated": 1700000500000,
        "cost": 0.2, "tokens_input": 60, "tokens_output": 20,
        "tokens_reasoning": 5, "tokens_cache_read": 10, "tokens_cache_write": 2,
    },
    {
        "id": "ses_004", "parent_id": None, "project_id": "proj_002",
        "agent": "orchestrator", "model": "gpt-4o", "title": "Other project root",
        "time_created": 1700000600000, "time_updated": 1700000700000,
        "cost": 1.0, "tokens_input": 200, "tokens_output": 100,
        "tokens_reasoning": 0, "tokens_cache_read": 0, "tokens_cache_write": 0,
    },
]


@pytest.fixture
def test_db(tmp_path):
    """Create a temporary SQLite database with test data and patch db.DB_PATH."""
    db_path = tmp_path / "test.db"
    conn = sqlite3.connect(str(db_path))

    conn.executescript("""
        CREATE TABLE project (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            worktree TEXT
        );
        CREATE TABLE session (
            id TEXT PRIMARY KEY,
            parent_id TEXT,
            project_id TEXT NOT NULL,
            agent TEXT NOT NULL,
            model TEXT,
            title TEXT,
            time_created INTEGER NOT NULL,
            time_updated INTEGER NOT NULL,
            cost REAL DEFAULT 0,
            tokens_input INTEGER DEFAULT 0,
            tokens_output INTEGER DEFAULT 0,
            tokens_reasoning INTEGER DEFAULT 0,
            tokens_cache_read INTEGER DEFAULT 0,
            tokens_cache_write INTEGER DEFAULT 0
        );
    """)

    for proj in TEST_PROJECTS:
        conn.execute(
            "INSERT INTO project (id, name, worktree) VALUES (?, ?, ?)",
            (proj["id"], proj["name"], proj["worktree"]),
        )
    for ses in TEST_SESSIONS:
        conn.execute(
            """INSERT INTO session (id, parent_id, project_id, agent, model, title,
               time_created, time_updated, cost, tokens_input, tokens_output,
               tokens_reasoning, tokens_cache_read, tokens_cache_write)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (ses["id"], ses["parent_id"], ses["project_id"],
             ses["agent"], ses["model"], ses["title"],
             ses["time_created"], ses["time_updated"],
             ses["cost"], ses["tokens_input"], ses["tokens_output"],
             ses["tokens_reasoning"], ses["tokens_cache_read"],
             ses["tokens_cache_write"]),
        )
    conn.commit()
    conn.close()

    with patch("opendashboard.db.DB_PATH", db_path):
        yield db_path


@pytest.fixture
def client(test_db):
    """Provide FastAPI TestClient with patched database."""
    with TestClient(app) as c:
        yield c
