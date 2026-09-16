"""API v1 Router definitions."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.v1.essays import router as essays_router
from app.api.v1.jobs import router as jobs_router
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(essays_router, prefix="/essays", tags=["Essays"])
api_router.include_router(jobs_router, prefix="/jobs", tags=["Jobs"])


@api_router.get("/health", tags=["Health"])
async def health_check():
    """Basic healthcheck endpoint returning API service status."""
    return {"status": "ok", "version": "v1"}


@api_router.get("/ready", tags=["Health"])
def readiness_check(db: Session = Depends(get_db)):
    """Readiness probe checking database connectivity and system operational state."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unavailable: {exc}"

    is_healthy = db_status == "connected"
    return {
        "status": "ready" if is_healthy else "degraded",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
    }
