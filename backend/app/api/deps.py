"""Common dependencies for FastAPI endpoints and routes."""

from app.core.database import get_async_db, get_db

__all__ = ["get_db", "get_async_db"]
