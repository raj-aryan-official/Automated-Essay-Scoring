"""API v1 Router definitions."""
from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": "v1"}
