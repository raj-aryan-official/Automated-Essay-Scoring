"""Tests for FastAPI application, configuration, readiness endpoint, and database dependency."""

import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import Settings, settings
from app.api.deps import get_db, get_async_db
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_settings_loaded():
    """Verify settings loaded with required attributes."""
    assert settings.DATABASE_URL is not None
    assert settings.S3_ENDPOINT is not None
    assert settings.S3_BUCKET is not None
    assert settings.JWT_SECRET is not None
    assert settings.PROJECT_NAME == "Automated Essay Scoring"
    assert "http://localhost:5173" in settings.cors_origins


def test_settings_env_override(monkeypatch):
    """Verify settings pick up environment variables correctly."""
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://custom_user:custom_pass@localhost:5432/custom_db")
    monkeypatch.setenv("S3_ENDPOINT", "http://custom-s3:9000")
    monkeypatch.setenv("S3_BUCKET", "custom-bucket")
    monkeypatch.setenv("JWT_SECRET", "super-secret-jwt-key")
    monkeypatch.setenv("FRONTEND_ORIGIN", "http://myfrontend.local:3000")

    custom_settings = Settings()
    assert custom_settings.DATABASE_URL == "postgresql+asyncpg://custom_user:custom_pass@localhost:5432/custom_db"
    assert custom_settings.DATABASE_SYNC_URL == "postgresql://custom_user:custom_pass@localhost:5432/custom_db"
    assert custom_settings.S3_ENDPOINT == "http://custom-s3:9000"
    assert custom_settings.S3_BUCKET == "custom-bucket"
    assert custom_settings.JWT_SECRET == "super-secret-jwt-key"
    assert "http://myfrontend.local:3000" in custom_settings.cors_origins


def test_openapi_docs_endpoint(client):
    """Verify OpenAPI documentation is served at /docs and schema at /openapi.json."""
    response = client.get("/docs")
    assert response.status_code == 200
    assert "swagger-ui" in response.text.lower() or "html" in response.headers.get("content-type", "")

    openapi_response = client.get("/openapi.json")
    assert openapi_response.status_code == 200
    data = openapi_response.json()
    assert data["info"]["title"] == settings.PROJECT_NAME
    assert "/api/v1/ready" in data["paths"]


def test_root_endpoint(client):
    """Verify root / endpoint provides documentation and status links."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["docs"] == "/docs"
    assert data["ready"] == "/api/v1/ready"


def test_ready_healthcheck_endpoint(client):
    """Verify GET /api/v1/ready healthcheck endpoint returns operational status."""
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert data["version"] == "1.0.0"


def test_cors_headers(client):
    """Verify CORS headers are returned for frontend origin."""
    origin = "http://localhost:5173"
    response = client.get("/api/v1/health", headers={"Origin": origin})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_preflight(client):
    """Verify CORS OPTIONS preflight request."""
    origin = "http://localhost:5173"
    response = client.options(
        "/api/v1/ready",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin


def test_get_db_dependency():
    """Verify get_db dependency yields a database session and closes it."""
    db_gen = get_db()
    session = next(db_gen)
    assert session is not None
    # Verify session can execute simple statement
    from sqlalchemy import text
    result = session.execute(text("SELECT 1")).scalar()
    assert result == 1
    # Cleanup session
    try:
        next(db_gen)
    except StopIteration:
        pass


def test_legacy_docs_redirect(client):
    """Verify legacy /api/v1/docs redirects to canonical /docs."""
    response = client.get("/api/v1/docs", follow_redirects=False)
    assert response.status_code in (307, 302)
    assert response.headers.get("location") == "/docs"


def test_reexports_and_imports():
    """Verify get_db and get_async_db are cleanly exportable across packages."""
    from app.main import get_db as main_get_db, get_async_db as main_get_async_db
    from app.core.database import get_db as db_get_db, get_async_db as db_get_async_db
    from app.api.deps import get_db as deps_get_db, get_async_db as deps_get_async_db

    assert main_get_db is deps_get_db
    assert deps_get_db is db_get_db
    assert main_get_async_db is deps_get_async_db
    assert deps_get_async_db is db_get_async_db


def test_settings_aliases_and_fallbacks(monkeypatch):
    """Verify reciprocal aliases for S3_ENDPOINT_URL, S3_BUCKET_NAME, and SECRET_KEY."""
    monkeypatch.delenv("S3_ENDPOINT", raising=False)
    monkeypatch.delenv("S3_BUCKET", raising=False)
    monkeypatch.delenv("JWT_SECRET", raising=False)

    monkeypatch.setenv("S3_ENDPOINT_URL", "http://legacy-s3:9000")
    monkeypatch.setenv("S3_BUCKET_NAME", "legacy-bucket")
    monkeypatch.setenv("SECRET_KEY", "legacy-secret-key")

    s = Settings()
    assert s.S3_ENDPOINT == "http://legacy-s3:9000"
    assert s.S3_ENDPOINT_URL == "http://legacy-s3:9000"
    assert s.S3_BUCKET == "legacy-bucket"
    assert s.S3_BUCKET_NAME == "legacy-bucket"
    assert s.JWT_SECRET == "legacy-secret-key"
    assert s.SECRET_KEY == "legacy-secret-key"


def test_readiness_probe_degraded(client):
    """Verify /api/v1/ready returns degraded status when database execution fails."""
    from unittest.mock import MagicMock
    from app.main import app

    mock_db = MagicMock()
    mock_db.execute.side_effect = Exception("DB Connection Lost")

    # Override get_db dependency
    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        response = client.get("/api/v1/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert "unavailable" in data["database"]
    finally:
        app.dependency_overrides.clear()

