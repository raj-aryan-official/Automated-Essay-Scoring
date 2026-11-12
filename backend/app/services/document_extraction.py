"""Server-side text extraction for uploaded essay documents.

Decoding raw document bytes as UTF-8 (the previous behaviour) turns every PDF
and DOCX into mojibake, so extraction has to happen on the server before the
essay row is created.
"""

from __future__ import annotations

import io
import logging
from pathlib import Path

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


def _extract_pdf(file_bytes: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(file_bytes: bytes) -> str:
    import docx

    document = docx.Document(io.BytesIO(file_bytes))
    parts = [paragraph.text for paragraph in document.paragraphs]
    for table in document.tables:
        for row in table.rows:
            parts.append(" | ".join(cell.text for cell in row.cells))
    return "\n".join(parts)


# WHY: Converts .pdf/.docx uploads into the plain text the scoring model consumes; rejects scanned or empty documents instead of scoring garbage
def extract_document_text(file_bytes: bytes, filename: str | None = None) -> str:
    """Return plain essay text extracted from an uploaded document."""
    ext = Path(filename or "").suffix.lower()

    try:
        if ext == ".pdf":
            text = _extract_pdf(file_bytes)
        elif ext == ".docx":
            text = _extract_docx(file_bytes)
        else:
            text = file_bytes.decode("utf-8", errors="replace")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Document extraction failed for %s: %s", filename, exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Could not read text from '{filename or 'document'}'. "
                "Upload a valid PDF/DOCX or paste the essay text instead."
            ),
        ) from exc

    text = text.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"No extractable text found in '{filename or 'document'}'. "
                "Scanned PDFs are not supported - paste the essay text instead."
            ),
        )
    return text
