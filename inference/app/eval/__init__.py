"""Evaluation metrics: Quadratic Weighted Kappa (QWK) and checkpoint acceptance gate."""

from app.eval.evaluate import (
    EvaluationReport,
    PromptEvaluationResult,
    evaluate_all_prompts,
    evaluate_prompt,
    print_evaluation_table,
    render_evaluation_table,
)
from app.eval.qwk import (
    build_confusion_matrix,
    build_expected_matrix,
    build_weight_matrix,
    compute_qwk,
    quadratic_weighted_kappa,
)

__all__ = [
    "quadratic_weighted_kappa",
    "compute_qwk",
    "build_confusion_matrix",
    "build_expected_matrix",
    "build_weight_matrix",
    "evaluate_prompt",
    "evaluate_all_prompts",
    "render_evaluation_table",
    "print_evaluation_table",
    "PromptEvaluationResult",
    "EvaluationReport",
]
