"""Initial database schema migration.

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-14 13:20:00.000000

Exact implementation of Section 7.2 Database Schema:
- users, prompts, essays, models, jobs, inference_runs, scores, dimension_feedback
- Check constraints and foreign keys with cascading deletes
- Indexes: idx_essays_status, idx_jobs_processing, idx_scores_lookup
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable UUID extension
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

    # 1. users table
    op.create_table(
        "users",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("email", sa.String(length=320), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "role IN ('ADMIN','TEACHER','ML_ENGINEER','VIEWER')",
            name="chk_users_role",
        ),
    )

    # 2. prompts table
    op.create_table(
        "prompts",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("asap_set_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("rubric_min", sa.Float(), nullable=False),
        sa.Column("rubric_max", sa.Float(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    # 3. essays table
    op.create_table(
        "essays",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("submitted_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("prompt_id", UUID(as_uuid=True), sa.ForeignKey("prompts.id"), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("source_type", sa.String(length=16), nullable=False),
        sa.Column("storage_bucket", sa.String(length=255), nullable=True),
        sa.Column("storage_key", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default=sa.text("'SUBMITTED'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "source_type IN ('PASTE','DOCUMENT')",
            name="chk_essays_source_type",
        ),
        sa.CheckConstraint(
            "status IN ('DRAFT','SUBMITTED','QUEUED','PROCESSING','SCORED',"
            "'FEEDBACK_READY','UNDER_REVIEW','FINALIZED','PROCESSING_FAILED')",
            name="chk_essays_status",
        ),
    )
    op.create_index("idx_essays_status", "essays", ["status"])

    # 4. models table
    op.create_table(
        "models",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("version", sa.String(length=100), nullable=False, unique=True),
        sa.Column("framework", sa.String(length=100), nullable=False),
        sa.Column("architecture", sa.String(length=255), nullable=False),
        sa.Column("weights_storage_key", sa.Text(), nullable=False),
        sa.Column(
            "metrics",
            JSONB,
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('TRAINING','STAGING','PRODUCTION')",
            name="chk_models_status",
        ),
    )

    # 5. jobs table
    op.create_table(
        "jobs",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "essay_id",
            UUID(as_uuid=True),
            sa.ForeignKey("essays.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("job_type", sa.String(length=32), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default=sa.text("'QUEUED'"),
            nullable=False,
        ),
        sa.Column("priority", sa.Integer(), server_default=sa.text("100"), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("max_attempts", sa.Integer(), server_default=sa.text("3"), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "queued_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "job_type IN ('SCORING','FEEDBACK')",
            name="chk_jobs_job_type",
        ),
        sa.CheckConstraint(
            "status IN ('QUEUED','PROCESSING','COMPLETED','FAILED')",
            name="chk_jobs_status",
        ),
    )
    op.create_index("idx_jobs_processing", "jobs", ["status", "priority", "queued_at"])

    # 6. inference_runs table
    op.create_table(
        "inference_runs",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "essay_id",
            UUID(as_uuid=True),
            sa.ForeignKey("essays.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("model_id", UUID(as_uuid=True), sa.ForeignKey("models.id"), nullable=False),
        sa.Column("job_id", UUID(as_uuid=True), sa.ForeignKey("jobs.id"), nullable=True),
        sa.Column("confidence_threshold", sa.Float(), nullable=False),
        sa.Column("device", sa.String(length=32), nullable=False),
        sa.Column("inference_ms", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    # 7. scores table
    op.create_table(
        "scores",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "inference_run_id",
            UUID(as_uuid=True),
            sa.ForeignKey("inference_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "essay_id",
            UUID(as_uuid=True),
            sa.ForeignKey("essays.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("holistic_score", sa.Float(), nullable=False),
        sa.Column("rubric_band", sa.String(length=32), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("reviewer_override_score", sa.Float(), nullable=True),
        sa.Column("reviewer_override_reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "confidence >= 0.0 AND confidence <= 1.0",
            name="chk_scores_confidence",
        ),
    )
    op.create_index("idx_scores_lookup", "scores", ["essay_id"])

    # 8. dimension_feedback table
    op.create_table(
        "dimension_feedback",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "score_id",
            UUID(as_uuid=True),
            sa.ForeignKey("scores.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("dimension", sa.String(length=32), nullable=False),
        sa.Column("sub_score", sa.Float(), nullable=True),
        sa.Column("feedback_text", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "dimension IN ('grammar','coherence','argumentation')",
            name="chk_dimension_feedback_dimension",
        ),
    )


def downgrade() -> None:
    op.drop_table("dimension_feedback")
    op.drop_index("idx_scores_lookup", table_name="scores")
    op.drop_table("scores")
    op.drop_table("inference_runs")
    op.drop_index("idx_jobs_processing", table_name="jobs")
    op.drop_table("jobs")
    op.drop_table("models")
    op.drop_index("idx_essays_status", table_name="essays")
    op.drop_table("essays")
    op.drop_table("prompts")
    op.drop_table("users")
