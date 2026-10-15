"""Model interfaces and data contracts for Automated Essay Scoring.

Conforms to Section 9.1 of the Project Technical Documentation:
- RubricBand dataclass
- ScorePrediction dataclass
- EssayScoringModel abstract interface
- DimensionFeedbackGenerator abstract interface
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


# WHY: Immutable dataclass mapping numeric score ranges to qualitative performance bands (e.g., 'Proficient', 'Developing') for student feedback.
@dataclass(frozen=True)
class RubricBand:
    """Represents a score band within a prompt's evaluation rubric."""

    label: str
    min_score: float
    max_score: float


# WHY: Standardized prediction envelope encapsulating holistic score, mapped rubric band, confidence probability, and latency telemetry.
@dataclass
class ScorePrediction:
    """Encapsulates the model's scoring output for an essay."""

    holistic_score: float
    rubric_band: str
    confidence: float
    dimension_scores: dict[str, Any] = field(default_factory=dict)
    raw_score: float | None = None
    inference_ms: int | None = None


# WHY: Abstract Base Class establishing a strict polymorphic interface for PyTorch BERT, LoRA fine-tuned, and ONNX Runtime scoring engines.
class EssayScoringModel(ABC):
    """Abstract interface for essay scoring models."""

    @abstractmethod
    def load_model(self, weights_path: str, config_path: str) -> None:
        """Initialize BERT encoder weights and regression head config."""
        pass

    @abstractmethod
    def predict_essay(self, essay_text: str, prompt_id: str) -> ScorePrediction:
        """Execute single-essay inference, yielding a rescaled holistic score, rubric band, and confidence."""
        pass


# WHY: Abstract Base Class establishing contract for diagnostic feedback generation across grammar, coherence, and argumentation dimensions.
class DimensionFeedbackGenerator(ABC):
    """Abstract interface for generating dimension-level pedagogical feedback."""

    @abstractmethod
    def generate_feedback(self, essay_text: str, dimension: str) -> str:
        """Produce dimension-specific feedback text (grammar / coherence / argumentation)."""
        pass
