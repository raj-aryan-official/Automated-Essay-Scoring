"""Prompt catalogue API endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_viewer
from app.models.entities import Prompt, User
from app.schemas.prompt import ASAP_GENRE_BY_SET, PromptResponse

router = APIRouter()


# WHY: Single source of truth for the 8 ASAP prompts so the submission form and filters never hardcode IDs or rubric bounds
@router.get(
    "",
    response_model=list[PromptResponse],
    summary="List all essay prompts with rubric bounds",
)
def list_prompts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Return every seeded ASAP prompt ordered by essay set number."""
    prompts = db.query(Prompt).order_by(Prompt.asap_set_id.asc()).all()
    return [
        PromptResponse(
            id=p.id,
            asap_set_id=p.asap_set_id,
            title=p.title,
            genre=ASAP_GENRE_BY_SET.get(p.asap_set_id, "General"),
            rubric_min=p.rubric_min,
            rubric_max=p.rubric_max,
            created_at=p.created_at,
        )
        for p in prompts
    ]
