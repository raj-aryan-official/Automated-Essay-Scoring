"""SQLAlchemy Database Models for Automated Essay Scoring (AES).

Exact mapping to Section 7.2 Database Schema:
- users
- prompts
- essays
- models
- jobs
- inference_runs
- scores
- dimension_feedback
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import relationship

from app.core.database import Base


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    """Render JSONB as JSON for SQLite compatibility in unit tests."""
    return "JSON"


@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    """Render PostgreSQL UUID as CHAR(36) for SQLite compatibility."""
    return "CHAR(36)"



class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    email = Column(String(320), nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    role = Column(String(32), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "role IN ('ADMIN','TEACHER','ML_ENGINEER','VIEWER')",
            name="chk_users_role",
        ),
    )

    # Relationships
    essays = relationship("Essay", back_populates="submitter", cascade="all, delete-orphan")


class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    asap_set_id = Column(Integer, nullable=False, unique=True)
    title = Column(Text, nullable=False)
    rubric_min = Column(Float, nullable=False)  # REAL in PostgreSQL
    rubric_max = Column(Float, nullable=False)  # REAL in PostgreSQL
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    essays = relationship("Essay", back_populates="prompt")


class Essay(Base):
    __tablename__ = "essays"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    submitted_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    prompt_id = Column(
        UUID(as_uuid=True),
        ForeignKey("prompts.id"),
        nullable=False,
    )
    raw_text = Column(Text, nullable=False)
    source_type = Column(String(16), nullable=False)
    storage_bucket = Column(String(255), nullable=True)
    storage_key = Column(Text, nullable=True)
    status = Column(
        String(32),
        nullable=False,
        default="SUBMITTED",
        server_default=text("'SUBMITTED'"),
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "source_type IN ('PASTE','DOCUMENT')",
            name="chk_essays_source_type",
        ),
        CheckConstraint(
            "status IN ('DRAFT','SUBMITTED','QUEUED','PROCESSING','SCORED',"
            "'FEEDBACK_READY','UNDER_REVIEW','FINALIZED','PROCESSING_FAILED')",
            name="chk_essays_status",
        ),
        Index("idx_essays_status", "status"),
    )

    # Relationships
    submitter = relationship("User", back_populates="essays")
    prompt = relationship("Prompt", back_populates="essays")
    jobs = relationship("Job", back_populates="essay", cascade="all, delete-orphan")
    inference_runs = relationship("InferenceRun", back_populates="essay", cascade="all, delete-orphan")
    scores = relationship("Score", back_populates="essay", cascade="all, delete-orphan")


class ModelEntity(Base):
    __tablename__ = "models"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    name = Column(String(255), nullable=False)
    version = Column(String(100), nullable=False, unique=True)
    framework = Column(String(100), nullable=False)
    architecture = Column(String(255), nullable=False)
    weights_storage_key = Column(Text, nullable=False)
    metrics = Column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'"),
    )
    status = Column(String(32), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('TRAINING','STAGING','PRODUCTION')",
            name="chk_models_status",
        ),
    )

    # Relationships
    inference_runs = relationship("InferenceRun", back_populates="model")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    essay_id = Column(
        UUID(as_uuid=True),
        ForeignKey("essays.id", ondelete="CASCADE"),
        nullable=False,
    )
    job_type = Column(String(32), nullable=False)
    status = Column(
        String(32),
        nullable=False,
        default="QUEUED",
        server_default=text("'QUEUED'"),
    )
    priority = Column(Integer, nullable=False, default=100, server_default=text("100"))
    attempts = Column(Integer, nullable=False, default=0, server_default=text("0"))
    max_attempts = Column(Integer, nullable=False, default=3, server_default=text("3"))
    error_message = Column(Text, nullable=True)
    queued_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "job_type IN ('SCORING','FEEDBACK')",
            name="chk_jobs_job_type",
        ),
        CheckConstraint(
            "status IN ('QUEUED','PROCESSING','COMPLETED','FAILED')",
            name="chk_jobs_status",
        ),
        Index("idx_jobs_processing", "status", "priority", "queued_at"),
    )

    # Relationships
    essay = relationship("Essay", back_populates="jobs")
    inference_runs = relationship("InferenceRun", back_populates="job")


class InferenceRun(Base):
    __tablename__ = "inference_runs"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    essay_id = Column(
        UUID(as_uuid=True),
        ForeignKey("essays.id", ondelete="CASCADE"),
        nullable=False,
    )
    model_id = Column(
        UUID(as_uuid=True),
        ForeignKey("models.id"),
        nullable=False,
    )
    job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id"),
        nullable=True,
    )
    confidence_threshold = Column(Float, nullable=False)  # REAL
    device = Column(String(32), nullable=False)
    inference_ms = Column(BigInteger, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    essay = relationship("Essay", back_populates="inference_runs")
    model = relationship("ModelEntity", back_populates="inference_runs")
    job = relationship("Job", back_populates="inference_runs")
    scores = relationship("Score", back_populates="inference_run", cascade="all, delete-orphan")


class Score(Base):
    __tablename__ = "scores"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    inference_run_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inference_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    essay_id = Column(
        UUID(as_uuid=True),
        ForeignKey("essays.id", ondelete="CASCADE"),
        nullable=False,
    )
    holistic_score = Column(Float, nullable=False)  # REAL
    rubric_band = Column(String(32), nullable=False)
    confidence = Column(Float, nullable=False)      # REAL
    reviewer_override_score = Column(Float, nullable=True)  # REAL
    reviewer_override_reason = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "confidence >= 0.0 AND confidence <= 1.0",
            name="chk_scores_confidence",
        ),
        Index("idx_scores_lookup", "essay_id"),
    )

    # Relationships
    inference_run = relationship("InferenceRun", back_populates="scores")
    essay = relationship("Essay", back_populates="scores")
    dimension_feedbacks = relationship(
        "DimensionFeedback",
        back_populates="score",
        cascade="all, delete-orphan",
    )


class DimensionFeedback(Base):
    __tablename__ = "dimension_feedback"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    score_id = Column(
        UUID(as_uuid=True),
        ForeignKey("scores.id", ondelete="CASCADE"),
        nullable=False,
    )
    dimension = Column(String(32), nullable=False)
    sub_score = Column(Float, nullable=True)  # REAL
    feedback_text = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "dimension IN ('grammar','coherence','argumentation')",
            name="chk_dimension_feedback_dimension",
        ),
    )

    # Relationships
    score = relationship("Score", back_populates="dimension_feedbacks")
