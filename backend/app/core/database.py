"""Database connection configuration and session management."""

import logging
from collections.abc import AsyncGenerator, Generator
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)


# WHY: We construct a synchronous engine with connection pooling (pool_size=10, max_overflow=20) for background workers, CLI seeders, and migration tasks
def _create_sync_engine():
    sync_url = settings.DATABASE_SYNC_URL
    is_sqlite = sync_url.startswith("sqlite")
    # WHY: pool_pre_ping verifies liveness before issuing queries, transparently recovering from stale database connections
    engine_kwargs: dict[str, Any] = {"pool_pre_ping": True}
    if is_sqlite:
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    else:
        engine_kwargs.update({"pool_size": 10, "max_overflow": 20})

    try:
        eng = create_engine(sync_url, **engine_kwargs)
        # Probe connection if not sqlite
        if not is_sqlite:
            with eng.connect():
                pass
        return eng
    except Exception as exc:
        # WHY: Fallback to SQLite ensures local development and test runs never crash when PostgreSQL container is offline
        logger.warning(
            f"Failed to connect to primary database at {sync_url}: {exc}. "
            "Falling back to local SQLite engine."
        )
        fallback_url = "sqlite:///./local_dev.db"
        return create_engine(fallback_url, connect_args={"check_same_thread": False})


# WHY: Creates all declared tables on initial startup to ensure relational schemas are ready before handling requests
def init_db(target_engine=None):
    """Initialize all database tables from declared ORM entities."""
    from app.models.entities import Base as ModelsBase

    eng = target_engine or engine
    ModelsBase.metadata.create_all(bind=eng)
    logger.info("Database schema verified / initialized successfully.")


# WHY: We create an asynchronous engine via asyncpg for non-blocking SQL queries inside FastAPI request loops
def _create_async_engine():
    async_url = settings.DATABASE_URL
    is_sqlite = async_url.startswith("sqlite")
    engine_kwargs: dict[str, Any] = {"pool_pre_ping": True}
    if is_sqlite:
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    else:
        engine_kwargs.update({"pool_size": 10, "max_overflow": 20})

    try:
        eng = create_async_engine(async_url, **engine_kwargs)
        _ = eng.dialect
        return eng
    except Exception as exc:
        logger.warning(
            f"Failed to initialize async database engine for {async_url}: {exc}."
        )
        return None


# WHY: Synchronous session factory bound to the sync engine for worker tasks and standard transactions
engine = _create_sync_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# WHY: Asynchronous session factory bound to asyncpg engine for high-throughput non-blocking HTTP endpoints
async_engine = _create_async_engine()
if async_engine is not None:
    AsyncSessionLocal = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )
else:
    AsyncSessionLocal = None

Base = declarative_base()


# WHY: Yields a sync DB session per request and guarantees closure via finally block to prevent connection pool exhaustion
def get_db() -> Generator[Session, None, None]:
    """Dependency for synchronous database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# WHY: Yields an async DB session per request and guarantees session closure via async context manager
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for asynchronous database session."""
    if AsyncSessionLocal is None:
        raise RuntimeError(
            "Asynchronous database session is not configured or driver unavailable."
        )
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
