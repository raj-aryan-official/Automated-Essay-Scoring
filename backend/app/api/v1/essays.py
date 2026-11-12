"""Essay submission and retrieval API endpoints."""

from __future__ import annotations

import base64
import logging
import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, require_teacher, require_viewer
from app.core.validation import (
    validate_document,
    validate_essay_text,
    validate_prompt_exists,
)
from app.models.entities import (
    Essay,
    Job,
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
    EssayListResponse,
    EssayResponse,
    EssayScoreResponse,
    ReviewerOverrideRequest,
    SourceTypeEnum,
)
from app.schemas.job import JobDispatchResponse, JobResponse
from app.services.document_extraction import extract_document_text
from app.services.job_service import create_scoring_job
from app.services.storage import StorageService, get_storage_service

logger = logging.getLogger(__name__)

router = APIRouter()

# WHY: Only a queued or running job blocks a second dispatch; any other job state is historical
ACTIVE_JOB_STATUSES = ("QUEUED", "PROCESSING")

# WHY: Essays in these states already have a model score, so re-dispatching would create duplicate scores
SCORED_ESSAY_STATUSES = ("SCORED", "FEEDBACK_READY", "UNDER_REVIEW", "FINALIZED")


def _is_base64(s: str) -> bool:
    """Check if a string looks like valid base64 encoding."""
    if len(s) % 4 != 0:
        return False
    try:
        base64.b64decode(s, validate=True)
        return True
    except Exception:
        return False


def _build_score_response(db: Session, essay: Essay, score: Score) -> EssayScoreResponse:
    """Serialize a score row together with its prompt rubric bounds."""
    model_version = "v1.0.0"
    if score.inference_run and score.inference_run.model:
        model_version = score.inference_run.model.version
    else:
        active_model = (
            db.query(ModelEntity).filter(ModelEntity.status == "PRODUCTION").first()
        )
        if active_model:
            model_version = active_model.version

    dimensions = [
        DimensionScoreDetail(
            dimension=df.dimension,
            score=df.sub_score,
            subScore=df.sub_score,
            feedback=df.feedback_text,
            feedbackText=df.feedback_text,
        )
        for df in score.dimension_feedbacks
    ]

    prompt = essay.prompt
    return EssayScoreResponse(
        essayId=essay.id,
        holisticScore=score.holistic_score,
        rubricBand=score.rubric_band,
        confidence=score.confidence,
        dimensions=dimensions,
        modelVersion=model_version,
        promptId=essay.prompt_id,
        promptTitle=prompt.title if prompt else None,
        rubricMin=prompt.rubric_min if prompt else None,
        rubricMax=prompt.rubric_max if prompt else None,
        essayStatus=essay.status,
        reviewerOverrideScore=score.reviewer_override_score,
        reviewerOverrideReason=score.reviewer_override_reason,
        reviewerOverrideAt=score.reviewer_override_at,
    )


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=EssayCreateResponse,
    summary="Submit a new essay (raw text or uploaded document)",
    openapi_extra={
        "requestBody": {
            "content": {
                "application/json": {"schema": EssayCreate.model_json_schema()},
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
                        },
                        "required": ["prompt_id"],
                    }
                },
            }
        }
    },
)
# WHY: Unified submission gateway accepting both raw text pastes and binary document uploads (.pdf, .docx), returning HTTP 201 Created
async def submit_essay(
    request: Request,
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
    current_user: User = Depends(require_teacher),
):
    """Accept either raw pasted text (source_type=PASTE) or an uploaded document

    (source_type=DOCUMENT, saved via StorageService), assign a UUID, and persist
    the essay row with status=SUBMITTED. Return HTTP 201 with the essay UUID on success.
    """
    # WHY: Inspects request Content-Type to branch dynamically between multipart streaming and JSON deserialization
    content_type = request.headers.get("content-type", "").lower()
    essay_id = uuid.uuid4()

    prompt_id: UUID
    source_type: str
    raw_text: str = ""
    storage_bucket: str | None = None
    storage_key: str | None = None

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
            ) from None

        # Validate prompt exists BEFORE performing storage operations
        prompt = validate_prompt_exists(db, prompt_id)

        source_type_in = str(form.get("source_type", "")).strip().upper()
        upload_file = form.get("file")

        if not source_type_in:
            source_type = (
                SourceTypeEnum.DOCUMENT.value
                if upload_file
                else SourceTypeEnum.PASTE.value
            )
        else:
            if source_type_in not in (
                SourceTypeEnum.PASTE.value,
                SourceTypeEnum.DOCUMENT.value,
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="source_type must be either 'PASTE' or 'DOCUMENT'.",
                )
            source_type = source_type_in

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
                file_content_type = getattr(
                    upload_file, "content_type", "application/octet-stream"
                )

                # Validate document size (<= 20MB) and MIME type / extension
                validate_document(
                    file_bytes, filename=filename, content_type=file_content_type
                )

                # WHY: PDFs/DOCX must be parsed server-side; decoding raw bytes as UTF-8 corrupts the essay text
                raw_text = extract_document_text(file_bytes, filename=filename)
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
            ) from None

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
            ) from val_err

        prompt_id = payload.prompt_id
        # Validate prompt exists BEFORE performing storage operations
        prompt = validate_prompt_exists(db, prompt_id)

        source_type = payload.source_type.value
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
                        ) from None
                else:
                    file_bytes = content_str.encode("utf-8")

                filename = payload.file_name or "document.txt"
                # Validate document size (<= 20MB) and MIME type / extension
                validate_document(file_bytes, filename=filename)

                raw_text = extract_document_text(file_bytes, filename=filename)
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
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="A document file or raw_text must be provided for DOCUMENT submissions",
                )

    # WHY: Attribution always comes from the authenticated JWT so callers cannot impersonate another submitter
    essay = Essay(
        id=essay_id,
        submitted_by=current_user.id,
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
    response_model=EssayListResponse,
    summary="List submitted essays with search, filtering and pagination",
)
# WHY: Server-side pagination/search keeps the explorer responsive and avoids unbounded limit requests
def list_essays(
    page: int = Query(1, ge=1, description="1-based page number"),
    page_size: int = Query(20, ge=1, le=100, description="Records per page"),
    q: str | None = Query(
        None, max_length=200, description="Search essay text, prompt, submitter"
    ),
    status_filter: str | None = Query(
        None, alias="status", description="Filter by status (e.g. SUBMITTED, SCORED)"
    ),
    prompt_id: UUID | None = Query(None, description="Filter by prompt UUID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Retrieve historical essays with server-side search, filtering and pagination."""
    query = db.query(Essay)

    if status_filter:
        query = query.filter(Essay.status == status_filter)
    if prompt_id:
        query = query.filter(Essay.prompt_id == prompt_id)
    if q and q.strip():
        needle = f"%{q.strip()}%"
        query = query.outerjoin(Prompt, Essay.prompt_id == Prompt.id).outerjoin(
            User, Essay.submitted_by == User.id
        )
        query = query.filter(
            or_(
                Essay.raw_text.ilike(needle),
                Essay.status.ilike(needle),
                Prompt.title.ilike(needle),
                User.email.ilike(needle),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    essays = (
        query.options(
            joinedload(Essay.prompt),
            joinedload(Essay.submitter),
            joinedload(Essay.scores),
        )
        .order_by(Essay.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    results = []
    for e in essays:
        item = EssayResponse.model_validate(e)
        if e.prompt:
            item.prompt_title = e.prompt.title
            item.asap_set_id = e.prompt.asap_set_id
            item.rubric_min = e.prompt.rubric_min
            item.rubric_max = e.prompt.rubric_max
        if e.submitter:
            item.submitter_email = e.submitter.email
        if e.scores:
            latest_score = max(e.scores, key=lambda s: s.created_at or datetime.min)
            item.holistic_score = latest_score.holistic_score
            item.rubric_band = latest_score.rubric_band
            item.confidence = latest_score.confidence
            item.reviewer_override_score = latest_score.reviewer_override_score
        results.append(item)

    return EssayListResponse(items=results, total=total, skip=offset, limit=page_size)


# WHY: Fetches full essay text and dynamically generates temporary S3 presigned download URLs for original document submissions
@router.get(
    "/{essay_id}",
    response_model=EssayDetailResponse,
    summary="Retrieve essay details by UUID",
)
def get_essay_by_id(
    essay_id: UUID,
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
    current_user: User = Depends(require_viewer),
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

    download_url: str | None = None
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
    if essay.prompt:
        detail_res.asap_set_id = essay.prompt.asap_set_id
        detail_res.rubric_min = essay.prompt.rubric_min
        detail_res.rubric_max = essay.prompt.rubric_max
    if essay.submitter:
        detail_res.submitter_email = essay.submitter.email
    return detail_res


# WHY: Implements asynchronous dispatch pattern returning HTTP 202 Accepted with job_id so API threads never block during BERT inference
@router.post(
    "/{essay_id}/score",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=JobDispatchResponse,
    summary="Dispatch an asynchronous scoring job for an essay",
)
def dispatch_scoring_job(
    essay_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
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

    # WHY: Reuse an in-flight job instead of queuing duplicates for the same essay
    active_job = (
        db.query(Job)
        .filter(
            Job.essay_id == essay.id,
            Job.job_type == "SCORING",
            Job.status.in_(ACTIVE_JOB_STATUSES),
        )
        .order_by(Job.queued_at.desc())
        .first()
    )
    if active_job:
        return JobDispatchResponse(
            job_id=active_job.id,
            essay_id=essay.id,
            status=active_job.status,
            job_type=active_job.job_type,
            message="Scoring job is already in progress",
        )

    if essay.status in SCORED_ESSAY_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Essay already has a score (status '{essay.status}'). "
                "Use the reviewer override workflow to change it."
            ),
        )
    if essay.status not in ("SUBMITTED", "PROCESSING_FAILED"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Essay cannot be scored from status '{essay.status}'.",
        )

    job = create_scoring_job(db, essay_id=essay.id)

    return JobDispatchResponse(
        job_id=job.id,
        essay_id=job.essay_id,
        status=job.status,
        job_type=job.job_type,
        message="Scoring job queued successfully",
    )


# WHY: Lets the UI recover the polling target after a page refresh instead of guessing a job UUID
@router.get(
    "/{essay_id}/jobs/latest",
    response_model=JobResponse,
    summary="Get the most recent scoring job for an essay",
)
def get_latest_essay_job(
    essay_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Return the newest job row associated with the essay."""
    essay = db.query(Essay).filter(Essay.id == essay_id).first()
    if not essay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Essay with id '{essay_id}' not found.",
        )

    job = (
        db.query(Job)
        .filter(Job.essay_id == essay_id)
        .order_by(Job.queued_at.desc())
        .first()
    )
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No job found for essay '{essay_id}'.",
        )
    return JobResponse.model_validate(job)


# WHY: Fetches calculated holistic score, calibrated confidence, and 3-dimensional feedback items for split-screen ScoreWorkspace
@router.get(
    "/{essay_id}/score",
    response_model=EssayScoreResponse,
    summary="Retrieve scoring results and multi-dimensional feedback for an essay",
)
def get_essay_score(
    essay_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
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

    return _build_score_response(db, essay, score)


@router.post(
    "/{essay_id}/review",
    response_model=EssayScoreResponse,
    summary="Submit human reviewer score override and justification",
)
def review_essay(
    essay_id: UUID,
    payload: ReviewerOverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """Accept reviewer_override_score and reviewer_override_reason, persist the

    override onto the scores row, and finalize the essay in a single transaction.
    """
    essay = db.query(Essay).filter(Essay.id == essay_id).first()
    if not essay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Essay with id '{essay_id}' not found.",
        )
    if essay.status == "FINALIZED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Essay is already finalized; overrides can no longer be changed.",
        )

    score = (
        db.query(Score)
        .filter(Score.essay_id == essay_id)
        .order_by(Score.created_at.desc())
        .first()
    )
    if not score:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot review essay '{essay_id}' because it has not been scored yet. Current status is '{essay.status}'.",
        )

    # WHY: An override outside the prompt's rubric range would produce an invalid grade
    prompt = essay.prompt
    if prompt and not (
        prompt.rubric_min <= payload.reviewer_override_score <= prompt.rubric_max
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Override score must be within this prompt's rubric range "
                f"[{prompt.rubric_min:g}, {prompt.rubric_max:g}]."
            ),
        )

    score.reviewer_override_score = payload.reviewer_override_score
    score.reviewer_override_reason = payload.reviewer_override_reason
    score.reviewer_override_at = datetime.now(timezone.utc)
    essay.status = "FINALIZED"
    db.commit()
    db.refresh(score)
    db.refresh(essay)

    logger.info(
        "Essay '%s' finalized by %s. Override score: %s",
        essay_id,
        current_user.email,
        payload.reviewer_override_score,
    )

    return _build_score_response(db, essay, score)
