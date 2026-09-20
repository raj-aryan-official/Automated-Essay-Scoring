"""Centralized pytest configuration and fixtures for backend test suite.

Provides:
- In-memory SQLite test database with all schema tables created.
- Moto-mocked test MinIO / S3 storage bucket.
- Seeded test users and JWT authorization tokens across all four roles:
  TEACHER, ADMIN, VIEWER, ML_ENGINEER.
- Preconfigured FastAPI TestClient instances (authenticated as TEACHER by default,
  plus explicit unauthenticated and role-specific clients).
- Seeded prompts and active model fixtures.
"""

import sys
import uuid
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from moto import mock_aws
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

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
from app.services.storage import StorageService, get_storage_service


@pytest.fixture(scope="session")
def test_engine():
    """Create in-memory SQLite engine with StaticPool for thread-safe test isolation."""
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Create all required database tables
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
def db_session(test_engine) -> Generator[Session, None, None]:
    """Provide a transactional database session rolled back after each test."""
    TestingSession = sessionmaker(bind=test_engine, expire_on_commit=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_minio_bucket() -> Generator[StorageService, None, None]:
    """Provide a mock S3/MinIO bucket environment via moto."""
    with mock_aws():
        svc = StorageService(
            endpoint_url=None,  # Moto AWS default
            bucket_name="test-essay-documents",
            access_key="test-access-key",
            secret_key="test-secret-key",
            region_name="us-east-1",
        )
        svc.ensure_bucket_exists()
        yield svc


# ---------------------------------------------------------------------------
# Seeded Users & JWT Authentication Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def teacher_user(db_session: Session) -> User:
    """Create or retrieve a test TEACHER user."""
    user = db_session.query(User).filter(User.email == "test_teacher@aes.local").first()
    if not user:
        user = User(
            id=uuid.uuid4(),
            email="test_teacher@aes.local",
            password_hash="mock_hashed_pw",
            role="TEACHER",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session: Session) -> User:
    """Create or retrieve a test ADMIN user."""
    user = db_session.query(User).filter(User.email == "test_admin@aes.local").first()
    if not user:
        user = User(
            id=uuid.uuid4(),
            email="test_admin@aes.local",
            password_hash="mock_hashed_pw",
            role="ADMIN",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def viewer_user(db_session: Session) -> User:
    """Create or retrieve a test VIEWER user."""
    user = db_session.query(User).filter(User.email == "test_viewer@aes.local").first()
    if not user:
        user = User(
            id=uuid.uuid4(),
            email="test_viewer@aes.local",
            password_hash="mock_hashed_pw",
            role="VIEWER",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def ml_engineer_user(db_session: Session) -> User:
    """Create or retrieve a test ML_ENGINEER user."""
    user = db_session.query(User).filter(User.email == "test_engineer@aes.local").first()
    if not user:
        user = User(
            id=uuid.uuid4(),
            email="test_engineer@aes.local",
            password_hash="mock_hashed_pw",
            role="ML_ENGINEER",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def teacher_token(teacher_user: User) -> str:
    return create_access_token(subject=str(teacher_user.id), role=teacher_user.role, email=teacher_user.email)


@pytest.fixture
def admin_token(admin_user: User) -> str:
    return create_access_token(subject=str(admin_user.id), role=admin_user.role, email=admin_user.email)


@pytest.fixture
def viewer_token(viewer_user: User) -> str:
    return create_access_token(subject=str(viewer_user.id), role=viewer_user.role, email=viewer_user.email)


@pytest.fixture
def ml_engineer_token(ml_engineer_user: User) -> str:
    return create_access_token(subject=str(ml_engineer_user.id), role=ml_engineer_user.role, email=ml_engineer_user.email)


@pytest.fixture
def teacher_headers(teacher_token: str) -> dict:
    return {"Authorization": f"Bearer {teacher_token}"}


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def viewer_headers(viewer_token: str) -> dict:
    return {"Authorization": f"Bearer {viewer_token}"}


@pytest.fixture
def ml_engineer_headers(ml_engineer_token: str) -> dict:
    return {"Authorization": f"Bearer {ml_engineer_token}"}


# ---------------------------------------------------------------------------
# TestClient Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client(
    db_session: Session,
    test_minio_bucket: StorageService,
    teacher_headers: dict,
) -> Generator[TestClient, None, None]:
    """TestClient configured with in-memory DB, mock MinIO, and default TEACHER auth."""
    def _override_get_db():
        yield db_session

    def _override_get_storage():
        return test_minio_bucket

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_storage_service] = _override_get_storage

    test_client = TestClient(app, headers=teacher_headers)
    try:
        yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def unauth_client(
    db_session: Session,
    test_minio_bucket: StorageService,
) -> Generator[TestClient, None, None]:
    """TestClient with no Authorization header for unauthenticated security tests."""
    def _override_get_db():
        yield db_session

    def _override_get_storage():
        return test_minio_bucket

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_storage_service] = _override_get_storage

    test_client = TestClient(app)
    try:
        yield test_client
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Seeded Prompts & Models
# ---------------------------------------------------------------------------

@pytest.fixture
def seed_prompt(db_session: Session) -> Prompt:
    """Seed a standard ASAP Prompt 1 for testing."""
    existing = db_session.query(Prompt).filter(Prompt.asap_set_id == 1).first()
    if existing:
        return existing
    prompt = Prompt(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        asap_set_id=1,
        title="Prompt 1: Effects of Computers on Society (Persuasive)",
        rubric_min=2.0,
        rubric_max=12.0,
    )
    db_session.add(prompt)
    db_session.commit()
    db_session.refresh(prompt)
    return prompt


@pytest.fixture
def seed_model(db_session: Session, seed_prompt: Prompt) -> ModelEntity:
    """Seed an active ModelEntity record for testing."""
    existing = db_session.query(ModelEntity).filter(ModelEntity.status == "PRODUCTION").first()
    if existing:
        return existing
    model = ModelEntity(
        id=uuid.UUID("99999999-9999-9999-9999-999999999999"),
        name="bert-base-uncased-lora",
        version="v1.0.0-test",
        framework="PyTorch",
        architecture="bert-base-uncased",
        weights_storage_key="checkpoints/1/regression_head.pt",
        metrics={"target_qwk": 0.70, "qwk": 0.98},
        status="PRODUCTION",
    )
    db_session.add(model)
    db_session.commit()
    db_session.refresh(model)
    return model
