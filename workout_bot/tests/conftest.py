import sys
import os

# Add workout_bot/ to sys.path so bare imports (database, api, program) resolve correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import database


@pytest.fixture()
def db_path(tmp_path, monkeypatch):
    """Isolated temp SQLite file per test; patches database.DB_PATH before init."""
    path = str(tmp_path / "test.db")
    monkeypatch.setattr(database, "DB_PATH", path)
    database.init_db()
    yield path


@pytest.fixture()
def client(db_path):
    """FastAPI TestClient backed by the isolated per-test database."""
    from starlette.testclient import TestClient
    import api
    from auth import get_current_user
    api.app.dependency_overrides[get_current_user] = lambda: 1
    with TestClient(api.app, raise_server_exceptions=True) as c:
        yield c
    api.app.dependency_overrides.clear()
