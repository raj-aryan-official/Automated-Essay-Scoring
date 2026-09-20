"""Essay submission and retrieval API endpoints."""

import base64
import logging
from typing import List, Optional
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.validation import (
    validate_document,
    validate_essay_text,
    validate_prompt_exists,
)
from app.models.entities import (
    DimensionFeedback,
    Essay,
    InferenceRun,
    ModelEntity,
    Prompt,
    Score,
    User,
)
from app.schemas.essay import (
    DimensionScoreDetail,
    EssayCreate,
    EssayCreateResponse,
    EssayDetailResponse,
    EssayResponse,
    EssayScoreResponse,
    SourceTypeEnum,
)
from app.schemas.job import JobDispatchResponse
from app.services.job_service import create_scoring_job
from app.services.storage import StorageService, get_storage_service

logger = logging.getLogger(__name__)

router = APIRouter()


def _is_base64(s: str) -> bool:
    """Check if a string looks like valid base64 encoding."""
    if len(s) % 4 != 0:
        return False
    try:
        base64.b64decode(s, validate=True)
        return True
    except Exception:
        return False


def _get_or_create_user(db: Session, user_id: Optional[UUID] = None) -> User:
    """Ensure a user exists for foreign key reference."""
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(
                id=user_id,
                email=f"user_{user_id}@aes.local",
                password_hash="system_managed",
                role="VIEWER",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    user = db.query(User).first()
    if not user:
        user = User(
            id=uuid.uuid4(),
            email="student@aes.local",
            password_hash="system_managed",
            role="VIEWER",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=EssayCreateResponse,
    summary="Submit a new essay (raw text or uploaded document)",
    openapi_extra={
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": EssayCreate.model_json_schema()
                },
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "prompt_id": {"type": "string", "format": "uuid"},
                            "source_type": {
                                "type": "string",
                                "enum": ["PASTE", "DOCUMENT"],
                                "default": "PASTE",
                            },
                            "raw_text": {"type": "string"},
                            "file": {"type": "string", "format": "binary"},
                            "submitted_by": {"type": "string", "format": "uuid"},
                        },
                        "required": ["prompt_id"],
                    }
                },
            }
        }
    },
)
async def submit_essay(
    request: Request,
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
):
    """Accept either raw pasted text (source_type=PASTE) or an uploaded document

    (source_type=DOCUMENT, saved via StorageService), assign a UUID, and persist
    the essay row with status=SUBMITTED. Return HTTP 201 with the essay UUID on success.
    """
    content_type = request.headers.get("content-type", "").lower()
    essay_id = uuid.uuid4()

    prompt_id: UUID
    source_type: str
    raw_text: str = ""
    submitted_by_id: Optional[UUID] = None
    storage_bucket: Optional[str] = None
    storage_key: Optional[str] = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        prompt_id_raw = form.get("prompt_id")
        if not prompt_id_raw:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Field 'prompt_id' is required.",
            )
        try:
            prompt_id = UUID(str(prompt_id_raw))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Field 'prompt_id' must be a valid UUID.",
            )

        # Validate prompt exists BEFORE performing storage operations
        prompt = validate_prompt_exists(db, prompt_id)

        source_type_in = str(form.get("source_type", "")).strip().upper()
        upload_file = form.get("file")

        if not source_type_in:
            source_type = SourceTypeEnum.DOCUMENT.value if upload_file else SourceTypeEnum.PASTE.value
        else:
            if source_type_in not in (SourceTypeEnum.PASTE.value, SourceTypeEnum.DOCUMENT.value):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="source_type must be either 'PASTE' or 'DOCUMENT'.",
                )
            source_type = source_type_in

        submitted_by_raw = form.get("submitted_by")
        if submitted_by_raw:
            try:
                submitted_by_id = UUID(str(submitted_by_raw))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Field 'submitted_by' must be a valid UUID.",
                )

        form_raw_text = form.get("raw_text")
        if form_raw_text is not None:
            raw_text = str(form_raw_text)

        if source_type == SourceTypeEnum.PASTE.value:
            raw_text = validate_essay_text(raw_text)
        elif source_type == SourceTypeEnum.DOCUMENT.value:
            # Handle file upload if present
            if upload_file is not None and hasattr(upload_file, "read"):
                file_bytes = await upload_file.read()
                filename = getattr(upload_file, "filename", None) or "document"
                file_content_type = getattr(upload_file, "content_type", "application/octet-stream")

                # Validate document size (<= 20MB) and MIME type / extension
                validate_document(file_bytes, filename=filename, content_type=file_content_type)

                if not raw_text.strip():
                    raw_text = file_bytes.decode("utf-8", errors="replace")

                raw_text = validate_essay_text(raw_text)

                try:
                    storage.ensure_bucket_exists()
                except Exception as exc:
                    logger.warning(f"Could not verify S3 bucket exists: {exc}")

                key = f"essays/{essay_id}/{filename}"
                storage.upload_file(file_bytes, key=key, content_type=file_content_type)
                storage_bucket = storage.bucket_name
                storage_key = key
            elif raw_text.strip():
                raw_text = validate_essay_text(raw_text)
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="A document file or raw_text must be provided for DOCUMENT submissions",
                )

    else:
        # JSON body parsing
        try:
            body_json = await request.json()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON request body.",
            )

        # Enforce max essay length check (8,000 chars) -> HTTP 413
        if body_json.get("raw_text") and len(str(body_json["raw_text"])) > 8000:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Essay text exceeds the maximum allowed length of 8,000 characters.",
            )

        try:
            payload = EssayCreate.model_validate(body_json)
        except Exception as val_err:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(val_err),
            )

        prompt_id = payload.prompt_id
        # Validate prompt exists BEFORE performing storage operations
        prompt = validate_prompt_exists(db, prompt_id)

        source_type = payload.source_type.value
        submitted_by_id = payload.submitted_by
        raw_text = payload.raw_text or ""
        storage_bucket = payload.storage_bucket
        storage_key = payload.storage_key

        if source_type == SourceTypeEnum.PASTE.value:
            raw_text = validate_essay_text(raw_text)
        elif source_type == SourceTypeEnum.DOCUMENT.value:
            # If document upload is sent as base64 or string content in JSON
            if payload.file_content:
                content_str = payload.file_content
                if _is_base64(content_str):
                    try:
                        file_bytes = base64.b64decode(content_str)
                    except Exception:
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Invalid base64 document content.",
                        )
                else:
                    file_bytes = content_str.encode("utf-8")

                filename = payload.file_name or "document.txt"
                # Validate document size (<= 20MB) and MIME type / extension
                validate_document(file_bytes, filename=filename)

                if not raw_text.strip():
                    raw_text = file_bytes.decode("utf-8", errors="replace")

                raw_text = validate_essay_text(raw_text)

                try:
                    storage.ensure_bucket_exists()
                except Exception as exc:
                    logger.warning(f"Could not verify S3 bucket exists: {exc}")

                key = f"essays/{essay_id}/{filename}"
                storage.upload_file(file_bytes, key=key)
                storage_bucket = storage.bucket_name
                storage_key = key
            elif raw_text.strip():
                raw_text = validate_essay_text(raw_text)
            elif storage_key and not storage_bucket:
                storage_bucket = storage.bucket_name

    # Ensure user exists for foreign key constraint
    user = _get_or_create_user(db, submitted_by_id)

    # Persist the essay record with status=SUBMITTED
    essay = Essay(
        id=essay_id,
        submitted_by=user.id,
        prompt_id=prompt.id,
        raw_text=raw_text,
        source_type=source_type,
        storage_bucket=storage_bucket,
        storage_key=storage_key,
        status="SUBMITTED",
    )
    db.add(essay)
    db.commit()
    db.refresh(essay)

    logger.info(
        f"Persisted essay {essay.id} for prompt {prompt.id} with status {essay.status}"
    )

    response_obj = EssayCreateResponse.model_validate(essay)
    response_obj.message = "Essay submitted successfully"
    return response_obj


@router.get(
    "",
    response_model=List[EssayResponse],
    summary="List submitted essays with optional filtering and pagination",
)
def list_essays(
    skip: int = Query(0, ge=0, description="Offset of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    status_filter: Optional[str] = Query(
        None, alias="status", description="Filter by status (e.g. SUBMITTED, SCORED)"
    ),
    prompt_id: Optional[UUID] = Query(None, description="Filter by prompt UUID"),
    db: Session = Depends(get_db),
):
    """Retrieve historical essays with pagination and optional status/prompt filters."""
    query = db.query(Essay)
    if status_filter:
        query = query.filter(Essay.status == status_filter)
    if prompt_id:
        query = query.filter(Essay.prompt_id == prompt_id)

    essays = query.order_by(Essay.created_at.desc()).offset(skip).limit(limit).all()
    return essays


@router.get(
    "/{essay_id}",
    response_model=EssayDetailResponse,
    summary="Retrieve essay details by UUID",
)
def get_essay_by_id(
    essay_id: UUID,
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
):
    """Retrieve essay metadata, raw text, lifecycle status, and presigned document

    download URL (if uploaded as a document) by essay UUID.
    """
    essay = db.query(Essay).filter(Essay.id == essay_id).first()
    if not essay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Essay with id '{essay_id}' not found.",
        )

    download_url: Optional[str] = None
    if essay.storage_key:
        try:
            download_url = storage.get_presigned_url(str(essay.storage_key))
        except Exception as exc:
            logger.warning(
                f"Could not generate presigned download URL for essay {essay.id}: {exc}"
            )

    prompt_title = essay.prompt.title if essay.prompt else None

    detail_res = EssayDetailResponse.model_validate(essay)
    detail_res.download_url = download_url
    detail_res.prompt_title = prompt_title
    return detail_res


@router.post(
    "/{essay_id}/score",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=JobDispatchResponse,
    summary="Dispatch an asynchronous scoring job for an essay",
)
def dispatch_scoring_job(
    essay_id: UUID,
    db: Session = Depends(get_db),
):
    """Insert a row into jobs (job_type=SCORING, status=QUEUED) and return HTTP 202

    with the job_id immediately (non-blocking).
    """
    essay = db.query(Essay).filter(Essay.id == essay_id).first()
    if not essay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Essay with id '{essay_id}' not found.",
        )

    job = create_scoring_job(db, essay_id=essay.id)

    return JobDispatchResponse(
        job_id=job.id,
        essay_id=job.essay_id,
        status=job.status,
        job_type=job.job_type,
        message="Scoring job queued successfully",
    )


@router.get(
    "/{essay_id}/score",
    response_model=EssayScoreResponse,
    summary="Retrieve scoring results and multi-dimensional feedback for an essay",
)
def get_essay_score(
    essay_id: UUID,
    db: Session = Depends(get_db),
):
    """Retrieve the holistic score, rubric band, confidence, dimension-level

    feedback, and model version for a scored essay (Section 8.2).
    """
    essay = db.query(Essay).filter(Essay.id == essay_id).first()
    if not essay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Essay with id '{essay_id}' not found.",
        )

    score = (
        db.query(Score)
        .filter(Score.essay_id == essay_id)
        .order_by(Score.created_at.desc())
        .first()
    )
    if not score:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Score for essay '{essay_id}' not found. Essay status is '{essay.status}'.",
        )

    # Determine model version
    model_version = "v1.0.0"
    if score.inference_run and score.inference_run.model:
        model_version = score.inference_run.model.version
    else:
        active_model = db.query(ModelEntity).filter(ModelEntity.status == "PRODUCTION").first()
        if active_model:
            model_version = active_model.version

    # Collect dimension feedback
    dimensions = []
    if score.dimension_feedbacks:
        for df in score.dimension_feedbacks:
            dimensions.append(
                DimensionScoreDetail(
                    dimension=df.dimension,
                    score=df.sub_score,
                    subScore=df.sub_score,
                    feedback=df.feedback_text,
                    feedbackText=df.feedback_text,
                )
            )

    return EssayScoreResponse(
        essayId=essay.id,
        holisticScore=score.holistic_score,
        rubricBand=score.rubric_band,
        confidence=score.confidence,
        dimensions=dimensions,
        modelVersion=model_version,
        reviewerOverrideScore=score.reviewer_override_score,
        reviewerOverrideReason=score.reviewer_override_reason,
    )
