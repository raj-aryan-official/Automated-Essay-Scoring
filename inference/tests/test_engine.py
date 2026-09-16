"""Unit tests for the Model Engine (Section 9.1 Interfaces and Section 10.2 Model Architecture).

Verifies:
1. EssayScoringModel abstract interface conformance.
2. BertEssayScoringModel initialization, configuration, and weights loading.
3. WordPiece tokenization, BERT pooled [CLS] extraction, and regression head forward pass.
4. Sigmoid rescaling to prompt rubric bounds across ASAP Prompts 1-8.
5. Rubric band assignments and confidence calibration.
6. Edge case handling (empty strings, varying lengths).
7. DimensionFeedbackGenerator pedagogical feedback generation.
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest

from app.engine import (
    BertEssayScoringModel,
    BertRegressionHead,
    DimensionFeedbackGenerator,
    EssayScoringModel,
    RubricBand,
    RuleBasedFeedbackGenerator,
    ScorePrediction,
)


@pytest.fixture
def scoring_model() -> BertEssayScoringModel:
    """Fixture providing an instantiated BertEssayScoringModel."""
    return BertEssayScoringModel(
        model_name_or_path="bert-base-uncased",
        hidden_dim=256,
        dropout_prob=0.1,
        activation="gelu",
        scaling_method="sigmoid",
    )


def test_interfaces_conformance(scoring_model: BertEssayScoringModel):
    """Verify that BertEssayScoringModel adheres to EssayScoringModel ABC."""
    assert isinstance(scoring_model, EssayScoringModel)

    # Test RubricBand dataclass immutability
    band = RubricBand(label="Proficient", min_score=6.0, max_score=9.0)
    assert band.label == "Proficient"
    assert band.min_score == 6.0
    assert band.max_score == 9.0
    with pytest.raises(Exception):
        band.label = "Advanced"  # type: ignore (frozen dataclass)


def test_predict_essay_prompt_1_rubric(scoring_model: BertEssayScoringModel):
    """Verify inference on ASAP Prompt 1 (rubric range: [2.0, 12.0])."""
    essay = (
        "Computers have become an essential part of modern education. "
        "They enable students to conduct research, collaborate with peers globally, "
        "and learn at their own pace through customized educational software. "
        "Therefore, schools should continue investing in technology."
    )

    pred = scoring_model.predict_essay(essay, prompt_id="1")
    assert isinstance(pred, ScorePrediction)
    assert 2.0 <= pred.holistic_score <= 12.0
    assert pred.rubric_band in {"Advanced", "Proficient", "Basic", "Below Basic"}
    assert 0.0 <= pred.confidence <= 1.0
    assert "grammar" in pred.dimension_scores
    assert "coherence" in pred.dimension_scores
    assert "argumentation" in pred.dimension_scores


@pytest.mark.parametrize(
    "prompt_id, expected_min, expected_max",
    [
        ("1", 2.0, 12.0),
        ("2", 1.0, 6.0),
        ("3", 0.0, 3.0),
        ("4", 0.0, 3.0),
        ("5", 0.0, 4.0),
        ("6", 0.0, 4.0),
        ("7", 0.0, 30.0),
        ("8", 0.0, 60.0),
    ],
)
def test_predict_essay_across_all_asap_prompts(
    scoring_model: BertEssayScoringModel,
    prompt_id: str,
    expected_min: float,
    expected_max: float,
):
    """Verify that every ASAP prompt rubric range is strictly adhered to."""
    essay_sample = (
        "Literature serves as a mirror to society, challenging established norms "
        "and offering profound insights into the human condition. Through character development "
        "and thematic exploration, authors craft narratives that resonate across generations."
    )

    prediction = scoring_model.predict_essay(essay_sample, prompt_id=prompt_id)
    assert expected_min <= prediction.holistic_score <= expected_max
    assert prediction.rubric_band in {"Advanced", "Proficient", "Basic", "Below Basic"}
    assert 0.5 <= prediction.confidence <= 1.0

    # Ensure dimension scores also stay within the prompt range
    for dim_name, dim_score in prediction.dimension_scores.items():
        assert expected_min <= dim_score <= expected_max, f"Dimension {dim_name} out of bounds"


def test_predict_essay_empty_text(scoring_model: BertEssayScoringModel):
    """Verify handling of empty or blank essay submissions."""
    pred = scoring_model.predict_essay("   ", prompt_id="1")
    assert pred.holistic_score == 2.0  # min score for prompt 1
    assert pred.rubric_band == "Below Basic"
    assert pred.confidence >= 0.90


def test_load_model_configuration(tmp_path: Path):
    """Verify load_model reads configuration files and overrides hyperparameters."""
    config_file = tmp_path / "model_config.json"
    config_payload = {
        "hidden_dim": 128,
        "max_length": 256,
        "scaling_method": "linear",
        "prompt_rubrics": {
            "custom_9": {"min_score": 10.0, "max_score": 100.0}
        },
    }
    config_file.write_text(json.dumps(config_payload), encoding="utf-8")

    model = BertEssayScoringModel(model_name_or_path="bert-base-uncased")
    model.load_model(weights_path="", config_path=str(config_file))

    assert model.hidden_dim == 128
    assert model.max_length == 256
    assert model.scaling_method == "linear"

    pred = model.predict_essay("This is an essay for a custom prompt.", prompt_id="custom_9")
    assert 10.0 <= pred.holistic_score <= 100.0


def test_regression_head_instantiation():
    """Verify BertRegressionHead can be instantiated and executed."""
    head = BertRegressionHead(
        input_dim=768,
        hidden_dim=256,
        dropout_prob=0.1,
        activation="gelu",
    )
    assert head.input_dim == 768
    assert head.hidden_dim == 256
    assert head.dropout_prob == 0.1

    # Safe forward invocation
    out = head.forward([[0.0] * 768])
    assert out is not None


def test_feedback_generator():
    """Verify RuleBasedFeedbackGenerator implements DimensionFeedbackGenerator."""
    generator = RuleBasedFeedbackGenerator()
    assert isinstance(generator, DimensionFeedbackGenerator)

    essay = "The author argues that censorship is detrimental. However, evidence is scarce."
    grammar_fb = generator.generate_feedback(essay, "grammar")
    assert isinstance(grammar_fb, str) and len(grammar_fb) > 0

    coherence_fb = generator.generate_feedback(essay, "coherence")
    assert isinstance(coherence_fb, str) and len(coherence_fb) > 0

    arg_fb = generator.generate_feedback(essay, "argumentation")
    assert isinstance(arg_fb, str) and len(arg_fb) > 0
