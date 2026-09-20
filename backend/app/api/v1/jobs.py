"""Background job tracking and management API endpoints."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_viewer
from app.models.entities import Job, User
from app.schemas.job import JobResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get job execution status and details",
)
def get_job_status(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Retrieve job execution state, status, attempts, error message, and timestamps."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with id '{job_id}' not found.",
        )

    return JobResponse.model_validate(job)
