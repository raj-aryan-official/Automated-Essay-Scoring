"""Pydantic validation schemas for background jobs and scoring requests."""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


# WHY: Categorizes background task types between raw model scoring and detailed diagnostic feedback generation.
class JobTypeEnum(str, Enum):
    SCORING = "SCORING"
    FEEDBACK = "FEEDBACK"


# WHY: Enforces strict lifecycle state transitions (QUEUED -> PROCESSING -> COMPLETED / FAILED) for async worker jobs.
class JobStatusEnum(str, Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


# WHY: Immediate 202-style acknowledgement payload returned to the caller so the UI can initiate progress polling without blocking.
class JobDispatchResponse(BaseModel):
    """Response returned immediately when an async job is dispatched."""

    job_id: UUID = Field(..., description="Unique UUID of the queued background job")
    essay_id: UUID = Field(..., description="UUID of the essay being scored")
    status: str = Field(default="QUEUED", description="Initial job status ('QUEUED')")
    job_type: str = Field(default="SCORING", description="Type of job ('SCORING')")
    message: str | None = Field(
        default="Scoring job queued successfully",
        description="Human-readable acknowledgement message",
    )

    model_config = ConfigDict(from_attributes=True)


# WHY: Detailed background job telemetry schema reporting execution progress, worker attempt count, error messages, and duration timestamps.
class JobResponse(BaseModel):
    """Detailed job status and metadata returned from GET /api/v1/jobs/{job_id}."""

    id: UUID = Field(..., description="Job UUID")
    job_id: UUID | None = Field(default=None, description="Alias matching id")
    essay_id: UUID = Field(..., description="Referenced essay UUID")
    job_type: str = Field(..., description="Job type ('SCORING' or 'FEEDBACK')")
    status: str = Field(
        ...,
        description="Current status ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')",
    )
    priority: int = Field(
        default=100, description="Job priority (lower number = higher priority)"
    )
    attempts: int = Field(default=0, description="Number of execution attempts")
    max_attempts: int = Field(
        default=3, description="Maximum execution attempts before terminal failure"
    )
    error_message: str | None = Field(
        default=None, description="Failure reason or error message"
    )
    queued_at: datetime = Field(
        ..., description="Timestamp when job was created/queued"
    )
    started_at: datetime | None = Field(
        default=None, description="Timestamp when worker started execution"
    )
    completed_at: datetime | None = Field(
        default=None, description="Timestamp when worker finished execution"
    )

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def sync_job_id(self) -> "JobResponse":
        if self.job_id is None:
            self.job_id = self.id
        return self
