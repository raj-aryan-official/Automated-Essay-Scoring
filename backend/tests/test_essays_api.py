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


def test_create_essay_document_multipart_upload(
    client: TestClient, seed_prompt: Prompt, test_minio_bucket: StorageService
):
    """Verify POST /api/v1/essays accepts uploaded document via multipart/form-data, saves
    via StorageService, assigns a UUID, and persists with status=SUBMITTED.
    """
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
    assert data["storage_bucket"] in (test_minio_bucket.bucket_name, "test-essay-documents")
    assert data["storage_key"] is not None
    assert file_name in data["storage_key"]
    assert "Automated Essay Scoring" in data["raw_text"]

    # Confirm file was persisted in S3
    assert test_minio_bucket.file_exists(data["storage_key"]) is True
    downloaded = test_minio_bucket.download_file(data["storage_key"])
    assert downloaded == file_bytes


def test_create_essay_document_json_content(
    client: TestClient, seed_prompt: Prompt, test_minio_bucket: StorageService
):
    """Verify POST /api/v1/essays accepts base64 or string document content in JSON."""
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
    assert test_minio_bucket.file_exists(data["storage_key"]) is True


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


# ---------------------------------------------------------------------------
# Project Test Matrix Cases: TEST-001, TEST-002, TEST-003, TEST-006 & Validation
# ---------------------------------------------------------------------------


def test_test_001_valid_essay_submission(client: TestClient, seed_prompt: Prompt):
    """TEST-001: Valid Essay Submission.

    Input Vector: Plain-text essay
    Expected Output: HTTP 201 Created + UUID
    Priority: High
    """
    essay_text = (
        "Modern digital computing has fundamentally revolutionized education, access to "
        "scholarly knowledge, and interactive pedagogy across global classroom environments. "
        "Through computer-assisted instruction, students synthesize complex curricula more rapidly."
    )
    payload = {
        "prompt_id": str(seed_prompt.id),
        "source_type": "PASTE",
        "raw_text": essay_text,
    }

    response = client.post("/api/v1/essays", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert uuid.UUID(data["id"])
    assert data["status"] == "SUBMITTED"
    assert data["prompt_id"] == str(seed_prompt.id)
    assert data["raw_text"] == essay_text


def test_test_002_oversized_essay_rejected(client: TestClient, seed_prompt: Prompt):
    """TEST-002: Oversized Essay.

    Input Vector: > 8,000-char essay
    Expected Output: HTTP 413 Payload Too Large
    Priority: High
    """
    # Create an essay text strictly exceeding 8,000 characters
    oversized_text = "Computers in modern education. " * 300
    assert len(oversized_text) > 8000

    payload = {
        "prompt_id": str(seed_prompt.id),
        "source_type": "PASTE",
        "raw_text": oversized_text,
    }

    response = client.post("/api/v1/essays", json=payload)
    assert response.status_code == 413
    assert "8,000" in response.json()["detail"] or "maximum" in response.json()["detail"].lower()


def test_test_003_empty_submission_rejected(client: TestClient, seed_prompt: Prompt):
    """TEST-003: Empty Submission.

    Input Vector: Blank text field
    Expected Output: HTTP 422 Validation Failure
    Priority: High
    """
    payload = {
        "prompt_id": str(seed_prompt.id),
        "source_type": "PASTE",
        "raw_text": "   \n\t   ",
    }

    response = client.post("/api/v1/essays", json=payload)
    assert response.status_code == 422


def test_test_006_unscored_edge_case_unsupported_prompt_id(client: TestClient):
    """TEST-006: Unscored Edge Case.

    Input Vector: Essay in unsupported prompt ID
    Expected Output: HTTP 404, no job dispatched
    Priority: Medium
    """
    unsupported_prompt_id = str(uuid.uuid4())
    payload = {
        "prompt_id": unsupported_prompt_id,
        "source_type": "PASTE",
        "raw_text": "This essay addresses a non-existent or unsupported prompt ID reference.",
    }

    response = client.post("/api/v1/essays", json=payload)
    assert response.status_code == 404
    assert f"Prompt with id '{unsupported_prompt_id}' not found" in response.json()["detail"]


def test_near_empty_essay_rejected(client: TestClient, seed_prompt: Prompt):
    """Verify near-empty essay text (< 10 characters or < 2 words) is rejected with HTTP 422."""
    for text in ["Too short", "a", "word", "   hi   "]:
        payload = {
            "prompt_id": str(seed_prompt.id),
            "source_type": "PASTE",
            "raw_text": text,
        }
        response = client.post("/api/v1/essays", json=payload)
        assert response.status_code == 422


def test_document_oversized_rejected(client: TestClient, seed_prompt: Prompt):
    """Verify uploaded documents exceeding 20MB are rejected with HTTP 413."""
    # 20MB + 100 bytes
    oversized_bytes = b"0" * (20 * 1024 * 1024 + 100)
    response = client.post(
        "/api/v1/essays",
        data={
            "prompt_id": str(seed_prompt.id),
            "source_type": "DOCUMENT",
        },
        files={
            "file": ("huge_essay.pdf", oversized_bytes, "application/pdf"),
        },
    )
    assert response.status_code == 413
    assert "20MB" in response.json()["detail"] or "maximum" in response.json()["detail"].lower()


def test_document_disallowed_mime_type_rejected(client: TestClient, seed_prompt: Prompt):
    """Verify documents with disallowed MIME types are rejected with HTTP 415."""
    disallowed_files = [
        ("malicious.sh", b"#!/bin/bash\necho bad", "application/x-sh"),
        ("image.png", b"\x89PNG\r\n\x1a\nfakeimage", "image/png"),
        ("archive.zip", b"PK\x03\x04fakezip", "application/zip"),
    ]
    for filename, content, mime in disallowed_files:
        response = client.post(
            "/api/v1/essays",
            data={
                "prompt_id": str(seed_prompt.id),
                "source_type": "DOCUMENT",
            },
            files={
                "file": (filename, content, mime),
            },
        )
        assert response.status_code == 415
        assert "Disallowed" in response.json()["detail"]


def test_document_disallowed_extension_in_json_rejected(client: TestClient, seed_prompt: Prompt):
    """Verify document submissions via JSON with disallowed extension are rejected with HTTP 415."""
    payload = {
        "prompt_id": str(seed_prompt.id),
        "source_type": "DOCUMENT",
        "file_content": "VGhpcyBpcyBhIHRlc3QgZG9jdW1lbnQu",
        "file_name": "malicious_script.exe",
    }
    response = client.post("/api/v1/essays", json=payload)
    assert response.status_code == 415
    assert "Disallowed" in response.json()["detail"]


# ---------------------------------------------------------------------------
# GET /api/v1/essays/{id}/score (Section 8.2) Tests
# ---------------------------------------------------------------------------


def test_get_essay_score_success(client: TestClient, seed_prompt: Prompt, db_session: Session):
    """Verify GET /api/v1/essays/{id}/score returns full nested payload (Section 8.2).

    Expected fields: holisticScore, rubricBand, confidence, dimensions[], modelVersion.
    """
    # 1. Create essay
    create_res = client.post(
        "/api/v1/essays",
        json={
            "prompt_id": str(seed_prompt.id),
            "source_type": "PASTE",
            "raw_text": "Evaluating computers in classroom pedagogy with clear thesis and evidence.",
        },
    )
    assert create_res.status_code == 201
    essay_id = uuid.UUID(create_res.json()["id"])

    # 2. Seed model entity, inference run, score, and dimension feedback
    model_entity = ModelEntity(
        id=uuid.uuid4(),
        name="bert-base-uncased-aes",
        version="v1.0.0",
        framework="PyTorch",
        architecture="BERT+RegressionHead",
        weights_storage_key="checkpoints/bert_aes_v1.pt",
        metrics={},
        status="PRODUCTION",
    )
    db_session.add(model_entity)
    db_session.flush()

    inference_run = InferenceRun(
        id=uuid.uuid4(),
        essay_id=essay_id,
        model_id=model_entity.id,
        confidence_threshold=0.80,
        device="cpu",
        inference_ms=185,
    )
    db_session.add(inference_run)
    db_session.flush()

    score = Score(
        id=uuid.uuid4(),
        inference_run_id=inference_run.id,
        essay_id=essay_id,
        holistic_score=9.5,
        rubric_band="Proficient",
        confidence=0.89,
    )
    db_session.add(score)
    db_session.flush()

    df_grammar = DimensionFeedback(
        id=uuid.uuid4(),
        score_id=score.id,
        dimension="grammar",
        sub_score=4.5,
        feedback_text="Strong syntactic control and correct capitalization throughout.",
    )
    df_coherence = DimensionFeedback(
        id=uuid.uuid4(),
        score_id=score.id,
        dimension="coherence",
        sub_score=4.8,
        feedback_text="Fluid transitions and cohesive discourse markers across paragraphs.",
    )
    df_argumentation = DimensionFeedback(
        id=uuid.uuid4(),
        score_id=score.id,
        dimension="argumentation",
        sub_score=4.2,
        feedback_text="Clear claims supported by relevant evidence and reasoning.",
    )
    db_session.add_all([df_grammar, df_coherence, df_argumentation])

    # Mark essay as SCORED
    essay = db_session.query(Essay).filter(Essay.id == essay_id).first()
    assert essay is not None
    setattr(essay, "status", "SCORED")
    db_session.add(essay)
    db_session.commit()

    # 3. Query GET /api/v1/essays/{id}/score
    response = client.get(f"/api/v1/essays/{essay_id}/score")
    assert response.status_code == 200

    data = response.json()
    assert data["essayId"] == str(essay_id)
    assert data["holisticScore"] == 9.5
    assert data["rubricBand"] == "Proficient"
    assert data["confidence"] == 0.89
    assert data["modelVersion"] == "v1.0.0"

    # Verify dimensions array
    dimensions = data["dimensions"]
    assert isinstance(dimensions, list)
    assert len(dimensions) == 3

    dim_map = {d["dimension"]: d for d in dimensions}
    assert set(dim_map.keys()) == {"grammar", "coherence", "argumentation"}

    assert dim_map["grammar"]["score"] == 4.5
    assert dim_map["grammar"]["subScore"] == 4.5
    assert "syntactic control" in dim_map["grammar"]["feedback"]
    assert "syntactic control" in dim_map["grammar"]["feedbackText"]

    assert dim_map["coherence"]["score"] == 4.8
    assert "Fluid transitions" in dim_map["coherence"]["feedback"]

    assert dim_map["argumentation"]["score"] == 4.2
    assert "Clear claims" in dim_map["argumentation"]["feedback"]


def test_get_essay_score_not_found(client: TestClient):
    """Verify GET /api/v1/essays/{id}/score returns HTTP 404 for a non-existent essay."""
    random_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/essays/{random_id}/score")
    assert response.status_code == 404
    assert f"Essay with id '{random_id}' not found" in response.json()["detail"]


def test_get_essay_score_not_scored_yet(client: TestClient, seed_prompt: Prompt):
    """Verify GET /api/v1/essays/{id}/score returns HTTP 404 when the essay has not been scored yet."""
    create_res = client.post(
        "/api/v1/essays",
        json={
            "prompt_id": str(seed_prompt.id),
            "source_type": "PASTE",
            "raw_text": "Submitted essay that is still awaiting processing by the scoring worker.",
        },
    )
    assert create_res.status_code == 201
    essay_id = create_res.json()["id"]

    response = client.get(f"/api/v1/essays/{essay_id}/score")
    assert response.status_code == 404
    assert f"Score for essay '{essay_id}' not found" in response.json()["detail"]
    assert "SUBMITTED" in response.json()["detail"]


