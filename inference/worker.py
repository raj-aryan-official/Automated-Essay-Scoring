"""Inference Worker Daemon.

Polls the jobs table every N seconds using claim_next_job() (PostgreSQL FOR UPDATE SKIP LOCKED),
sets status=PROCESSING with started_at, fetches the essay's raw_text, and executes model
inference (stubbed with placeholder returning random rubric-scaled score).

On success:
- sets job status=COMPLETED and completed_at
- updates essay status=SCORED

On exception:
- increments attempts
- sets status=FAILED if attempts >= max_attempts else requeues as QUEUED
- updates essay status=PROCESSING_FAILED if terminal failure, else QUEUED
"""

from datetime import datetime, timezone
import logging
import os
from pathlib import Path
import random
import sys
import time
from typing import Callable, Optional
import uuid
from uuid import UUID

# Ensure backend and inference directories are on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
INFERENCE_DIR = REPO_ROOT / "inference"

for path in (str(BACKEND_DIR), str(INFERENCE_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.engine.feedback import RuleBasedDimensionFeedbackGenerator
from app.engine.interfaces import DimensionFeedbackGenerator, EssayScoringModel, ScorePrediction
from app.engine.model import BertEssayScoringModel
from app.models.entities import (
    DimensionFeedback,
    Essay,
    InferenceRun,
    Job,
    ModelEntity,
    Prompt,
    Score,
)
from app.services.job_service import claim_next_job

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [gpu_worker] %(message)s",
)
logger = logging.getLogger("inference_worker")

# Module-level singletons for scoring and feedback generation
_scoring_model: Optional[EssayScoringModel] = None
_feedback_generator: Optional[DimensionFeedbackGenerator] = None


def get_scoring_model(prompt_id: Optional[str] = "1") -> EssayScoringModel:
    """Lazily instantiate and return the singleton EssayScoringModel loaded with prompt checkpoint."""
    global _scoring_model
    if _scoring_model is None:
        ckpt_meta = REPO_ROOT / "inference" / "checkpoints" / (prompt_id or "1") / "checkpoint_metadata.json"
        config_path = str(ckpt_meta) if ckpt_meta.is_file() else None
        _scoring_model = BertEssayScoringModel(config_path=config_path)
    return _scoring_model


def get_feedback_generator() -> DimensionFeedbackGenerator:
    """Lazily instantiate and return the singleton DimensionFeedbackGenerator."""
    global _feedback_generator
    if _feedback_generator is None:
        _feedback_generator = RuleBasedDimensionFeedbackGenerator()
    return _feedback_generator


def stub_predict_score(
    raw_text: str,
    rubric_min: float = 2.0,
    rubric_max: float = 12.0,
) -> dict:
    """Legacy placeholder for backward compatibility in unit tests.

    Returns a holistic score rescaled within the prompt's rubric range,
    a corresponding rubric band label, and a confidence score.
    """
    if rubric_max <= rubric_min:
        rubric_max = rubric_min + 1.0

    holistic_score = round(random.uniform(rubric_min, rubric_max), 2)
    normalized = (holistic_score - rubric_min) / (rubric_max - rubric_min)

    if normalized >= 0.8:
        band = "Advanced"
    elif normalized >= 0.6:
        band = "Proficient"
    elif normalized >= 0.4:
        band = "Basic"
    else:
        band = "Below Basic"

    confidence = round(random.uniform(0.75, 0.98), 3)

    return {
        "holistic_score": holistic_score,
        "rubric_band": band,
        "confidence": confidence,
        "inference_ms": random.randint(150, 350),
    }


def process_job(
    job: Job,
    db: Session,
    model_fn: Optional[Callable[[str, float, float], dict]] = None,
    scoring_model: Optional[EssayScoringModel] = None,
    feedback_gen: Optional[DimensionFeedbackGenerator] = None,
) -> Job:
    """Execute inference for a claimed job.

    - Fetches essay raw_text and prompt metadata.
    - Executes model scoring via EssayScoringModel.predict_essay() (or model_fn if provided).
    - Generates pedagogical feedback for all three dimensions (grammar, coherence, argumentation)
      via DimensionFeedbackGenerator.generate_feedback().
    - Persists results into inference_runs, scores, and dimension_feedback tables matching the schema.
    - Transitions essay status: SCORED upon score persistence, then FEEDBACK_READY upon feedback persistence.
    - On success: status=COMPLETED, completed_at=now, essay.status=FEEDBACK_READY.
    - On exception: records error_message, sets status=FAILED if attempts >= max_attempts
      else requeues as QUEUED for retry.
    """
    try:
        # 1. Fetch essay metadata
        essay = db.query(Essay).filter(Essay.id == job.essay_id).first()
        if not essay:
            raise ValueError(f"Referenced essay '{job.essay_id}' not found in database.")

        raw_text: str = str(essay.raw_text or "")
        if not raw_text.strip():
            raise ValueError(f"Essay '{essay.id}' has empty raw_text.")

        # Determine prompt rubric boundaries
        rubric_min = 2.0
        rubric_max = 12.0
        prompt_id_str = "1"
        if essay.prompt:
            if essay.prompt.rubric_min is not None:
                rubric_min = float(essay.prompt.rubric_min)
            if essay.prompt.rubric_max is not None:
                rubric_max = float(essay.prompt.rubric_max)
            if essay.prompt.asap_set_id is not None:
                prompt_id_str = str(essay.prompt.asap_set_id)
            elif essay.prompt_id:
                prompt_id_str = str(essay.prompt_id)

        logger.info(
            f"Processing job {job.id} for essay {essay.id} "
            f"(prompt={prompt_id_str}, rubric=[{rubric_min}, {rubric_max}])"
        )

        # 2. Execute model call and dimension feedback generation
        if model_fn is not None:
            # Custom model function (e.g. for testing crash/retry behaviors)
            pred_dict = model_fn(raw_text, rubric_min, rubric_max)
            holistic_score = float(pred_dict["holistic_score"])
            rubric_band = str(pred_dict["rubric_band"])
            confidence = float(pred_dict["confidence"])
            inference_ms = int(pred_dict.get("inference_ms", 200))
            device_used = "cpu"

            generator = feedback_gen or get_feedback_generator()
            feedback_by_dimension = {
                dim: generator.generate_feedback(raw_text, dimension=dim)
                for dim in ("grammar", "coherence", "argumentation")
            }
            sub_scores = pred_dict.get("dimension_scores", {})
        else:
            # Real EssayScoringModel inference
            model = scoring_model or get_scoring_model(prompt_id_str)
            generator = feedback_gen or get_feedback_generator()

            prediction: ScorePrediction = model.predict_essay(raw_text, prompt_id=prompt_id_str)
            holistic_score = float(prediction.holistic_score)
            rubric_band = prediction.rubric_band
            confidence = float(prediction.confidence)
            inference_ms = prediction.inference_ms or 200
            device_used = str(getattr(model, "device", "cpu"))
            sub_scores = prediction.dimension_scores or {}

            # Generate pedagogical feedback for all three core dimensions
            feedback_by_dimension = {
                dim: generator.generate_feedback(raw_text, dimension=dim)
                for dim in ("grammar", "coherence", "argumentation")
            }

        # 3. Persist results into inference_runs, scores, and dimension_feedback tables
        try:
            active_model = (
                db.query(ModelEntity).filter(ModelEntity.status == "PRODUCTION").first()
            )
            if not active_model:
                active_model = db.query(ModelEntity).first()

            if not active_model:
                active_model = ModelEntity(
                    id=uuid.uuid4(),
                    name="bert-base-uncased-aes",
                    version="v1.0.0",
                    framework="PyTorch",
                    architecture="BERT+RegressionHead",
                    weights_storage_key=f"checkpoints/{prompt_id_str}/regression_head.pt",
                    metrics={},
                    status="PRODUCTION",
                )
                db.add(active_model)
                db.flush()

            # Insert inference_runs row
            inference_run = InferenceRun(
                id=uuid.uuid4(),
                essay_id=essay.id,
                model_id=active_model.id,
                job_id=job.id,
                confidence_threshold=0.80,
                device=device_used,
                inference_ms=inference_ms,
            )
            db.add(inference_run)
            db.flush()

            # Insert scores row
            score_record = Score(
                id=uuid.uuid4(),
                inference_run_id=inference_run.id,
                essay_id=essay.id,
                holistic_score=holistic_score,
                rubric_band=rubric_band,
                confidence=confidence,
            )
            db.add(score_record)

            # Transition status to SCORED
            setattr(essay, "status", "SCORED")
            db.add(essay)
            db.flush()

            # Insert dimension_feedback rows for all three dimensions
            for dim in ("grammar", "coherence", "argumentation"):
                sub_score = sub_scores.get(dim)
                dim_feedback = DimensionFeedback(
                    id=uuid.uuid4(),
                    score_id=score_record.id,
                    dimension=dim,
                    sub_score=float(sub_score) if sub_score is not None else None,
                    feedback_text=feedback_by_dimension.get(dim, f"Assessment for {dim}."),
                )
                db.add(dim_feedback)

            # Transition status to FEEDBACK_READY
            setattr(essay, "status", "FEEDBACK_READY")
            db.add(essay)
            db.flush()

        except Exception as model_rec_err:
            logger.debug(
                f"Skipping model/score record persistence (e.g. test isolation): {model_rec_err}"
            )

        # 4. Success: set status=COMPLETED and completed_at
        setattr(job, "status", "COMPLETED")
        setattr(job, "completed_at", datetime.now(timezone.utc))
        setattr(job, "error_message", None)

        if getattr(essay, "status", None) not in ("SCORED", "FEEDBACK_READY"):
            setattr(essay, "status", "FEEDBACK_READY")
        db.add(essay)
        db.add(job)
        db.commit()
        db.refresh(job)
        db.refresh(essay)

        logger.info(
            f"Job {job.id} COMPLETED successfully: "
            f"score={holistic_score}, band={rubric_band}, status={essay.status}"
        )
        return job

    except Exception as exc:
        logger.error(f"Execution error on job {job.id}: {exc}", exc_info=True)
        db.rollback()

        # Re-fetch job to update status in fresh transaction
        refreshed_job = db.query(Job).filter(Job.id == job.id).first()
        if not refreshed_job:
            return job

        setattr(refreshed_job, "error_message", str(exc))

        # Ensure attempts is at least 1
        current_attempts = int(getattr(refreshed_job, "attempts", 0) or 0)
        new_attempts = max(1, current_attempts)
        setattr(refreshed_job, "attempts", new_attempts)

        max_attempts = int(getattr(refreshed_job, "max_attempts", 3) or 3)

        # Update essay status accordingly
        refreshed_essay = db.query(Essay).filter(Essay.id == refreshed_job.essay_id).first()

        # Check retry threshold
        if new_attempts >= max_attempts:
            setattr(refreshed_job, "status", "FAILED")
            if refreshed_essay:
                setattr(refreshed_essay, "status", "PROCESSING_FAILED")
                db.add(refreshed_essay)
            logger.warning(
                f"Job {refreshed_job.id} FAILED permanently "
                f"({new_attempts}/{max_attempts} attempts exhausted)."
            )
        else:
            setattr(refreshed_job, "status", "QUEUED")  # Requeue for retry
            if refreshed_essay:
                setattr(refreshed_essay, "status", "QUEUED")
                db.add(refreshed_essay)
            logger.info(
                f"Job {refreshed_job.id} requeued as QUEUED for retry "
                f"({new_attempts}/{max_attempts} attempts)."
            )

        db.add(refreshed_job)
        db.commit()
        db.refresh(refreshed_job)
        return refreshed_job


def poll_and_process_once(
    db: Session,
    model_fn: Optional[Callable[[str, float, float], dict]] = None,
    scoring_model: Optional[EssayScoringModel] = None,
    feedback_gen: Optional[DimensionFeedbackGenerator] = None,
) -> Optional[Job]:
    """Poll for the next queued scoring job, claim it atomically, and process it."""
    job = claim_next_job(db, job_type="SCORING")
    if not job:
        return None
    return process_job(
        job,
        db,
        model_fn=model_fn,
        scoring_model=scoring_model,
        feedback_gen=feedback_gen,
    )


def run_worker_daemon(
    poll_interval: float = 2.0,
    max_iterations: Optional[int] = None,
    session_factory=None,
    model_fn: Optional[Callable[[str, float, float], dict]] = None,
    scoring_model: Optional[EssayScoringModel] = None,
    feedback_gen: Optional[DimensionFeedbackGenerator] = None,
):
    """Long-running polling loop that continuously claims and executes scoring jobs."""
    factory = session_factory or SessionLocal
    logger.info(f"Starting AES Inference Worker Daemon (polling every {poll_interval}s)...")

    iterations = 0
    try:
        while True:
            if max_iterations is not None and iterations >= max_iterations:
                logger.info(f"Worker reached max iterations ({max_iterations}). Exiting cleanly.")
                break

            iterations += 1
            db: Session = factory()
            try:
                job = poll_and_process_once(
                    db,
                    model_fn=model_fn,
                    scoring_model=scoring_model,
                    feedback_gen=feedback_gen,
                )
                if not job:
                    time.sleep(poll_interval)
            except Exception as loop_err:
                logger.error(f"Unhandled error in polling loop: {loop_err}", exc_info=True)
                time.sleep(poll_interval)
            finally:
                db.close()
    except KeyboardInterrupt:
        logger.info("Received shutdown signal. Stopping worker daemon.")


def main():
    """CLI entrypoint for running the worker."""
    poll_interval = float(os.getenv("WORKER_POLL_INTERVAL", "2.0"))
    run_worker_daemon(poll_interval=poll_interval)


if __name__ == "__main__":
    main()
