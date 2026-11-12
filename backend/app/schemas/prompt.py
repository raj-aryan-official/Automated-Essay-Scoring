"""Pydantic schemas for essay prompts."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

ASAP_GENRE_BY_SET: dict[int, str] = {
    1: "Persuasive",
    2: "Persuasive",
    3: "Source-dependent",
    4: "Source-dependent",
    5: "Source-dependent",
    6: "Source-dependent",
    7: "Narrative",
    8: "Narrative",
}


class PromptResponse(BaseModel):
    """Public representation of an ASAP prompt and its rubric bounds."""

    id: UUID = Field(..., description="Prompt UUID")
    asap_set_id: int = Field(..., description="ASAP essay set number (1-8)")
    title: str = Field(..., description="Prompt title")
    genre: str = Field(..., description="Essay genre for this set")
    rubric_min: float = Field(..., description="Minimum rubric score")
    rubric_max: float = Field(..., description="Maximum rubric score")
    created_at: datetime | None = Field(default=None, description="Creation timestamp")

    model_config = ConfigDict(from_attributes=True)
