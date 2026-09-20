"""Pydantic schemas for Model Evaluation & Analytics.

Matches Section 12.1 QWK evaluation report, training loss curves,
and live job queue aggregations.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PromptQwkResult(BaseModel):
    """Evaluation result for an individual ASAP essay prompt."""

    prompt_id: int = Field(..., description="ASAP prompt ID (1..8)")
    qwk: float = Field(..., description="Achieved Quadratic Weighted Kappa")
    target_qwk: float = Field(default=0.70, description="Target QWK threshold")
    passed: bool = Field(..., description="Whether achieved QWK meets or exceeds target")
    genre: str = Field(..., description="Prompt essay genre (persuasive, source-dependent, narrative)")
    rubric_min: float = Field(..., description="Minimum rubric score")
    rubric_max: float = Field(..., description="Maximum rubric score")
    n_test_samples: int = Field(..., description="Number of held-out test essays evaluated")
    sample_predictions: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Sample test predictions with true and rounded scores"
    )


class QwkSummaryResponse(BaseModel):
    """Aggregated QWK report across all evaluated prompts."""

    average_qwk: float = Field(..., description="Mean QWK score across all prompts")
    target_qwk: float = Field(default=0.70, description="Acceptance gate target QWK")
    all_passed: bool = Field(..., description="True if every prompt meets or exceeds target QWK")
    evaluated_prompts_count: int = Field(..., description="Total prompts evaluated")
    passed_prompts_count: int = Field(..., description="Number of prompts passing the acceptance gate")
    failed_prompts_count: int = Field(..., description="Number of prompts failing the acceptance gate")
    timestamp: Optional[str] = Field(default=None, description="Evaluation run timestamp")
    prompts: List[PromptQwkResult] = Field(default_factory=list, description="Per-prompt evaluation results")


class LossCurvePoint(BaseModel):
    """A single step data point in model training / validation loss curve."""

    step: int = Field(..., description="Training step / epoch number")
    train_loss: Optional[float] = Field(default=None, description="Training loss at this step")
    val_loss: Optional[float] = Field(default=None, description="Validation loss at this step")
    learning_rate: Optional[float] = Field(default=None, description="Learning rate at this step")


class JobStatusCounts(BaseModel):
    """Real-time job queue summary counts."""

    queued: int = Field(default=0, description="Number of jobs currently queued")
    processing: int = Field(default=0, description="Number of jobs currently processing")
    completed: int = Field(default=0, description="Number of successfully completed jobs")
    failed: int = Field(default=0, description="Number of failed jobs")
    total: int = Field(default=0, description="Total jobs across all statuses")


class EvaluationDashboardResponse(BaseModel):
    """Combined payload for the Model Evaluation dashboard."""

    qwk_summary: QwkSummaryResponse = Field(..., description="Per-prompt and average QWK statistics")
    loss_curves: Dict[str, List[LossCurvePoint]] = Field(
        ..., description="Training and validation loss curves keyed by prompt ID"
    )
    job_counts: JobStatusCounts = Field(..., description="Live job status counts")
