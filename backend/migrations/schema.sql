-- Automated Essay Scoring (AES) Database Schema
-- Matches Section 7.2 Database Schema (PostgreSQL DDL)

-- WHY: Enables PostgreSQL native v4 UUID generation to prevent sequential enumeration attacks
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- WHY: Stores user credentials and RBAC roles (ADMIN, TEACHER, ML_ENGINEER, VIEWER) for JWT authorization
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN','TEACHER','ML_ENGINEER','VIEWER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WHY: Stores immutable ASAP prompt definitions and score bounds (rubric_min, rubric_max) for neural score calibration
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asap_set_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  rubric_min REAL NOT NULL,
  rubric_max REAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WHY: Stores student submissions, source types (PASTE/DOCUMENT), S3 keys, and an 8-stage state machine
CREATE TABLE IF NOT EXISTS essays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_by UUID NOT NULL REFERENCES users(id),
  prompt_id UUID NOT NULL REFERENCES prompts(id),
  raw_text TEXT NOT NULL,
  source_type VARCHAR(16) NOT NULL CHECK (source_type IN ('PASTE','DOCUMENT')),
  storage_bucket VARCHAR(255),
  storage_key TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('DRAFT','SUBMITTED','QUEUED','PROCESSING','SCORED',
                       'FEEDBACK_READY','UNDER_REVIEW','FINALIZED','PROCESSING_FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WHY: Model registry tracking active deep learning checkpoints, ONNX weight locations, architecture, and validation metrics
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  version VARCHAR(100) NOT NULL UNIQUE,
  framework VARCHAR(100) NOT NULL,
  architecture VARCHAR(255) NOT NULL,
  weights_storage_key TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL CHECK (status IN ('TRAINING','STAGING','PRODUCTION')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WHY: Distributed job queue table supporting atomic FOR UPDATE SKIP LOCKED claiming, priority dispatch, and crash retries
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  job_type VARCHAR(32) NOT NULL CHECK (job_type IN ('SCORING','FEEDBACK')),
  status VARCHAR(32) NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED','PROCESSING','COMPLETED','FAILED')),
  priority INTEGER NOT NULL DEFAULT 100,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- WHY: Auditing entity capturing runtime telemetry (inference execution device, latency in ms, confidence threshold) for SLA monitoring
CREATE TABLE IF NOT EXISTS inference_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id),
  job_id UUID REFERENCES jobs(id),
  confidence_threshold REAL NOT NULL,
  device VARCHAR(32) NOT NULL,
  inference_ms BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WHY: Stores rubric-calibrated holistic score, rubric band, confidence, and teacher override adjustments
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inference_run_id UUID NOT NULL REFERENCES inference_runs(id) ON DELETE CASCADE,
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  holistic_score REAL NOT NULL,
  rubric_band VARCHAR(32) NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  reviewer_override_score REAL,
  reviewer_override_reason TEXT,
  reviewer_override_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WHY: Stores granular pedagogical feedback across Grammar, Coherence, and Argumentation with severity rankings for student revision
CREATE TABLE IF NOT EXISTS dimension_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score_id UUID NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
  dimension VARCHAR(32) NOT NULL CHECK (dimension IN ('grammar','coherence','argumentation')),
  sub_score REAL,
  feedback_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WHY: Index on status accelerates teacher dashboard filtering and worker queue status queries
CREATE INDEX IF NOT EXISTS idx_essays_status ON essays(status);
-- WHY: Composite index matches worker polling query (status, priority, queued_at) to avoid table scans during SKIP LOCKED
CREATE INDEX IF NOT EXISTS idx_jobs_processing ON jobs(status, priority, queued_at);
-- WHY: Fast lookup index for retrieving calculated scores when rendering the split-screen ScoreWorkspace UI
CREATE INDEX IF NOT EXISTS idx_scores_lookup ON scores(essay_id);
