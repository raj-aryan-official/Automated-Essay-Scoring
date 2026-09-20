#!/usr/bin/env python3
"""Idempotent seed script to populate the 'prompts' table with all 8 ASAP essay sets.

Data matches Section 10.3 (ASAP Ground Truth Mapping):
- Set 1: 2 - 12 (Persuasive)
- Set 2: 1 - 6  (Persuasive)
- Set 3: 0 - 3  (Source-dependent)
- Set 4: 0 - 3  (Source-dependent)
- Set 5: 0 - 4  (Source-dependent)
- Set 6: 0 - 4  (Source-dependent)
- Set 7: 0 - 30 (Narrative)
- Set 8: 0 - 60 (Narrative)
"""

import logging
import os
import sys
from typing import Any, Dict, List

# Ensure backend root is on sys.path for direct script execution
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from uuid import UUID
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import SessionLocal, init_db
from app.models.entities import Prompt

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_prompts")

# Authentic ASAP prompt specifications with deterministic UUIDs matching frontend
ASAP_PROMPTS_DATA: List[Dict[str, Any]] = [
    {
        "id": UUID("11111111-1111-1111-1111-111111111111"),
        "asap_set_id": 1,
        "title": "Prompt 1: Effects of Computers on Society (Persuasive)",
        "rubric_min": 2.0,
        "rubric_max": 12.0,
    },
    {
        "id": UUID("22222222-2222-2222-2222-222222222222"),
        "asap_set_id": 2,
        "title": "Prompt 2: Censorship in Libraries and Free Expression (Persuasive)",
        "rubric_min": 1.0,
        "rubric_max": 6.0,
    },
    {
        "id": UUID("33333333-3333-3333-3333-333333333333"),
        "asap_set_id": 3,
        "title": "Prompt 3: Rough Road Ahead / Cyclist Perseverance (Source-dependent)",
        "rubric_min": 0.0,
        "rubric_max": 3.0,
    },
    {
        "id": UUID("44444444-4444-4444-4444-444444444444"),
        "asap_set_id": 4,
        "title": "Prompt 4: Winter Hibiscus / Cultural Heritage & Resilience (Source-dependent)",
        "rubric_min": 0.0,
        "rubric_max": 3.0,
    },
    {
        "id": UUID("55555555-5555-5555-5555-555555555555"),
        "asap_set_id": 5,
        "title": "Prompt 5: Narciso Rodriguez / Fashion, Memory & Family Heritage (Source-dependent)",
        "rubric_min": 0.0,
        "rubric_max": 4.0,
    },
    {
        "id": UUID("66666666-6666-6666-6666-666666666666"),
        "asap_set_id": 6,
        "title": "Prompt 6: The Dirigibles / Mooring Masts & Airship Navigation (Source-dependent)",
        "rubric_min": 0.0,
        "rubric_max": 4.0,
    },
    {
        "id": UUID("77777777-7777-7777-7777-777777777777"),
        "asap_set_id": 7,
        "title": "Prompt 7: Patience, Perseverance and Character Development (Narrative)",
        "rubric_min": 0.0,
        "rubric_max": 30.0,
    },
    {
        "id": UUID("88888888-8888-8888-8888-888888888888"),
        "asap_set_id": 8,
        "title": "Prompt 8: Laughter and Shared Human Experience (Narrative)",
        "rubric_min": 0.0,
        "rubric_max": 60.0,
    },
]


def seed_prompts() -> int:
    """Seed all 8 ASAP prompts into the database idempotently.

    Works across both PostgreSQL and SQLite by querying existing prompts.

    Returns:
        int: Number of prompts processed.
    """
    logger.info("Initializing database schema if needed...")
    init_db()

    logger.info("Starting ASAP prompts seeding...")
    db = SessionLocal()
    count = 0

    try:
        for prompt_data in ASAP_PROMPTS_DATA:
            existing = (
                db.query(Prompt)
                .filter(
                    (Prompt.asap_set_id == prompt_data["asap_set_id"])
                    | (Prompt.id == prompt_data["id"])
                )
                .first()
            )

            if existing:
                existing.title = prompt_data["title"]
                existing.rubric_min = prompt_data["rubric_min"]
                existing.rubric_max = prompt_data["rubric_max"]
                existing.asap_set_id = prompt_data["asap_set_id"]
                db.add(existing)
            else:
                new_prompt = Prompt(
                    id=prompt_data["id"],
                    asap_set_id=prompt_data["asap_set_id"],
                    title=prompt_data["title"],
                    rubric_min=prompt_data["rubric_min"],
                    rubric_max=prompt_data["rubric_max"],
                )
                db.add(new_prompt)

            count += 1
            logger.info(
                "Seeded Set %d: %s | Range: [%.1f - %.1f]",
                prompt_data["asap_set_id"],
                prompt_data["title"],
                prompt_data["rubric_min"],
                prompt_data["rubric_max"],
            )

        db.commit()
        logger.info("[SUCCESS] All %d ASAP prompts seeded and committed.", count)
        return count

    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("[ERROR] Failed to seed prompts: %s", exc)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    try:
        seed_prompts()
    except Exception as e:
        sys.exit(1)
