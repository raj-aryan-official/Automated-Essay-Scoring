"""Main FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.deps import get_async_db, get_db
from app.api.v1 import api_router
from app.core.config import settings

# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Automated Essay Scoring REST API and Real-Time Assessment Engine",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS for frontend origin and allowed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router (includes /api/v1/health and /api/v1/ready)
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["General"])
async def root():
    """Root entrypoint providing basic service discovery and links."""
    return {
        "message": "Welcome to Automated Essay Scoring API",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "ready": f"{settings.API_V1_STR}/ready",
        "version": "1.0.0",
    }


@app.get(f"{settings.API_V1_STR}/docs", include_in_schema=False)
async def redirect_v1_docs():
    """Redirect legacy API v1 docs URL to canonical /docs."""
    return RedirectResponse(url="/docs")


# Re-export database dependencies for convenient application-level access
__all__ = ["app", "get_db", "get_async_db"]
