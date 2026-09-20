"""Automated tests for POST /api/v1/essays/{id}/review endpoint.

Covers:
- Reviewing non-existent essay returns 404
- Reviewing unscored essay returns 400
- Missing/invalid payload returns 422
- Successful review transitions essay to UNDER_REVIEW then FINALIZED
- Persisting reviewer_override_score, reviewer_override_reason, reviewer_override_at
"""

import sys
import uuid
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.api.deps import get_db
from app.main import app
from app.models.entities import (
    DimensionFeedback,
    Essay,
    InferenceRun,
    Job,
    ModelEntity,
    Prompt,
    Score,
    User,
)


@pytest.fixture(scope="session")
def test_engine():
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    User.__table__.create(bind=eng)
    Prompt.__table__.create(bind=eng)
    Essay.__table__.create(bind=eng)
    Job.__table__.create(bind=eng)
    ModelEntity.__table__.create(bind=eng)
    InferenceRun.__table__.create(bind=eng)
    Score.__table__.create(bind=eng)
    DimensionFeedback.__table__.create(bind=eng)
    return eng


@pytest.fixture
def db_session(test_engine):
    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )
    session = TestingSessionLocal()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def seed_data(db_session):
    uid = uuid.uuid4().hex[:8]
    user = User(
        id=uuid.uuid4(),
        email=f"teacher_{uid}@aes.local",
        password_hash="hashed_pw",
        role="TEACHER",
    )
    db_session.add(user)

    prompt = Prompt(
        id=uuid.uuid4(),
        asap_set_id=int(uuid.uuid4().int % 1000000),
        title="Computers and Society",
        rubric_min=2.0,
        rubric_max=12.0,
    )
    db_session.add(prompt)

    model = ModelEntity(
        id=uuid.uuid4(),
        name="bert-aes-test",
        version=f"v1.0.0-test-{uid}",
        framework="PyTorch",
        architecture="BERT",
        weights_storage_key="test/weights.bin",
        status="PRODUCTION",
    )
    db_session.add(model)

    scored_essay = Essay(
        id=uuid.uuid4(),
        submitted_by=user.id,
        prompt_id=prompt.id,
        raw_text="A great essay about computing in education.",
        source_type="PASTE",
        status="SCORED",
    )
    db_session.add(scored_essay)

    unscored_essay = Essay(
        id=uuid.uuid4(),
        submitted_by=user.id,
        prompt_id=prompt.id,
        raw_text="An unscored essay draft.",
        source_type="PASTE",
        status="SUBMITTED",
    )
    db_session.add(unscored_essay)

    run = InferenceRun(
        id=uuid.uuid4(),
        essay_id=scored_essay.id,
        model_id=model.id,
        confidence_threshold=0.80,
        device="cpu",
        inference_ms=150,
    )
    db_session.add(run)

    score = Score(
        id=uuid.uuid4(),
        inference_run_id=run.id,
        essay_id=scored_essay.id,
        holistic_score=8.0,
        rubric_band="Competent",
        confidence=0.88,
    )
    db_session.add(score)

    feedback = DimensionFeedback(
        id=uuid.uuid4(),
        score_id=score.id,
        dimension="grammar",
        sub_score=4.0,
        feedback_text="Good grammatical consistency.",
    )
    db_session.add(feedback)

    db_session.commit()

    return {
        "user": user,
        "prompt": prompt,
        "model": model,
        "scored_essay": scored_essay,
        "unscored_essay": unscored_essay,
        "score": score,
    }


def test_review_non_existent_essay_returns_404(client):
    random_id = str(uuid.uuid4())
    res = client.post(
        f"/api/v1/essays/{random_id}/review",
        json={"reviewer_override_score": 10.0, "reviewer_override_reason": "Good"},
    )
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_review_unscored_essay_returns_400(client, seed_data):
    essay_id = str(seed_data["unscored_essay"].id)
    res = client.post(
        f"/api/v1/essays/{essay_id}/review",
        json={"reviewer_override_score": 9.5, "reviewer_override_reason": "Adjusted"},
    )
    assert res.status_code == 400
    assert "not been scored yet" in res.json()["detail"].lower()


def test_review_missing_reason_returns_422(client, seed_data):
    essay_id = str(seed_data["scored_essay"].id)
    res = client.post(
        f"/api/v1/essays/{essay_id}/review",
        json={"reviewer_override_score": 10.0, "reviewer_override_reason": ""},
    )
    assert res.status_code == 422


def test_review_valid_override_finalizes_essay(client, db_session, seed_data):
    essay_id = str(seed_data["scored_essay"].id)
    payload = {
        "reviewer_override_score": 10.5,
        "reviewer_override_reason": "Exceptional nuance in argumentation not fully captured by length heuristics.",
    }
    res = client.post(f"/api/v1/essays/{essay_id}/review", json=payload)
    assert res.status_code == 200

    data = res.json()
    assert data["essayId"] == essay_id
    assert data["reviewerOverrideScore"] == 10.5
    assert data["reviewerOverrideReason"] == payload["reviewer_override_reason"]
    assert data["reviewerOverrideAt"] is not None

    # Verify database persistence
    db_session.expire_all()
    essay = db_session.query(Essay).filter(Essay.id == seed_data["scored_essay"].id).first()
    assert essay.status == "FINALIZED"

    score = db_session.query(Score).filter(Score.essay_id == seed_data["scored_essay"].id).first()
    assert score.reviewer_override_score == 10.5
    assert score.reviewer_override_reason == payload["reviewer_override_reason"]
    assert score.reviewer_override_at is not None

    # Verify GET /api/v1/essays/{id}/score returns the override and timestamp
    get_res = client.get(f"/api/v1/essays/{essay_id}/score")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["reviewerOverrideScore"] == 10.5
    assert get_data["reviewerOverrideReason"] == payload["reviewer_override_reason"]
    assert get_data["reviewerOverrideAt"] is not None
