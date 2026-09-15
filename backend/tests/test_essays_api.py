"""Automated tests for essay submission and retrieval API endpoints.

Covers:
- POST /api/v1/essays (PASTE and DOCUMENT submissions, UUID assignment, status=SUBMITTED)
- GET /api/v1/essays (Pagination, status and prompt_id filtering)
- GET /api/v1/essays/{id} (Single essay retrieval, prompt title, presigned URL)
- Error cases (Prompt 404, empty paste 422, non-existent essay 404)
"""

import base64
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

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.api.deps import get_db
from app.main import app
from app.models.entities import Essay, Prompt, User
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
    """FastAPI TestClient with get_db and get_storage_service overridden for test isolation."""
    TestingSession = sessionmaker(bind=test_engine, expire_on_commit=False)

    def _override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    def _override_get_storage():
        svc = StorageService(endpoint_url=None)
        try:
            svc.ensure_bucket_exists()
        except Exception:
            pass
        return svc

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_storage_service] = _override_get_storage
    test_client = TestClient(app)
    try:
        yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def seed_prompt(db_session: Session) -> Prompt:
    """Seed a sample prompt for testing (idempotent)."""
    existing = db_session.query(Prompt).filter(Prompt.asap_set_id == 1).first()
    if existing:
        return existing
    prompt = Prompt(
        id=uuid.uuid4(),
        asap_set_id=1,
        title="Prompt 1: Effects of Computers on Society (Persuasive)",
        rubric_min=2.0,
        rubric_max=12.0,
    )
    db_session.add(prompt)
    db_session.commit()
    return prompt


@pytest.fixture
def seed_prompt_2(db_session: Session) -> Prompt:
    """Seed a secondary prompt for filtering tests (idempotent)."""
    existing = db_session.query(Prompt).filter(Prompt.asap_set_id == 2).first()
    if existing:
        return existing
    prompt = Prompt(
        id=uuid.uuid4(),
        asap_set_id=2,
        title="Prompt 2: Censorship in Libraries and Free Expression",
        rubric_min=1.0,
        rubric_max=6.0,
    )
    db_session.add(prompt)
    db_session.commit()
    return prompt


def test_create_essay_paste_success(client: TestClient, seed_prompt: Prompt, db_session: Session):
    """Verify POST /api/v1/essays accepts raw pasted text (source_type=PASTE), assigns a UUID,

    and persists the essay with status=SUBMITTED. Returns HTTP 201 with essay UUID.
    """
    payload = {
        "prompt_id": str(seed_prompt.id),
        "source_type": "PASTE",
        "raw_text": "Computers have dramatically altered communication, research, and daily workflow across the globe.",
    }

    response = client.post("/api/v1/essays", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert "id" in data
    assert uuid.UUID(data["id"])  # Valid UUID
    assert data["status"] == "SUBMITTED"
    assert data["source_type"] == "PASTE"
    assert data["prompt_id"] == str(seed_prompt.id)
    assert data["raw_text"] == payload["raw_text"]
    assert data["storage_bucket"] is None
    assert data["storage_key"] is None
    assert "created_at" in data

    # Verify persistence in database
    essay_in_db = db_session.query(Essay).filter(Essay.id == uuid.UUID(data["id"])).first()
    assert essay_in_db is not None
    assert essay_in_db.status == "SUBMITTED"
    assert essay_in_db.raw_text == payload["raw_text"]


def test_create_essay_paste_with_explicit_user(client: TestClient, seed_prompt: Prompt, db_session: Session):
    """Verify submitting with an explicit submitted_by UUID succeeds and links the user."""
    custom_user_id = uuid.uuid4()
    payload = {
        "prompt_id": str(seed_prompt.id),
        "source_type": "PASTE",
        "raw_text": "Essay content by specific student user.",
        "submitted_by": str(custom_user_id),
    }

    response = client.post("/api/v1/essays", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["submitted_by"] == str(custom_user_id)


def test_create_essay_document_multipart_upload(client: TestClient, seed_prompt: Prompt):
    """Verify POST /api/v1/essays accepts uploaded document via multipart/form-data, saves

    via StorageService, assigns a UUID, and persists with status=SUBMITTED.
    """
    with mock_aws():
        storage = StorageService(endpoint_url=None)
        storage.ensure_bucket_exists()

        file_bytes = b"Automated Essay Scoring Document Content. This document was uploaded as a file."
        file_name = "test_student_essay.txt"

        response = client.post(
            "/api/v1/essays",
            data={
                "prompt_id": str(seed_prompt.id),
                "source_type": "DOCUMENT",
            },
            files={
                "file": (file_name, file_bytes, "text/plain"),
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert uuid.UUID(data["id"])
        assert data["status"] == "SUBMITTED"
        assert data["source_type"] == "DOCUMENT"
        assert data["storage_bucket"] == storage.bucket_name
        assert data["storage_key"] is not None
        assert file_name in data["storage_key"]
        assert "Automated Essay Scoring" in data["raw_text"]

        # Confirm file was persisted in S3
        assert storage.file_exists(data["storage_key"]) is True
        downloaded = storage.download_file(data["storage_key"])
        assert downloaded == file_bytes


def test_create_essay_document_json_content(client: TestClient, seed_prompt: Prompt):
    """Verify POST /api/v1/essays accepts base64 or string document content in JSON."""
    with mock_aws():
        storage = StorageService(endpoint_url=None)
        storage.ensure_bucket_exists()

        doc_text = "Persuasive essay document body uploaded in base64 format."
        encoded = base64.b64encode(doc_text.encode("utf-8")).decode("utf-8")

        payload = {
            "prompt_id": str(seed_prompt.id),
            "source_type": "DOCUMENT",
            "file_content": encoded,
            "file_name": "encoded_essay.docx",
        }

        response = client.post("/api/v1/essays", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "SUBMITTED"
        assert data["source_type"] == "DOCUMENT"
        assert data["storage_key"] is not None
        assert "encoded_essay.docx" in data["storage_key"]


def test_create_essay_prompt_not_found(client: TestClient):
    """Verify HTTP 404 is returned when referencing a non-existent prompt_id."""
    missing_prompt_id = str(uuid.uuid4())
    payload = {
        "prompt_id": missing_prompt_id,
        "source_type": "PASTE",
        "raw_text": "Sample text for non-existent prompt.",
    }

    response = client.post("/api/v1/essays", json=payload)
    assert response.status_code == 404
    assert f"Prompt with id '{missing_prompt_id}' not found" in response.json()["detail"]


def test_create_essay_empty_paste_rejected(client: TestClient, seed_prompt: Prompt):
    """Verify empty or whitespace raw_text is rejected with HTTP 422 for PASTE source."""
    payload = {
        "prompt_id": str(seed_prompt.id),
        "source_type": "PASTE",
        "raw_text": "    ",
    }

    response = client.post("/api/v1/essays", json=payload)
    assert response.status_code == 422


def test_get_essays_list_and_filters(
    client: TestClient, seed_prompt: Prompt, seed_prompt_2: Prompt
):
    """Verify GET /api/v1/essays lists essays with pagination and prompt_id / status filters."""
    # Create essays for prompt 1
    for i in range(2):
        client.post(
            "/api/v1/essays",
            json={
                "prompt_id": str(seed_prompt.id),
                "source_type": "PASTE",
                "raw_text": f"Prompt 1 essay submission number {i+1}.",
            },
        )

    # Create essay for prompt 2
    client.post(
        "/api/v1/essays",
        json={
            "prompt_id": str(seed_prompt_2.id),
            "source_type": "PASTE",
            "raw_text": "Prompt 2 essay submission content.",
        },
    )

    # List all essays
    res_all = client.get("/api/v1/essays")
    assert res_all.status_code == 200
    all_items = res_all.json()
    assert isinstance(all_items, list)
    assert len(all_items) >= 3

    # Filter by prompt_id
    res_p1 = client.get(f"/api/v1/essays?prompt_id={seed_prompt.id}")
    assert res_p1.status_code == 200
    p1_items = res_p1.json()
    assert len(p1_items) >= 2
    for item in p1_items:
        assert item["prompt_id"] == str(seed_prompt.id)

    # Filter by status
    res_status = client.get("/api/v1/essays?status=SUBMITTED")
    assert res_status.status_code == 200
    for item in res_status.json():
        assert item["status"] == "SUBMITTED"

    # Pagination: limit & skip
    res_page = client.get("/api/v1/essays?limit=2&skip=1")
    assert res_page.status_code == 200
    assert len(res_page.json()) <= 2


def test_get_essay_by_id_success(client: TestClient, seed_prompt: Prompt):
    """Verify GET /api/v1/essays/{id} returns essay details and prompt information."""
    create_res = client.post(
        "/api/v1/essays",
        json={
            "prompt_id": str(seed_prompt.id),
            "source_type": "PASTE",
            "raw_text": "Detailed essay retrieval test content.",
        },
    )
    assert create_res.status_code == 201
    essay_id = create_res.json()["id"]

    get_res = client.get(f"/api/v1/essays/{essay_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["id"] == essay_id
    assert data["status"] == "SUBMITTED"
    assert data["raw_text"] == "Detailed essay retrieval test content."
    assert data["prompt_title"] == seed_prompt.title
    assert data["download_url"] is None


def test_get_essay_by_id_document_download_url(client: TestClient, seed_prompt: Prompt):
    """Verify GET /api/v1/essays/{id} returns presigned download URL for document submissions."""
    with mock_aws():
        storage = StorageService(endpoint_url=None)
        storage.ensure_bucket_exists()

        create_res = client.post(
            "/api/v1/essays",
            data={
                "prompt_id": str(seed_prompt.id),
                "source_type": "DOCUMENT",
            },
            files={
                "file": ("sample_essay.pdf", b"%PDF-1.4 sample binary content", "application/pdf"),
            },
        )
        assert create_res.status_code == 201
        essay_id = create_res.json()["id"]

        get_res = client.get(f"/api/v1/essays/{essay_id}")
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["id"] == essay_id
        assert data["download_url"] is not None
        assert "sample_essay.pdf" in data["download_url"]


def test_get_essay_by_id_not_found(client: TestClient):
    """Verify GET /api/v1/essays/{id} returns HTTP 404 for a non-existent UUID."""
    random_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/essays/{random_id}")
    assert response.status_code == 404
    assert f"Essay with id '{random_id}' not found" in response.json()["detail"]
