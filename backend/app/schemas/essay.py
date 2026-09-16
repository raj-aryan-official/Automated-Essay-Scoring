"""Pydantic validation schemas for essay submissions and queries."""

from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SourceTypeEnum(str, Enum):
    PASTE = "PASTE"
    DOCUMENT = "DOCUMENT"


class EssayStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    SCORED = "SCORED"
    FEEDBACK_READY = "FEEDBACK_READY"
    UNDER_REVIEW = "UNDER_REVIEW"
    FINALIZED = "FINALIZED"
    PROCESSING_FAILED = "PROCESSING_FAILED"


class EssayBase(BaseModel):
    prompt_id: UUID = Field(..., description="UUID of the prompt being addressed")
    source_type: SourceTypeEnum = Field(
        default=SourceTypeEnum.PASTE,
        description="Submission source type ('PASTE' or 'DOCUMENT')",
    )


class EssayCreate(EssayBase):
    raw_text: Optional[str] = Field(
        default=None,
        description="Raw essay text (required when source_type is PASTE)",
    )
    submitted_by: Optional[UUID] = Field(
        default=None,
        description="User UUID submitting the essay (optional, defaults to current/default student)",
    )
    storage_bucket: Optional[str] = Field(
        default=None,
        description="Target S3/MinIO bucket (for DOCUMENT submissions)",
    )
    storage_key: Optional[str] = Field(
        default=None,
        description="Target S3/MinIO object key (for DOCUMENT submissions)",
    )
    file_content: Optional[str] = Field(
        default=None,
        description="Optional base64 or raw string document content if sending JSON",
    )
    file_name: Optional[str] = Field(
        default=None,
        description="Original document filename",
    )

    @model_validator(mode="after")
    def validate_source_and_content(self) -> "EssayCreate":
        if self.source_type == SourceTypeEnum.PASTE:
            if not (self.raw_text and self.raw_text.strip()):
                raise ValueError("raw_text is required when source_type is PASTE and cannot be empty")
            stripped = self.raw_text.strip()
            if len(stripped) < 10 or len(stripped.split()) < 2:
                raise ValueError("raw_text is too short or near-empty (minimum 10 characters and 2 words required)")
        if self.source_type == SourceTypeEnum.DOCUMENT and not (
            self.raw_text or self.file_content or self.storage_key
        ):
            raise ValueError(
                "Either raw_text, file_content, or storage_key must be provided for DOCUMENT submissions"
            )
        return self


class EssayCreateResponse(BaseModel):
    id: UUID = Field(..., description="Unique UUID assigned to the submitted essay")
    status: str = Field(default="SUBMITTED", description="Current lifecycle status")
    prompt_id: UUID = Field(..., description="Referenced prompt UUID")
    submitted_by: UUID = Field(..., description="Submitter user UUID")
    source_type: str = Field(..., description="Source type ('PASTE' or 'DOCUMENT')")
    raw_text: str = Field(..., description="Essay raw text content")
    storage_bucket: Optional[str] = Field(default=None, description="S3 bucket name")
    storage_key: Optional[str] = Field(default=None, description="S3 storage key")
    created_at: datetime = Field(..., description="Timestamp of submission")
    message: Optional[str] = Field(
        default="Essay submitted successfully",
        description="Human-readable success message",
    )

    model_config = ConfigDict(from_attributes=True)


class EssayResponse(BaseModel):
    id: UUID = Field(..., description="Essay UUID")
    prompt_id: UUID = Field(..., description="Referenced prompt UUID")
    submitted_by: UUID = Field(..., description="Submitter user UUID")
    raw_text: str = Field(..., description="Essay content")
    source_type: str = Field(..., description="Source type ('PASTE' or 'DOCUMENT')")
    storage_bucket: Optional[str] = Field(default=None, description="S3 bucket")
    storage_key: Optional[str] = Field(default=None, description="S3 object key")
    status: str = Field(..., description="Current status")
    created_at: datetime = Field(..., description="Submission timestamp")

    model_config = ConfigDict(from_attributes=True)


class EssayDetailResponse(EssayResponse):
    download_url: Optional[str] = Field(
        default=None,
        description="Presigned URL to download the original document from storage (if applicable)",
    )
    prompt_title: Optional[str] = Field(
        default=None,
        description="Title of the referenced prompt",
    )

    model_config = ConfigDict(from_attributes=True)


class EssayListResponse(BaseModel):
    items: List[EssayResponse] = Field(..., description="List of essay records")
    total: int = Field(..., description="Total count matching filter")
    skip: int = Field(default=0, description="Offset used")
    limit: int = Field(default=50, description="Page limit used")

    model_config = ConfigDict(from_attributes=True)
