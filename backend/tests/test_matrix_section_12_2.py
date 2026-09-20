"""Section 12.2 Test Matrix Execution & Integration Test Suite.

Covers:
- TEST-004: Scoring execution end-to-end (submit -> dispatch -> worker execution ->
  score retrieval -> teacher override -> finalized status).
- Auth & RBAC Layer Integration across all 4 roles (VIEWER, TEACHER, ML_ENGINEER, ADMIN).
- Review & Override Flow Integration (validations, audit timestamps, state transitions).
"""

from datetime import datetime, timedelta, timezone
import sys
import uuid
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Ensure inference directory is accessible for worker functions
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
INFERENCE_DIR = REPO_ROOT / "inference"
if str(INFERENCE_DIR) not in sys.path:
    sys.path.insert(0, str(INFERENCE_DIR))

from app.core.security import create_access_token
from app.models.entities import DimensionFeedback, Essay, InferenceRun, Job, ModelEntity, Prompt, Score, User
from worker import poll_and_process_once


# ============================================================================
# Section 12.2 Test Matrix: TEST-004 Scoring Execution End-to-End
# ============================================================================

def test_test_004_scoring_execution_end_to_end(
    client: TestClient,
    db_session: Session,
    seed_prompt: Prompt,
    seed_model: ModelEntity,
    teacher_headers: dict,
    viewer_headers: dict,
):
    """TEST-004: Scoring Execution End-to-End.

    Scenario:
    1. Teacher submits an essay via POST /api/v1/essays -> returns 201, status SUBMITTED.
    2. Teacher dispatches scoring via POST /api/v1/essays/{id}/score -> returns 202, status QUEUED.
    3. Worker processes job -> status transitions: PROCESSING -> SCORED -> FEEDBACK_READY, job COMPLETED.
    4. Viewer/Teacher calls GET /api/v1/essays/{id}/score -> returns full nested payload:
       - calibrated holisticScore within rubric range [2.0, 12.0]
       - rubricBand string
       - confidence float in [0, 1]
       - dimensions array with all 3 dimensions (grammar, coherence, argumentation)
       - modelVersion
    5. Teacher submits human override via POST /api/v1/essays/{id}/review -> status transitions:
       UNDER_REVIEW -> FINALIZED, persists override score, reason, and timestamp.
    6. GET /api/v1/essays/{id}/score confirms reviewerOverrideScore, reviewerOverrideReason, reviewerOverrideAt.
    Priority: Must (High)
    """
    essay_text = (
        "The impact of computing technology on modern educational paradigms is profound and multi-faceted. "
        "Computers enable students to synthesize global academic materials, collaborate across institutional "
        "boundaries, and develop digital literacy skills vital for 21st-century problem solving. Although "
        "challenges such as digital distractions require intentional pedagogy, technology's academic benefits "
        "vastly outweigh its limitations when properly integrated into curriculum design."
    )

    # 1. Submit Essay as Teacher
    submit_res = client.post(
        "/api/v1/essays",
        json={
            "prompt_id": str(seed_prompt.id),
            "source_type": "PASTE",
            "raw_text": essay_text,
        },
        headers=teacher_headers,
    )
    assert submit_res.status_code == 201
    essay_data = submit_res.json()
    essay_id = essay_data["id"]
    assert essay_data["status"] == "SUBMITTED"

    # 2. Dispatch Scoring Job
    dispatch_res = client.post(
        f"/api/v1/essays/{essay_id}/score",
        headers=teacher_headers,
    )
    assert dispatch_res.status_code == 202
    dispatch_data = dispatch_res.json()
    job_id = dispatch_data["job_id"]
    assert dispatch_data["status"] == "QUEUED"

    # Verify essay state in DB is QUEUED
    db_essay = db_session.query(Essay).filter(Essay.id == uuid.UUID(essay_id)).first()
    assert db_essay is not None
    assert db_essay.status == "QUEUED"

    # 3. Simulate Worker Daemon Execution
    processed_job = poll_and_process_once(db_session)
    assert processed_job is not None
    assert str(processed_job.id) == job_id
    assert processed_job.status == "COMPLETED"

    # Refresh essay from DB
    db_session.refresh(db_essay)
    assert db_essay.status == "FEEDBACK_READY"

    # Verify database persistence: scores row and dimension feedback
    score_row = db_session.query(Score).filter(Score.essay_id == uuid.UUID(essay_id)).first()
    assert score_row is not None
    assert seed_prompt.rubric_min <= score_row.holistic_score <= seed_prompt.rubric_max
    assert 0.0 <= score_row.confidence <= 1.0
    assert score_row.rubric_band is not None

    feedback_rows = db_session.query(DimensionFeedback).filter(DimensionFeedback.score_id == score_row.id).all()
    assert len(feedback_rows) == 3
    dimensions_found = {f.dimension for f in feedback_rows}
    assert dimensions_found == {"grammar", "coherence", "argumentation"}

    # 4. Retrieve Score via GET /api/v1/essays/{id}/score (accessible by Viewer)
    score_res = client.get(
        f"/api/v1/essays/{essay_id}/score",
        headers=viewer_headers,
    )
    assert score_res.status_code == 200
    score_payload = score_res.json()

    assert score_payload["essayId"] == essay_id
    assert seed_prompt.rubric_min <= score_payload["holisticScore"] <= seed_prompt.rubric_max
    assert score_payload["rubricBand"] is not None
    assert 0.0 <= score_payload["confidence"] <= 1.0
    assert len(score_payload["dimensions"]) == 3
    assert score_payload["modelVersion"] is not None

    # Verify each dimension detail in payload
    for dim in score_payload["dimensions"]:
        assert dim["dimension"] in ("grammar", "coherence", "argumentation")
        assert "score" in dim
        assert "feedback" in dim
        assert len(dim["feedback"]) > 0

    # 5. Teacher applies human override via POST /api/v1/essays/{id}/review
    override_score = 11.0
    override_reason = "Superior analytical thesis and cohesive transitions justify top-tier score."
    review_res = client.post(
        f"/api/v1/essays/{essay_id}/review",
        json={
            "reviewer_override_score": override_score,
            "reviewer_override_reason": override_reason,
        },
        headers=teacher_headers,
    )
    assert review_res.status_code == 200
    review_data = review_res.json()

    assert review_data["reviewerOverrideScore"] == override_score
    assert review_data["reviewerOverrideReason"] == override_reason
    assert review_data["reviewerOverrideAt"] is not None

    # 6. Verify final essay status is FINALIZED
    db_session.refresh(db_essay)
    assert db_essay.status == "FINALIZED"

    essay_get_res = client.get(f"/api/v1/essays/{essay_id}", headers=viewer_headers)
    assert essay_get_res.status_code == 200
    assert essay_get_res.json()["status"] == "FINALIZED"


# ============================================================================
# Auth & RBAC Layer Integration Tests
# ============================================================================

def test_rbac_viewer_restricted_actions(
    client: TestClient,
    seed_prompt: Prompt,
    viewer_headers: dict,
):
    """Verify VIEWER role cannot perform mutating teacher/admin actions."""
    # Viewer cannot submit essay
    res_submit = client.post(
        "/api/v1/essays",
        json={"prompt_id": str(seed_prompt.id), "source_type": "PASTE", "raw_text": "Sample text for viewer test."},
        headers=viewer_headers,
    )
    assert res_submit.status_code == 403

    # Viewer cannot dispatch scoring
    random_id = str(uuid.uuid4())
    res_score = client.post(f"/api/v1/essays/{random_id}/score", headers=viewer_headers)
    assert res_score.status_code == 403

    # Viewer cannot submit review override
    res_review = client.post(
        f"/api/v1/essays/{random_id}/review",
        json={"reviewer_override_score": 10.0, "reviewer_override_reason": "Not allowed"},
        headers=viewer_headers,
    )
    assert res_review.status_code == 403


def test_rbac_viewer_allowed_read_actions(
    client: TestClient,
    viewer_headers: dict,
):
    """Verify VIEWER role can read essays, jobs, and analytics."""
    res_essays = client.get("/api/v1/essays", headers=viewer_headers)
    assert res_essays.status_code == 200

    res_analytics = client.get("/api/v1/analytics/evaluation", headers=viewer_headers)
    assert res_analytics.status_code == 200

    res_jobs = client.get("/api/v1/analytics/jobs", headers=viewer_headers)
    assert res_jobs.status_code == 200


def test_rbac_teacher_allowed_actions(
    client: TestClient,
    seed_prompt: Prompt,
    teacher_headers: dict,
):
    """Verify TEACHER role has submit and score dispatch permissions."""
    res = client.post(
        "/api/v1/essays",
        json={
            "prompt_id": str(seed_prompt.id),
            "source_type": "PASTE",
            "raw_text": "Teachers are authorized to submit essays and dispatch scoring pipelines.",
        },
        headers=teacher_headers,
    )
    assert res.status_code == 201
    essay_id = res.json()["id"]

    res_dispatch = client.post(f"/api/v1/essays/{essay_id}/score", headers=teacher_headers)
    assert res_dispatch.status_code == 202


def test_rbac_ml_engineer_permissions(
    client: TestClient,
    seed_prompt: Prompt,
    ml_engineer_headers: dict,
):
    """Verify ML_ENGINEER has model/analytics access but cannot submit essays."""
    # ML Engineer can read analytics
    res_eval = client.get("/api/v1/analytics/evaluation", headers=ml_engineer_headers)
    assert res_eval.status_code == 200

    # ML Engineer cannot submit essay
    res_submit = client.post(
        "/api/v1/essays",
        json={"prompt_id": str(seed_prompt.id), "source_type": "PASTE", "raw_text": "ML engineer essay text."},
        headers=ml_engineer_headers,
    )
    assert res_submit.status_code == 403


def test_rbac_admin_full_access(
    client: TestClient,
    seed_prompt: Prompt,
    admin_headers: dict,
):
    """Verify ADMIN role has unrestricted access across all endpoints."""
    # Admin can submit
    res_submit = client.post(
        "/api/v1/essays",
        json={"prompt_id": str(seed_prompt.id), "source_type": "PASTE", "raw_text": "Admin root access submission."},
        headers=admin_headers,
    )
    assert res_submit.status_code == 201

    # Admin can read analytics
    res_eval = client.get("/api/v1/analytics/evaluation", headers=admin_headers)
    assert res_eval.status_code == 200


def test_auth_token_validation_edge_cases(
    client: TestClient,
    teacher_user: User,
):
    """Verify token expiration and malformed token handling."""
    # Expired token
    expired_token = create_access_token(
        subject=str(teacher_user.id),
        role=teacher_user.role,
        expires_delta=timedelta(seconds=-10),
    )
    res_expired = client.get("/api/v1/essays", headers={"Authorization": f"Bearer {expired_token}"})
    assert res_expired.status_code == 401
    assert "expired" in res_expired.json()["detail"].lower()

    # Malformed token
    res_malformed = client.get("/api/v1/essays", headers={"Authorization": "Bearer not-a-valid-jwt-token"})
    assert res_malformed.status_code == 401

    # Invalid scheme
    res_scheme = client.get("/api/v1/essays", headers={"Authorization": f"Basic {expired_token}"})
    assert res_scheme.status_code == 401


# ============================================================================
# Review / Override Flow Integration Tests
# ============================================================================

def test_review_override_validations(
    client: TestClient,
    seed_prompt: Prompt,
    teacher_headers: dict,
):
    """Verify review endpoint input validation."""
    # Create essay
    res = client.post(
        "/api/v1/essays",
        json={"prompt_id": str(seed_prompt.id), "source_type": "PASTE", "raw_text": "Essay for validation testing."},
        headers=teacher_headers,
    )
    essay_id = res.json()["id"]

    # Reviewing unscored essay returns 400
    res_unscored = client.post(
        f"/api/v1/essays/{essay_id}/review",
        json={"reviewer_override_score": 10.0, "reviewer_override_reason": "Score adjusted."},
        headers=teacher_headers,
    )
    assert res_unscored.status_code == 400
    assert "not been scored yet" in res_unscored.json()["detail"].lower()

    # Empty reason rejected with 422
    res_empty_reason = client.post(
        f"/api/v1/essays/{essay_id}/review",
        json={"reviewer_override_score": 10.0, "reviewer_override_reason": ""},
        headers=teacher_headers,
    )
    assert res_empty_reason.status_code == 422

    # Non-existent essay returns 404
    non_existent = str(uuid.uuid4())
    res_404 = client.post(
        f"/api/v1/essays/{non_existent}/review",
        json={"reviewer_override_score": 10.0, "reviewer_override_reason": "Valid reason"},
        headers=teacher_headers,
    )
    assert res_404.status_code == 404
