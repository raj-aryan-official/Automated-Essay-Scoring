"""Asynchronous job management service with atomic worker queue dispatch.

Implements:
- Scoring job insertion (status=QUEUED, job_type=SCORING)
- Atomic job-claiming using PostgreSQL's FOR UPDATE SKIP LOCKED
- Job status retrieval and tracking
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import Essay, Job

logger = logging.getLogger(__name__)


# WHY: Enqueues an asynchronous scoring job and links it to the essay, transitioning both to QUEUED state for worker consumption
def create_scoring_job(
    db: Session,
    essay_id: UUID | Any,
    priority: int = 100,
    max_attempts: int = 3,
) -> Job:
    """Create and queue a new asynchronous scoring job for the specified essay.

    Inserts a row into jobs (job_type=SCORING, status=QUEUED) and sets the
    associated essay's status to QUEUED.
    """
    job = Job(
        id=uuid.uuid4(),
        essay_id=essay_id,
        job_type="SCORING",
        status="QUEUED",
        priority=priority,
        attempts=0,
        max_attempts=max_attempts,
        queued_at=datetime.now(timezone.utc),
    )
    db.add(job)

    # WHY: Keeps essay status synchronized with the job queue so teachers immediately see the essay is pending assessment
    essay = db.query(Essay).filter(Essay.id == essay_id).first()
    if essay:
        essay.status = "QUEUED"
        db.add(essay)

    db.commit()
    db.refresh(job)
    logger.info(f"Queued scoring job {job.id} for essay {essay_id}")
    return job


# WHY: Atomically claims the next queued job using PostgreSQL's FOR UPDATE SKIP LOCKED to prevent duplicate processing across concurrent workers
def claim_next_job(
    db: Session,
    job_type: str | None = None,
) -> Job | None:
    """Atomically claim the next queued job using PostgreSQL's FOR UPDATE SKIP LOCKED.

    Query:
        SELECT id FROM jobs
        WHERE status = 'QUEUED'
        ORDER BY priority ASC, queued_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1;

    Transitions the claimed job's status to PROCESSING, sets started_at timestamp,
    increments execution attempts count, and commits within the active transaction.
    Returns None if no jobs are currently queued.
    """
    query = db.query(Job).filter(Job.status == "QUEUED")
    if job_type:
        query = query.filter(Job.job_type == job_type)

    # WHY: with_for_update(skip_locked=True) ensures that competing worker daemons skip locked rows without waiting, achieving zero lock contention
    job = (
        query.order_by(Job.priority.asc(), Job.queued_at.asc())
        .with_for_update(skip_locked=True)
        .first()
    )

    if not job:
        return None

    # WHY: Atomically transition job to PROCESSING and track started_at timestamp for worker timeout monitoring
    job.status = "PROCESSING"
    job.started_at = datetime.now(timezone.utc)
    job.attempts = (job.attempts or 0) + 1
    db.add(job)

    # Also update associated essay status to PROCESSING if present
    if job.essay:
        job.essay.status = "PROCESSING"
        db.add(job.essay)

    db.commit()
    db.refresh(job)
    logger.info(
        f"Claimed job {job.id} (type={job.job_type}, attempt={job.attempts}) for worker execution"
    )
    return job


# WHY: Supports polling from the frontend (GET /api/v1/jobs/{job_id}) to display live progress spinners until scoring completes
def get_job_by_id(db: Session, job_id: UUID) -> Job | None:
    """Retrieve a job by UUID from the database."""
    return db.query(Job).filter(Job.id == job_id).first()
