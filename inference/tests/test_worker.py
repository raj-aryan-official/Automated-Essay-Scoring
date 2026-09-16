"""Tests for inference worker daemon, model scoring stub, and TEST-005 retry handling."""

import sys
import uuid
from pathlib import Path
from typing import Generator
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend and inference paths are on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
INFERENCE_DIR = REPO_ROOT / "inference"

for path in (str(BACKEND_DIR), str(INFERENCE_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

from app.models.entities import Essay, InferenceRun, Job, ModelEntity, Prompt, Score, User
from app.services.job_service import create_scoring_job
from worker import poll_and_process_once, process_job, stub_predict_score


@pytest.fixture(scope="session")
def test_engine():
    """Create in-memory SQLite engine with StaticPool for worker test isolation."""
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
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
def seed_prompt(db_session: Session) -> Prompt:
    """Seed prompt for rubric-aligned worker scoring."""
    existing = db_session.query(Prompt).filter(Prompt.asap_set_id == 1).first()
    if existing:
        return existing
    prompt = Prompt(
        id=uuid.uuid4(),
        asap_set_id=1,
        title="Prompt 1: Effects of Computers on Society",
        rubric_min=2.0,
        rubric_max=12.0,
    )
    db_session.add(prompt)
    db_session.commit()
    return prompt


@pytest.fixture
def seed_user(db_session: Session) -> User:
    """Seed student user for essay submission."""
    existing = db_session.query(User).first()
    if existing:
        return existing
    user = User(
        id=uuid.uuid4(),
        email="student_worker_test@aes.local",
        password_hash="test_pass",
        role="VIEWER",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def seed_essay(db_session: Session, seed_prompt: Prompt, seed_user: User) -> Essay:
    """Seed essay record for worker scoring tests."""
    essay = Essay(
        id=uuid.uuid4(),
        submitted_by=seed_user.id,
        prompt_id=seed_prompt.id,
        raw_text="The emergence of computing infrastructure has transformed global collaboration and pedagogical methods.",
        source_type="PASTE",
        status="SUBMITTED",
    )
    db_session.add(essay)
    db_session.commit()
    return essay


def test_stub_predict_score_bounds():
    """Verify stub_predict_score returns scores strictly within prompt rubric boundaries."""
    for _ in range(25):
        pred = stub_predict_score("Sample essay text", rubric_min=2.0, rubric_max=12.0)
        assert 2.0 <= pred["holistic_score"] <= 12.0
        assert 0.0 <= pred["confidence"] <= 1.0
        assert pred["rubric_band"] in ("Advanced", "Proficient", "Basic", "Below Basic")
        assert pred["inference_ms"] > 0


def test_worker_successful_job_execution(db_session: Session, seed_essay: Essay):
    """Verify worker processes a queued job to COMPLETED and sets essay status to SCORED."""
    job = create_scoring_job(db_session, essay_id=seed_essay.id)
    assert job.status == "QUEUED"
    assert job.attempts == 0
    assert job.completed_at is None

    # Process job via worker
    completed_job = poll_and_process_once(db_session)
    assert completed_job is not None
    assert completed_job.id == job.id
    assert completed_job.status == "COMPLETED"
    assert completed_job.completed_at is not None
    assert completed_job.error_message is None
    assert completed_job.attempts == 1

    # Verify essay transitioned to SCORED
    essay_in_db = db_session.query(Essay).filter(Essay.id == seed_essay.id).first()
    assert essay_in_db is not None
    assert essay_in_db.status == "SCORED"


def test_test_005_simulated_worker_crash_and_retries(db_session: Session, seed_essay: Essay):
    """TEST-005: Async Worker Crash & Job Retries.

    Scenario: Simulated worker crash / exception during model execution.
    Expected Behavior:
    - Attempt 1 failure: attempts ticks to 1, job requeued as QUEUED (retry flag).
    - Attempt 2 failure: attempts ticks to 2, job requeued as QUEUED.
    - Attempt 3 failure: attempts ticks to 3 (>= max_attempts=3), job flags terminal FAILED.
    Priority: High
    """
    # Clean any prior jobs
    db_session.query(Job).delete()
    db_session.commit()

    # Create job with max_attempts=3
    job = create_scoring_job(db_session, essay_id=seed_essay.id, max_attempts=3)
    assert job.status == "QUEUED"
    assert job.attempts == 0

    crash_count = 0

    def crashing_model(raw_text: str, rubric_min: float, rubric_max: float) -> dict:
        nonlocal crash_count
        crash_count += 1
        raise RuntimeError(f"Simulated Worker Crash #{crash_count}")

    # --- Attempt 1 ---
    job_1 = poll_and_process_once(db_session, model_fn=crashing_model)
    assert job_1 is not None
    assert job_1.attempts == 1
    assert job_1.status == "QUEUED"  # Requeued for retry!
    assert "Crash #1" in str(job_1.error_message)

    # Confirm essay is also kept in QUEUED status
    essay_check = db_session.query(Essay).filter(Essay.id == seed_essay.id).first()
    assert essay_check is not None
    assert essay_check.status == "QUEUED"

    # --- Attempt 2 ---
    job_2 = poll_and_process_once(db_session, model_fn=crashing_model)
    assert job_2 is not None
    assert job_2.id == job.id
    assert job_2.attempts == 2
    assert job_2.status == "QUEUED"  # Still retryable
    assert "Crash #2" in str(job_2.error_message)

    # --- Attempt 3 (Final attempt reaching max_attempts=3) ---
    job_3 = poll_and_process_once(db_session, model_fn=crashing_model)
    assert job_3 is not None
    assert job_3.id == job.id
    assert job_3.attempts == 3
    assert job_3.status == "FAILED"  # Permanently marked FAILED
    assert "Crash #3" in str(job_3.error_message)

    # Confirm essay transitioned to PROCESSING_FAILED
    essay_failed = db_session.query(Essay).filter(Essay.id == seed_essay.id).first()
    assert essay_failed is not None
    assert essay_failed.status == "PROCESSING_FAILED"

    # Verify no more queued jobs remain to claim
    job_drained = poll_and_process_once(db_session)
    assert job_drained is None
