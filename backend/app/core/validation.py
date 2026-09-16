"""Input validation layer for essay submissions and document uploads.

Enforces:
- Rejecting empty or near-empty text (HTTP 422)
- Rejecting essays over 8,000 characters (HTTP 413)
- Rejecting documents over 20MB (HTTP 413)
- Rejecting documents with disallowed MIME types or extensions (HTTP 415)
- Validating referenced prompt_id exists in the database (HTTP 404)
"""

import logging
from pathlib import Path
from typing import Optional, Set
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import Prompt

logger = logging.getLogger(__name__)

# Size and length constraints
MAX_ESSAY_LENGTH: int = 8000
MIN_ESSAY_LENGTH: int = 10
MIN_ESSAY_WORDS: int = 2
MAX_DOCUMENT_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB

# Allowed document MIME types
ALLOWED_MIME_TYPES: Set[str] = {
    "text/plain",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/rtf",
    "text/rtf",
    "text/markdown",
    "text/x-markdown",
}

# Allowed file extensions
ALLOWED_EXTENSIONS: Set[str] = {
    ".txt",
    ".pdf",
    ".docx",
    ".doc",
    ".rtf",
    ".md",
}


def validate_prompt_exists(db: Session, prompt_id: UUID) -> Prompt:
    """Verify that referenced prompt exists in the database.
    
    Returns Prompt instance if found, or raises HTTP 404.
    """
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prompt with id '{prompt_id}' not found.",
        )
    return prompt


def validate_essay_text(raw_text: Optional[str]) -> str:
    """Validate essay text length and content.
    
    - Rejects empty or whitespace-only submissions with HTTP 422.
    - Rejects near-empty submissions (< MIN_ESSAY_LENGTH chars or < MIN_ESSAY_WORDS words) with HTTP 422.
    - Rejects essays exceeding MAX_ESSAY_LENGTH characters with HTTP 413.
    """
    if raw_text is None or not raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Essay text cannot be empty or blank.",
        )

    stripped = raw_text.strip()
    words = stripped.split()

    if len(stripped) < MIN_ESSAY_LENGTH or len(words) < MIN_ESSAY_WORDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Essay text is too short or near-empty (minimum {MIN_ESSAY_LENGTH} "
                f"characters and {MIN_ESSAY_WORDS} words required)."
            ),
        )

    if len(raw_text) > MAX_ESSAY_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"Essay text exceeds the maximum allowed length of {MAX_ESSAY_LENGTH} "
                f"characters (received {len(raw_text)} characters)."
            ),
        )

    return raw_text


def validate_document(
    file_bytes: bytes,
    filename: Optional[str] = None,
    content_type: Optional[str] = None,
) -> None:
    """Validate uploaded document size and MIME type.
    
    - Rejects documents exceeding MAX_DOCUMENT_SIZE_BYTES (20MB) with HTTP 413.
    - Rejects documents with disallowed MIME types or extensions with HTTP 415.
    """
    # 1. Enforce max file size (20MB)
    if len(file_bytes) > MAX_DOCUMENT_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"Uploaded document exceeds maximum allowed size of 20MB "
                f"(received {len(file_bytes)} bytes)."
            ),
        )

    # 2. Enforce MIME type & extension checks
    normalized_mime = (content_type or "").lower().split(";")[0].strip()
    ext = Path(filename).suffix.lower() if filename else ""

    # Check for explicitly disallowed or untrusted MIME type
    if normalized_mime and normalized_mime not in ALLOWED_MIME_TYPES:
        if normalized_mime != "application/octet-stream":
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=(
                    f"Disallowed MIME type '{content_type}'. "
                    f"Allowed types are: PDF, DOCX, DOC, TXT, RTF, MD."
                ),
            )
        # If generic application/octet-stream, verify file extension
        if not ext or ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=(
                    f"Disallowed MIME type '{content_type}' without a valid document extension. "
                    f"Allowed extensions are: .txt, .pdf, .docx, .doc, .rtf, .md."
                ),
            )

    # If extension is present, ensure it is within allowed extensions
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Disallowed file extension '{ext}'. "
                f"Allowed extensions are: .txt, .pdf, .docx, .doc, .rtf, .md."
            ),
        )

    # If neither valid mime nor extension could be established
    if not normalized_mime and not ext:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unable to determine document type. Allowed types are: PDF, DOCX, DOC, TXT, RTF, MD.",
        )
