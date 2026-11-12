"""Unit and integration tests for /api/v1/analytics endpoints."""

import pytest
from app.api.deps import get_db
from app.core.security import create_access_token
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
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


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
def viewer_token(db_session: Session) -> str:
    """Create a test viewer user and return access token."""
    user = db_session.query(User).filter(User.email == "viewer_test@aes.local").first()
    if not user:
        user = User(
            email="viewer_test@aes.local",
            password_hash="hashed_dummy_password",
            role="VIEWER",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    return create_access_token(
        subject=str(user.id),
        role=str(user.role),
        email=str(user.email) if user.email else None,
    )


@pytest.fixture
def ml_engineer_token(db_session: Session) -> str:
    """Create a test ML_ENGINEER user and return access token."""
    user = (
        db_session.query(User).filter(User.email == "engineer_test@aes.local").first()
    )
    if not user:
        user = User(
            email="engineer_test@aes.local",
            password_hash="hashed_dummy_password",
            role="ML_ENGINEER",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    return create_access_token(
        subject=str(user.id),
        role=str(user.role),
        email=str(user.email) if user.email else None,
    )


def test_evaluation_unauthenticated_returns_401(client: TestClient):
    """Verify GET /api/v1/analytics/evaluation rejects unauthenticated requests."""
    res = client.get("/api/v1/analytics/evaluation")
    assert res.status_code == 401


def test_jobs_unauthenticated_returns_401(client: TestClient):
    """Verify GET /api/v1/analytics/jobs rejects unauthenticated requests."""
    res = client.get("/api/v1/analytics/jobs")
    assert res.status_code == 401


def test_evaluation_endpoint_returns_200_and_valid_payload(
    client: TestClient, ml_engineer_token: str
):
    """Verify GET /api/v1/analytics/evaluation returns a well-formed report for ML_ENGINEER."""
    headers = {"Authorization": f"Bearer {ml_engineer_token}"}
    res = client.get("/api/v1/analytics/evaluation", headers=headers)
    assert res.status_code == 200

    data = res.json()
    assert "qwk_summary" in data
    assert "loss_curves" in data
    assert "job_counts" in data

    # No fabricated report: empty metrics until an evaluation run exists
    qwk = data["qwk_summary"]
    assert "average_qwk" in qwk
    assert qwk["target_qwk"] == 0.70
    assert isinstance(qwk["prompts"], list)
    assert qwk["evaluated_prompts_count"] == len(qwk["prompts"])

    # Verify loss curves only contain prompts with logged scalars
    loss_curves = data["loss_curves"]
    assert isinstance(loss_curves, dict)
    for pid_str, points in loss_curves.items():
        assert pid_str in [str(i) for i in range(1, 9)]
        assert len(points) > 0
        for pt in points:
            assert "step" in pt
            assert "train_loss" in pt

    # Verify job counts structure
    jc = data["job_counts"]
    assert "queued" in jc
    assert "processing" in jc
    assert "completed" in jc
    assert "failed" in jc
    assert "total" in jc
    assert jc["total"] >= 0


def test_evaluation_forbidden_for_viewer(client: TestClient, viewer_token: str):
    """Verify VIEWER cannot access the ML_ENGINEER-only evaluation report."""
    headers = {"Authorization": f"Bearer {viewer_token}"}
    res = client.get("/api/v1/analytics/evaluation", headers=headers)
    assert res.status_code == 403


def test_jobs_endpoint_returns_live_counts(
    client: TestClient, viewer_token: str, db_session: Session
):
    """Verify GET /api/v1/analytics/jobs returns live database counts."""
    headers = {"Authorization": f"Bearer {viewer_token}"}
    res = client.get("/api/v1/analytics/jobs", headers=headers)
    assert res.status_code == 200

    data = res.json()
    assert "queued" in data
    assert "processing" in data
    assert "completed" in data
    assert "failed" in data
    assert "total" in data
    assert (
        data["total"]
        == data["queued"] + data["processing"] + data["completed"] + data["failed"]
    )
