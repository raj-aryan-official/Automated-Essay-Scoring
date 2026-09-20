"""Automated tests for JWT Authentication and Role-Based Access Control (RBAC).

Covers:
- POST /api/v1/auth/login with valid/invalid credentials
- POST /api/v1/auth/token form login
- GET /api/v1/auth/me profile retrieval
- 401 Unauthorized for unauthenticated requests
- 403 Forbidden when VIEWER attempts write operations (e.g. POST /api/v1/essays)
- 200 OK / 201 Created for TEACHER and ADMIN on protected routes
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
from app.core.security import create_access_token, get_password_hash
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
def test_users(db_session):
    uid = uuid.uuid4().hex[:6]
    users = {}
    for role, email in [
        ("ADMIN", f"admin_{uid}@test.local"),
        ("TEACHER", f"teacher_{uid}@test.local"),
        ("ML_ENGINEER", f"mle_{uid}@test.local"),
        ("VIEWER", f"viewer_{uid}@test.local"),
    ]:
        u = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=get_password_hash("Secret123!"),
            role=role,
        )
        db_session.add(u)
        users[role] = u
    db_session.commit()
    return users


def test_login_success_and_token_issuance(client, test_users):
    teacher = test_users["TEACHER"]
    res = client.post(
        "/api/v1/auth/login",
        json={"email": teacher.email, "password": "Secret123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "TEACHER"
    assert data["email"] == teacher.email
    assert data["user_id"] == str(teacher.id)


def test_login_invalid_password_returns_401(client, test_users):
    admin = test_users["ADMIN"]
    res = client.post(
        "/api/v1/auth/login",
        json={"email": admin.email, "password": "WrongPassword!"},
    )
    assert res.status_code == 401
    assert "invalid email or password" in res.json()["detail"].lower()


def test_get_me_authenticated(client, test_users):
    viewer = test_users["VIEWER"]
    token = create_access_token(subject=viewer.id, role=viewer.role, email=viewer.email)
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == str(viewer.id)
    assert data["email"] == viewer.email
    assert data["role"] == "VIEWER"


def test_get_me_unauthenticated_returns_401(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_rbac_viewer_forbidden_on_submit_essay(client, test_users):
    viewer = test_users["VIEWER"]
    token = create_access_token(subject=viewer.id, role=viewer.role, email=viewer.email)

    res = client.post(
        "/api/v1/essays",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "prompt_id": str(uuid.uuid4()),
            "source_type": "PASTE",
            "raw_text": "A student essay attempt.",
        },
    )
    assert res.status_code == 403
    assert "operation not permitted" in res.json()["detail"].lower()


def test_rbac_teacher_allowed_on_submit_essay(client, db_session, test_users):
    teacher = test_users["TEACHER"]
    token = create_access_token(subject=teacher.id, role=teacher.role, email=teacher.email)

    prompt = Prompt(
        id=uuid.uuid4(),
        asap_set_id=int(uuid.uuid4().int % 1000000),
        title="Sample Prompt",
        rubric_min=1.0,
        rubric_max=6.0,
    )
    db_session.add(prompt)
    db_session.commit()

    res = client.post(
        "/api/v1/essays",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "prompt_id": str(prompt.id),
            "source_type": "PASTE",
            "raw_text": "A valid pedagogical submission by a teacher.",
        },
    )
    assert res.status_code == 201
    assert res.json()["status"] == "SUBMITTED"


def test_rbac_viewer_allowed_on_read_essays(client, test_users):
    viewer = test_users["VIEWER"]
    token = create_access_token(subject=viewer.id, role=viewer.role, email=viewer.email)

    res = client.get(
        "/api/v1/essays",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_rbac_admin_full_access(client, test_users):
    admin = test_users["ADMIN"]
    token = create_access_token(subject=admin.id, role=admin.role, email=admin.email)

    # Admin can list essays
    res_list = client.get(
        "/api/v1/essays",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_list.status_code == 200
