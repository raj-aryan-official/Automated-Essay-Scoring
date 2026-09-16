"""Comprehensive Unit & Acceptance Gate Tests for Section 12.1 QWK and evaluate.py.

Verifies:
1. Exact mathematical fidelity to Section 12.1 QWK formula (O, E, w_ij = (i-j)^2 / (N-1)^2).
2. Weight matrix quadratic scaling and penalty ratios.
3. Perfect agreement (1.0), complete disagreement (<= 0.0), and partial agreement bounds.
4. Input validation and edge cases (mismatched lengths, empty sequences, single category).
5. Checkpoint loading and auto-initialization in test directories.
6. Inverse-rescaling and nearest valid integer score rounding per prompt rubric.
7. Per-prompt held-out test evaluation against target gate (QWK >= 0.70).
8. ASCII PASS/FAIL evaluation table generation and overall acceptance gate status.
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest

from app.dataset.asap_adapter import (
    ASAP_RUBRIC_CONFIG,
    create_sample_asap_dataset,
    get_prompt_rubric,
    inverse_rescale_score,
    rescale_score,
)
from app.eval.evaluate import (
    EvaluationReport,
    PromptEvaluationResult,
    evaluate_all_prompts,
    evaluate_prompt,
    load_prompt_checkpoint,
    main as eval_main,
    render_evaluation_table,
)
from app.eval.qwk import (
    build_confusion_matrix,
    build_expected_matrix,
    build_weight_matrix,
    compute_qwk,
    quadratic_weighted_kappa,
)


# ============================================================================
# Section 12.1 QWK Formula & Matrix Math Tests
# ============================================================================

def test_weight_matrix_quadratic_scaling():
    """Verify w_ij = (i - j)^2 / (N - 1)^2 exactly per Section 12.1."""
    N = 5  # 5 discrete score categories: indices 0, 1, 2, 3, 4
    weights = build_weight_matrix(N)

    assert len(weights) == 5
    assert len(weights[0]) == 5

    # Diagonal weights must be 0 (no penalty for exact agreement)
    for i in range(N):
        assert weights[i][i] == 0.0

    # Max difference (0 to 4) must be exactly 1.0: (4-0)^2 / (5-1)^2 = 16/16 = 1.0
    assert weights[0][4] == pytest.approx(1.0)
    assert weights[4][0] == pytest.approx(1.0)

    # Difference of 1: (1)^2 / 16 = 0.0625
    assert weights[0][1] == pytest.approx(1.0 / 16.0)
    assert weights[1][2] == pytest.approx(1.0 / 16.0)

    # Difference of 2: (2)^2 / 16 = 4 / 16 = 0.25 (quadratically 4x diff of 1)
    assert weights[0][2] == pytest.approx(4.0 / 16.0)
    assert weights[0][2] == pytest.approx(4.0 * weights[0][1])

    # Difference of 3: (3)^2 / 16 = 9 / 16 = 0.5625 (quadratically 9x diff of 1)
    assert weights[0][3] == pytest.approx(9.0 / 16.0)
    assert weights[0][3] == pytest.approx(9.0 * weights[0][1])


def test_qwk_hand_calculated_matrix_verification():
    """Hand-calculated known 3-class example verifying O, E, and QWK arithmetic."""
    # Rubric range 0 to 2 (N = 3)
    # y_true = [0, 0, 1, 1, 2, 2]
    # y_pred = [0, 1, 1, 1, 2, 1]
    y_true = [0, 0, 1, 1, 2, 2]
    y_pred = [0, 1, 1, 1, 2, 1]

    O = build_confusion_matrix(y_true, y_pred, min_score=0, max_score=2)
    # Expected O matrix:
    # True 0: pred 0 -> 1, pred 1 -> 1, pred 2 -> 0 => [1, 1, 0]
    # True 1: pred 0 -> 0, pred 1 -> 2, pred 2 -> 0 => [0, 2, 0]
    # True 2: pred 0 -> 0, pred 1 -> 1, pred 2 -> 1 => [0, 1, 1]
    assert O == [
        [1.0, 1.0, 0.0],
        [0.0, 2.0, 0.0],
        [0.0, 1.0, 1.0],
    ]

    E = build_expected_matrix(O)
    # r = [2, 2, 2], c = [1, 4, 1], n = 6
    # E_ij = r_i * c_j / 6:
    # Row 0: [2*1/6, 2*4/6, 2*1/6] = [1/3, 4/3, 1/3]
    # Row 1: [1/3, 4/3, 1/3]
    # Row 2: [1/3, 4/3, 1/3]
    for i in range(3):
        assert E[i][0] == pytest.approx(2.0 * 1.0 / 6.0)
        assert E[i][1] == pytest.approx(2.0 * 4.0 / 6.0)
        assert E[i][2] == pytest.approx(2.0 * 1.0 / 6.0)

    # Weights for N=3, denom = 2^2 = 4:
    # W = [[0, 0.25, 1.0], [0.25, 0, 0.25], [1.0, 0.25, 0]]
    # sum w_ij * O_ij:
    # (0.25 * 1.0) + (0.25 * 1.0) = 0.50
    # sum w_ij * E_ij:
    # i=0: 0.25*(4/3) + 1.0*(1/3) = 1/3 + 1/3 = 2/3
    # i=1: 0.25*(1/3) + 0.25*(1/3) = 2/12 = 1/6
    # i=2: 1.0*(1/3) + 0.25*(4/3) = 1/3 + 1/3 = 2/3
    # sum E = 2/3 + 1/6 + 2/3 = 9/6 = 1.5
    # QWK = 1 - (0.50 / 1.50) = 1 - 1/3 = 2/3 = 0.666667
    qwk = quadratic_weighted_kappa(y_true, y_pred, min_score=0, max_score=2)
    assert qwk == pytest.approx(2.0 / 3.0, abs=1e-5)


def test_qwk_perfect_agreement():
    """Verify that identical true and predicted vectors yield exactly QWK = 1.0."""
    scores = [2, 3, 5, 8, 10, 12]
    qwk = quadratic_weighted_kappa(scores, scores, min_score=2, max_score=12)
    assert qwk == pytest.approx(1.0)


def test_qwk_complete_disagreement():
    """Verify that opposing extreme ratings yield negative or near-zero QWK."""
    y_true = [0, 0, 0, 10, 10, 10]
    y_pred = [10, 10, 10, 0, 0, 0]
    qwk = quadratic_weighted_kappa(y_true, y_pred, min_score=0, max_score=10)
    assert qwk < 0.0


def test_qwk_input_validation():
    """Verify input length mismatch and empty error handling."""
    with pytest.raises(ValueError, match="Length mismatch"):
        quadratic_weighted_kappa([1, 2], [1, 2, 3])

    with pytest.raises(ValueError, match="Cannot compute QWK on empty"):
        quadratic_weighted_kappa([], [])

    with pytest.raises(ValueError, match="Invalid rubric bounds"):
        quadratic_weighted_kappa([1, 2], [1, 2], min_score=10, max_score=5)


def test_qwk_single_score_category_edge_case():
    """Verify degenerate single-category rubric handling."""
    qwk_match = quadratic_weighted_kappa([5, 5, 5], [5, 5, 5], min_score=5, max_score=5)
    assert qwk_match == 1.0

    qwk_mismatch = quadratic_weighted_kappa([5, 5, 5], [4, 4, 4], min_score=5, max_score=5)
    assert qwk_mismatch == 0.0


def test_compute_qwk_alias():
    """Verify compute_qwk alias behaves identically to quadratic_weighted_kappa."""
    y_true = [1, 2, 3, 4, 5]
    y_pred = [1, 2, 2, 4, 5]
    res1 = quadratic_weighted_kappa(y_true, y_pred, min_score=1, max_score=5)
    res2 = compute_qwk(y_true, y_pred, min_score=1, max_score=5)
    assert res1 == pytest.approx(res2)


# ============================================================================
# Checkpoint Loading & Pipeline Execution Tests
# ============================================================================

def test_load_prompt_checkpoint_auto_initialization(tmp_path: Path):
    """Verify load_prompt_checkpoint creates and loads checkpoint when missing."""
    ckpt_dir = tmp_path / "checkpoints"
    meta, model = load_prompt_checkpoint(checkpoint_dir=ckpt_dir, prompt_id=1, auto_train_if_missing=True)

    assert meta["prompt_id"] == 1
    assert meta["loss_metric"] == "MSE"
    assert (ckpt_dir / "1" / "checkpoint_metadata.json").is_file()
    assert (ckpt_dir / "1" / "regression_head.pt").is_file()


def test_evaluate_prompt_single_meets_target(tmp_path: Path):
    """Verify evaluate_prompt runs over held-out test split and meets QWK >= 0.70 gate."""
    ckpt_dir = tmp_path / "checkpoints"
    result = evaluate_prompt(
        prompt_id=1,
        checkpoint_dir=ckpt_dir,
        target_qwk=0.70,
        test_split_ratio=0.1,
    )

    assert isinstance(result, PromptEvaluationResult)
    assert result.prompt_id == 1
    assert result.rubric_min == 2.0
    assert result.rubric_max == 12.0
    assert result.genre == "persuasive"
    assert result.n_test_samples > 0
    assert result.qwk >= 0.70, f"Expected QWK >= 0.70, got {result.qwk}"
    assert result.passed is True

    # Check sample predictions structure and integer rounding
    for sample in result.sample_predictions:
        assert "essay_id" in sample
        assert "true_score" in sample
        assert "rounded_score" in sample
        assert isinstance(sample["rounded_score"], int)
        assert result.rubric_min <= sample["rounded_score"] <= result.rubric_max


def test_evaluate_all_prompts_and_acceptance_gate(tmp_path: Path):
    """Verify multi-prompt evaluation across prompts 1..3 with gate aggregation."""
    ckpt_dir = tmp_path / "checkpoints"
    report = evaluate_all_prompts(
        checkpoint_dir=ckpt_dir,
        prompts=[1, 2, 3],
        target_qwk=0.70,
    )

    assert isinstance(report, EvaluationReport)
    assert report.evaluated_prompts_count == 3
    assert report.all_passed is True
    assert report.average_qwk >= 0.70
    assert report.failed_prompts_count == 0

    for pid in [1, 2, 3]:
        assert pid in report.prompt_results
        assert report.prompt_results[pid].passed is True
        assert report.prompt_results[pid].qwk >= 0.70


def test_render_evaluation_table():
    """Verify PASS/FAIL table rendering formatting and summary string."""
    prompt_results = {
        1: PromptEvaluationResult(
            prompt_id=1,
            n_test_samples=20,
            rubric_min=2.0,
            rubric_max=12.0,
            genre="persuasive",
            target_qwk=0.70,
            qwk=0.8245,
            passed=True,
            checkpoint_path="inference/checkpoints/1",
            sample_predictions=[],
        ),
        2: PromptEvaluationResult(
            prompt_id=2,
            n_test_samples=20,
            rubric_min=1.0,
            rubric_max=6.0,
            genre="persuasive",
            target_qwk=0.70,
            qwk=0.7812,
            passed=True,
            checkpoint_path="inference/checkpoints/2",
            sample_predictions=[],
        ),
    }

    report = EvaluationReport(
        prompt_results=prompt_results,
        average_qwk=0.8028,
        target_qwk=0.70,
        all_passed=True,
        evaluated_prompts_count=2,
        passed_prompts_count=2,
        failed_prompts_count=0,
        timestamp="2026-09-16T12:00:00Z",
    )

    table = render_evaluation_table(report)
    assert "AUTOMATED ESSAY SCORING (AES) - QWK EVALUATION REPORT" in table
    assert "Acceptance Gate: QWK >= 0.70 per prompt (Section 12.1)" in table
    assert "Prompt" in table
    assert "Gate Status" in table
    assert "persuasive" in table
    assert "0.8245" in table
    assert "PASS" in table
    assert "OVERALL AVERAGE QWK: 0.8028" in table
    assert "GATE STATUS: PASS" in table


def test_cli_execution_with_json_export(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Verify evaluate.py CLI execution exports JSON report and exits with code 0."""
    json_path = tmp_path / "eval_report.json"
    ckpt_dir = tmp_path / "checkpoints"

    # Simulate CLI arguments
    monkeypatch.setattr(
        "sys.argv",
        [
            "evaluate.py",
            "--checkpoint_dir", str(ckpt_dir),
            "--prompts", "1,2",
            "--target_qwk", "0.70",
            "--output_json", str(json_path),
        ],
    )

    exit_code = eval_main()
    assert exit_code == 0
    assert json_path.is_file()

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["all_passed"] is True
    assert data["average_qwk"] >= 0.70
    assert "1" in data["prompt_results"]
    assert "2" in data["prompt_results"]
