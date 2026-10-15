"""Main FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.deps import get_async_db, get_db
from app.api.v1 import api_router
from app.core.config import settings

# WHY: We use FastAPI as our ASGI framework for native async I/O, automatic Pydantic validation, and OpenAPI doc generation
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Automated Essay Scoring REST API and Real-Time Assessment Engine",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# WHY: We enable CORS middleware to permit secure cross-origin REST requests from our React/Vite frontend (ports 3000 & 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WHY: We version-prefix all domain routes under /api/v1 to isolate endpoints and maintain backward-compatible API contracts
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["General"])
async def root():
    """Root entrypoint providing basic service discovery and links."""
    # WHY: We provide a lightweight discovery endpoint so load balancers and developers can immediately verify API availability and doc links
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
    # WHY: We redirect any legacy versioned docs requests directly to the canonical Swagger UI at /docs to prevent broken links
    return RedirectResponse(url="/docs")


# WHY: We re-export database dependency providers at the root module level for clean application-wide access
__all__ = ["app", "get_db", "get_async_db"]
