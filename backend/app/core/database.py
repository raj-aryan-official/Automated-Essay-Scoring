"""Database connection configuration and session management."""

import logging
from typing import Any, AsyncGenerator, Dict, Generator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import settings

logger = logging.getLogger(__name__)


def _create_sync_engine():
    sync_url = settings.DATABASE_SYNC_URL
    is_sqlite = sync_url.startswith("sqlite")
    engine_kwargs: Dict[str, Any] = {"pool_pre_ping": True}
    if is_sqlite:
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    else:
        engine_kwargs.update({"pool_size": 10, "max_overflow": 20})

    try:
        eng = create_engine(sync_url, **engine_kwargs)
        # Probe connection if not sqlite
        if not is_sqlite:
            with eng.connect() as conn:
                pass
        return eng
    except Exception as exc:
        logger.warning(
            f"Failed to connect to primary database at {sync_url}: {exc}. "
            "Falling back to local SQLite engine."
        )
        fallback_url = "sqlite:///./local_dev.db"
        return create_engine(fallback_url, connect_args={"check_same_thread": False})


def init_db(target_engine=None):
    """Initialize all database tables from declared ORM entities."""
    from app.models.entities import Base as ModelsBase
    eng = target_engine or engine
    ModelsBase.metadata.create_all(bind=eng)
    logger.info("Database schema verified / initialized successfully.")


def _create_async_engine():
    async_url = settings.DATABASE_URL
    is_sqlite = async_url.startswith("sqlite")
    engine_kwargs: Dict[str, Any] = {"pool_pre_ping": True}
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


# Synchronous engine for sync worker tasks and routes
engine = _create_sync_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Asynchronous engine for high-concurrency FastAPI endpoints
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


def get_db() -> Generator[Session, None, None]:
    """Dependency for synchronous database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for asynchronous database session."""
    if AsyncSessionLocal is None:
        raise RuntimeError("Asynchronous database session is not configured or driver unavailable.")
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
