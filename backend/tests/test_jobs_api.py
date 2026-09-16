"""Tests for async scoring job dispatch, status polling, and atomic worker claiming.

Covers:
- POST /api/v1/essays/{id}/score (HTTP 202, job row creation, non-blocking response)
- POST /api/v1/essays/{id}/score for non-existent essay (HTTP 404)
- GET /api/v1/jobs/{job_id} (Status polling, attempts, error_message, timestamps)
- GET /api/v1/jobs/{job_id} for non-existent job (HTTP 404)
- claim_next_job() with FOR UPDATE SKIP LOCKED logic:
  - Priority and FIFO order claiming
  - Status transition to PROCESSING with started_at timestamp
  - Multiple worker simulation: no duplicate job processing
  - Empty queue handling
"""

import sys
import uuid
from pathlib import Path
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.api.deps import get_db
from app.main import app
from app.models.entities import Essay, Job, Prompt, User
from app.services.job_service import claim_next_job, create_scoring_job, get_job_by_id
from app.services.storage import StorageService, get_storage_service


@pytest.fixture(scope="session")
def test_engine():
    """Create in-memory SQLite engine with StaticPool for thread-safe test isolation."""
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Create required tables
    User.__table__.create(bind=eng)
    Prompt.__table__.create(bind=eng)
    Essay.__table__.create(bind=eng)
    Job.__table__.create(bind=eng)
    return eng


@pytest.fixture
def db_session(test_engine) -> Generator[Session, None, None]:
    """Provide a transactional database session rolled back after each test."""
    TestingSession = sessionmaker(bind=test_engine, expire_on_commit=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(test_engine) -> Generator[TestClient, None, None]:
    """FastAPI TestClient with get_db and get_storage_service overridden."""
    TestingSession = sessionmaker(bind=test_engine, expire_on_commit=False)

    def _override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    def _override_get_storage():
        return StorageService(endpoint_url=None)

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_storage_service] = _override_get_storage
    test_client = TestClient(app)
    try:
        yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def seed_prompt(db_session: Session) -> Prompt:
    """Seed a sample prompt for testing."""
    existing = db_session.query(Prompt).filter(Prompt.asap_set_id == 1).first()
    if existing:
        return existing
    prompt = Prompt(
        id=uuid.uuid4(),
        asap_set_id=1,
        title="Prompt 1: Technology in society",
        rubric_min=2.0,
        rubric_max=12.0,
    )
    db_session.add(prompt)
    db_session.commit()
    return prompt


@pytest.fixture
def sample_essay(client: TestClient, seed_prompt: Prompt) -> dict:
    """Submit a valid essay and return its response payload."""
    res = client.post(
        "/api/v1/essays",
        json={
            "prompt_id": str(seed_prompt.id),
            "source_type": "PASTE",
            "raw_text": "Computers have dramatically altered the landscape of education and scholarship.",
        },
    )
    assert res.status_code == 201
    return res.json()


def test_score_essay_success(client: TestClient, sample_essay: dict, db_session: Session):
    """Verify POST /api/v1/essays/{id}/score creates a QUEUED job and returns HTTP 202."""
    essay_id = sample_essay["id"]

    response = client.post(f"/api/v1/essays/{essay_id}/score")
    assert response.status_code == 202

    data = response.json()
    assert "job_id" in data
    assert uuid.UUID(data["job_id"])
    assert data["essay_id"] == essay_id
    assert data["status"] == "QUEUED"
    assert data["job_type"] == "SCORING"

    # Verify job persistence in database
    job_in_db = db_session.query(Job).filter(Job.id == uuid.UUID(data["job_id"])).first()
    assert job_in_db is not None
    assert job_in_db.job_type == "SCORING"
    assert job_in_db.status == "QUEUED"
    assert job_in_db.attempts == 0
    assert job_in_db.max_attempts == 3

    # Verify essay status updated to QUEUED
    essay_in_db = db_session.query(Essay).filter(Essay.id == uuid.UUID(essay_id)).first()
    assert essay_in_db is not None
    assert essay_in_db.status == "QUEUED"


def test_score_essay_not_found(client: TestClient):
    """Verify POST /api/v1/essays/{id}/score returns HTTP 404 for a non-existent essay."""
    missing_id = str(uuid.uuid4())
    response = client.post(f"/api/v1/essays/{missing_id}/score")
    assert response.status_code == 404
    assert f"Essay with id '{missing_id}' not found" in response.json()["detail"]


def test_get_job_by_id_success(client: TestClient, sample_essay: dict):
    """Verify GET /api/v1/jobs/{job_id} returns status, attempts, error_message, etc."""
    essay_id = sample_essay["id"]

    # Trigger scoring job
    score_res = client.post(f"/api/v1/essays/{essay_id}/score")
    assert score_res.status_code == 202
    job_id = score_res.json()["job_id"]

    # Poll job status
    job_res = client.get(f"/api/v1/jobs/{job_id}")
    assert job_res.status_code == 200

    data = job_res.json()
    assert data["id"] == job_id
    assert data["job_id"] == job_id
    assert data["essay_id"] == essay_id
    assert data["status"] == "QUEUED"
    assert data["job_type"] == "SCORING"
    assert data["attempts"] == 0
    assert data["error_message"] is None
    assert "queued_at" in data


def test_get_job_by_id_not_found(client: TestClient):
    """Verify GET /api/v1/jobs/{job_id} returns HTTP 404 for a non-existent job UUID."""
    missing_job_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/jobs/{missing_job_id}")
    assert response.status_code == 404
    assert f"Job with id '{missing_job_id}' not found" in response.json()["detail"]


def test_claim_next_job_empty_queue(db_session: Session):
    """Verify claim_next_job() returns None when queue has no jobs."""
    # Ensure all existing jobs in test DB are deleted or marked non-queued
    db_session.query(Job).delete()
    db_session.commit()

    claimed = claim_next_job(db_session)
    assert claimed is None


def test_claim_next_job_status_transition(db_session: Session, seed_prompt: Prompt, client: TestClient):
    """Verify claim_next_job() transitions job status to PROCESSING and sets started_at."""
    res = client.post(
        "/api/v1/essays",
        json={
            "prompt_id": str(seed_prompt.id),
            "source_type": "PASTE",
            "raw_text": "Evaluating automated essay scoring with asynchronous workers.",
        },
    )
    essay_id = uuid.UUID(res.json()["id"])
    job = create_scoring_job(db_session, essay_id=essay_id)
    assert job.status == "QUEUED"
    assert job.attempts == 0
    assert job.started_at is None

    claimed_job = claim_next_job(db_session)
    assert claimed_job is not None
    assert claimed_job.id == job.id
    assert claimed_job.status == "PROCESSING"
    assert claimed_job.attempts == 1
    assert claimed_job.started_at is not None

    # Verify associated essay status transitioned to PROCESSING
    essay_in_db = db_session.query(Essay).filter(Essay.id == essay_id).first()
    assert essay_in_db.status == "PROCESSING"


def test_claim_next_job_priority_and_no_double_processing(
    db_session: Session, seed_prompt: Prompt, client: TestClient
):
    """Verify claim_next_job() claims in priority order and never double-processes jobs."""
    db_session.query(Job).delete()
    db_session.commit()

    # Create 3 essays
    essay_ids = []
    for i in range(3):
        res = client.post(
            "/api/v1/essays",
            json={
                "prompt_id": str(seed_prompt.id),
                "source_type": "PASTE",
                "raw_text": f"Essay content for priority queue test case number {i+1}.",
            },
        )
        essay_ids.append(uuid.UUID(res.json()["id"]))

    # Insert jobs with different priorities
    # Low priority number = higher execution urgency
    j_low = create_scoring_job(db_session, essay_id=essay_ids[0], priority=200)
    j_urgent = create_scoring_job(db_session, essay_id=essay_ids[1], priority=10)
    j_medium = create_scoring_job(db_session, essay_id=essay_ids[2], priority=100)

    # Worker 1 claims -> should receive j_urgent (priority 10)
    w1_job = claim_next_job(db_session)
    assert w1_job is not None
    assert w1_job.id == j_urgent.id
    assert w1_job.status == "PROCESSING"

    # Worker 2 claims -> should receive j_medium (priority 100), NOT j_urgent again
    w2_job = claim_next_job(db_session)
    assert w2_job is not None
    assert w2_job.id == j_medium.id
    assert w2_job.status == "PROCESSING"

    # Worker 3 claims -> should receive j_low (priority 200)
    w3_job = claim_next_job(db_session)
    assert w3_job is not None
    assert w3_job.id == j_low.id
    assert w3_job.status == "PROCESSING"

    # Worker 4 claims -> queue is empty, returns None
    w4_job = claim_next_job(db_session)
    assert w4_job is None
