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

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import SessionLocal
from app.models.entities import Prompt

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_prompts")

# Authentic ASAP prompt specifications
ASAP_PROMPTS_DATA: List[Dict[str, Any]] = [
    {
        "asap_set_id": 1,
        "title": "Prompt 1: Effects of Computers on Society (Persuasive)",
        "rubric_min": 2.0,
        "rubric_max": 12.0,
    },
    {
        "asap_set_id": 2,
        "title": "Prompt 2: Censorship in Libraries and Free Expression (Persuasive)",
        "rubric_min": 1.0,
        "rubric_max": 6.0,
    },
    {
        "asap_set_id": 3,
        "title": "Prompt 3: Rough Road Ahead / Cyclist Perseverance (Source-dependent)",
        "rubric_min": 0.0,
        "rubric_max": 3.0,
    },
    {
        "asap_set_id": 4,
        "title": "Prompt 4: Winter Hibiscus / Cultural Heritage & Resilience (Source-dependent)",
        "rubric_min": 0.0,
        "rubric_max": 3.0,
    },
    {
        "asap_set_id": 5,
        "title": "Prompt 5: Narciso Rodriguez / Fashion, Memory & Family Heritage (Source-dependent)",
        "rubric_min": 0.0,
        "rubric_max": 4.0,
    },
    {
        "asap_set_id": 6,
        "title": "Prompt 6: The Dirigibles / Mooring Masts & Airship Navigation (Source-dependent)",
        "rubric_min": 0.0,
        "rubric_max": 4.0,
    },
    {
        "asap_set_id": 7,
        "title": "Prompt 7: Patience, Perseverance and Character Development (Narrative)",
        "rubric_min": 0.0,
        "rubric_max": 30.0,
    },
    {
        "asap_set_id": 8,
        "title": "Prompt 8: Laughter and Shared Human Experience (Narrative)",
        "rubric_min": 0.0,
        "rubric_max": 60.0,
    },
]


def seed_prompts() -> int:
    """Seed all 8 ASAP prompts into the database idempotently.

    Uses PostgreSQL ON CONFLICT (asap_set_id) DO UPDATE to ensure
    safe re-execution without duplicate rows.

    Returns:
        int: Number of prompts processed.
    """
    logger.info("Starting ASAP prompts seeding...")
    db = SessionLocal()
    count = 0

    try:
        for prompt_data in ASAP_PROMPTS_DATA:
            # PostgreSQL UPSERT construct on unique constraint asap_set_id
            stmt = insert(Prompt).values(
                asap_set_id=prompt_data["asap_set_id"],
                title=prompt_data["title"],
                rubric_min=prompt_data["rubric_min"],
                rubric_max=prompt_data["rubric_max"],
            )

            # Update fields on conflict to ensure data synchronization
            stmt = stmt.on_conflict_do_update(
                index_elements=["asap_set_id"],
                set_={
                    "title": stmt.excluded.title,
                    "rubric_min": stmt.excluded.rubric_min,
                    "rubric_max": stmt.excluded.rubric_max,
                },
            )

            db.execute(stmt)
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
