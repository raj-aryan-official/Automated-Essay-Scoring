"""Quadratic Weighted Kappa (QWK) Metric Implementation.

Conforms strictly to Section 12.1 Evaluation Formula of the technical documentation:
    QWK = 1 - ( sum_{i,j} w_ij * O_ij ) / ( sum_{i,j} w_ij * E_ij )

where:
    - O is the observed score-pair matrix (confusion matrix between true scores and predicted scores)
    - E is the expected matrix under random/chance agreement:
        E_ij = (r_i * c_j) / n
      where r_i = sum_j O_ij (true score marginal totals),
            c_j = sum_i O_ij (predicted score marginal totals),
            n = sum_{i,j} O_ij (total number of essay samples)
    - w_ij = (i - j)^2 / (N - 1)^2 for rubric categories i, j in {0, ..., N - 1},
      where N is the number of distinct rubric categories (e.g., max_score - min_score + 1).

This implementation does not rely on third-party library shortcuts and guarantees exact
adherence to the quadratic penalty weighting defined in Section 12.1.
"""

from __future__ import annotations

import math
from typing import Any, List, Optional, Sequence, Tuple, Union

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore


def _to_list(values: Any) -> List[float]:
    """Convert input sequence/series/array to a Python list of floats."""
    if hasattr(values, "tolist") and callable(getattr(values, "tolist")):
        return [float(x) for x in values.tolist()]
    return [float(x) for x in values]


def build_confusion_matrix(
    y_true: Sequence[Union[int, float]],
    y_pred: Sequence[Union[int, float]],
    min_score: int,
    max_score: int,
) -> List[List[float]]:
    """Construct observed score-pair matrix O of shape (N, N).

    Args:
        y_true: Ground truth integer/rounded ratings.
        y_pred: Model predicted integer/rounded ratings.
        min_score: Minimum rubric category value.
        max_score: Maximum rubric category value.

    Returns:
        2D matrix of shape (N, N) where N = max_score - min_score + 1.
    """
    N = int(max_score - min_score + 1)
    matrix = [[0.0] * N for _ in range(N)]

    for t, p in zip(y_true, y_pred):
        # Round to nearest integer category and clamp within rubric bounds
        ti = int(round(float(t))) - min_score
        pi = int(round(float(p))) - min_score
        ti = max(0, min(N - 1, ti))
        pi = max(0, min(N - 1, pi))
        matrix[ti][pi] += 1.0

    return matrix


def build_expected_matrix(
    observed_matrix: List[List[float]],
) -> List[List[float]]:
    """Construct expected matrix E under random agreement: E_ij = (r_i * c_j) / n.

    Args:
        observed_matrix: 2D observed score-pair matrix O of shape (N, N).

    Returns:
        2D expected matrix E of shape (N, N).
    """
    N = len(observed_matrix)
    if N == 0:
        return []

    # Row marginals: r_i = sum_j O_ij
    r = [sum(observed_matrix[i][j] for j in range(N)) for i in range(N)]
    # Column marginals: c_j = sum_i O_ij
    c = [sum(observed_matrix[i][j] for i in range(N)) for j in range(N)]

    n = float(sum(r))
    if n == 0.0:
        return [[0.0] * N for _ in range(N)]

    expected = [[(r[i] * c[j]) / n for j in range(N)] for i in range(N)]
    return expected


def build_weight_matrix(num_categories: int) -> List[List[float]]:
    """Construct quadratic weight matrix w_ij = (i - j)^2 / (N - 1)^2.

    Args:
        num_categories: Number of distinct categories N = max_score - min_score + 1.

    Returns:
        2D quadratic weight matrix of shape (N, N).
    """
    N = int(num_categories)
    if N <= 1:
        return [[0.0]]

    denom = float((N - 1) ** 2)
    weights = [
        [float((i - j) ** 2) / denom for j in range(N)]
        for i in range(N)
    ]
    return weights


def quadratic_weighted_kappa(
    y_true: Sequence[Union[int, float]],
    y_pred: Sequence[Union[int, float]],
    min_score: Optional[Union[int, float]] = None,
    max_score: Optional[Union[int, float]] = None,
) -> float:
    """Compute Quadratic Weighted Kappa (QWK) exactly per Section 12.1.

    Formula:
        QWK = 1 - ( sum_{i,j} w_ij * O_ij ) / ( sum_{i,j} w_ij * E_ij )

    Args:
        y_true: Ground truth ratings.
        y_pred: Predicted ratings.
        min_score: Lower bound of discrete rubric scale (e.g. 2 for Prompt 1).
                   If None, inferred as min(y_true + y_pred).
        max_score: Upper bound of discrete rubric scale (e.g. 12 for Prompt 1).
                   If None, inferred as max(y_true + y_pred).

    Returns:
        QWK agreement score in [-1.0, 1.0]. A score of 1.0 indicates perfect agreement.

    Raises:
        ValueError: If y_true and y_pred have differing lengths or are empty.
    """
    true_list = _to_list(y_true)
    pred_list = _to_list(y_pred)

    if len(true_list) != len(pred_list):
        raise ValueError(
            f"Length mismatch: len(y_true)={len(true_list)} vs len(y_pred)={len(pred_list)}."
        )

    if len(true_list) == 0:
        raise ValueError("Cannot compute QWK on empty input sequences.")

    # Determine rubric boundaries
    if min_score is None:
        min_score = int(round(min(min(true_list), min(pred_list))))
    else:
        min_score = int(round(float(min_score)))

    if max_score is None:
        max_score = int(round(max(max(true_list), max(pred_list))))
    else:
        max_score = int(round(float(max_score)))

    if max_score < min_score:
        raise ValueError(
            f"Invalid rubric bounds: min_score={min_score} > max_score={max_score}."
        )

    # If only one possible score category exists, agreement is trivially perfect if matched
    if max_score == min_score:
        all_match = all(int(round(t)) == int(round(p)) for t, p in zip(true_list, pred_list))
        return 1.0 if all_match else 0.0

    N = max_score - min_score + 1

    # 1. Observed score-pair matrix O
    observed = build_confusion_matrix(true_list, pred_list, min_score, max_score)

    # 2. Expected matrix E under chance agreement
    expected = build_expected_matrix(observed)

    # 3. Quadratic weight matrix w_ij = (i - j)^2 / (N - 1)^2
    weights = build_weight_matrix(N)

    # 4. Compute weighted sums
    # sum_{i,j} w_ij * O_ij  and  sum_{i,j} w_ij * E_ij
    sum_w_obs = 0.0
    sum_w_exp = 0.0
    for i in range(N):
        for j in range(N):
            w = weights[i][j]
            sum_w_obs += w * observed[i][j]
            sum_w_exp += w * expected[i][j]

    # Handle boundary: if expected disagreement is 0
    if abs(sum_w_exp) < 1e-12:
        # If observed disagreement is also 0, agreement is perfect (1.0)
        if abs(sum_w_obs) < 1e-12:
            return 1.0
        return 0.0

    qwk = 1.0 - (sum_w_obs / sum_w_exp)
    return float(qwk)


# Public alias matching common naming conventions
compute_qwk = quadratic_weighted_kappa
