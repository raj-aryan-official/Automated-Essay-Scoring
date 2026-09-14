"""Tests for the ASAP Dataset Adapter.

Verifies:
1. Every essay_set (1-8) has non-empty train/val/test splits.
2. Rescaled scores fall strictly within [0, 1].
3. Inverse-rescaling accurately reconstructs original rubric scores.
"""

from pathlib import Path
import pytest
import numpy as np
import pandas as pd

from app.dataset.asap_adapter import (
    ASAP_RUBRIC_CONFIG,
    create_sample_asap_dataset,
    get_all_prompt_splits,
    get_prompt_rubric,
    inverse_rescale_score,
    load_asap_dataset,
    rescale_score,
    split_prompt_dataset,
)


@pytest.fixture
def asap_dataframe() -> pd.DataFrame:
    """Fixture providing a valid ASAP DataFrame across all 8 prompts.

    Attempts to load local TSV if present; otherwise generates a robust
    synthetic dataset spanning all prompts and score ranges.
    """
    tsv_path = Path(__file__).resolve().parent.parent / "data" / "asap_essays.tsv"
    if tsv_path.is_file():
        try:
            return load_asap_dataset(tsv_path)
        except Exception:
            pass
    return create_sample_asap_dataset(samples_per_set=30)


def test_rubric_config_coverage():
    """Ensure all 8 ASAP prompts are defined with valid rubric ranges."""
    for prompt_id in range(1, 9):
        rubric = get_prompt_rubric(prompt_id)
        assert "min_score" in rubric
        assert "max_score" in rubric
        assert rubric["max_score"] > rubric["min_score"]


def test_score_rescaling_bounds():
    """Assert that min-max rescaling maps prompt boundaries exactly to 0.0 and 1.0."""
    for prompt_id, rubric in ASAP_RUBRIC_CONFIG.items():
        min_s = rubric["min_score"]
        max_s = rubric["max_score"]

        # Check exact boundaries
        assert rescale_score(min_s, prompt_id) == pytest.approx(0.0)
        assert rescale_score(max_s, prompt_id) == pytest.approx(1.0)

        # Check midpoint
        mid_s = (min_s + max_s) / 2.0
        assert rescale_score(mid_s, prompt_id) == pytest.approx(0.5)

        # Check clipping for outliers
        assert rescale_score(min_s - 10, prompt_id, clip=True) == 0.0
        assert rescale_score(max_s + 10, prompt_id, clip=True) == 1.0


def test_inverse_score_rescaling():
    """Assert that inverse transformation reliably recovers raw rubric scores."""
    for prompt_id, rubric in ASAP_RUBRIC_CONFIG.items():
        min_s = rubric["min_score"]
        max_s = rubric["max_score"]

        test_scores = np.linspace(min_s, max_s, 10)
        for raw_score in test_scores:
            scaled = rescale_score(raw_score, prompt_id)
            recovered = inverse_rescale_score(scaled, prompt_id)
            assert recovered == pytest.approx(raw_score, abs=1e-5)


def test_rescaled_scores_fall_within_zero_one(asap_dataframe: pd.DataFrame):
    """Assert that every rescaled score in the dataset falls within [0, 1]."""
    assert "scaled_score" in asap_dataframe.columns
    assert (asap_dataframe["scaled_score"] >= 0.0).all(), "Scores below 0.0 found"
    assert (asap_dataframe["scaled_score"] <= 1.0).all(), "Scores above 1.0 found"


def test_all_essay_sets_non_empty_splits(asap_dataframe: pd.DataFrame):
    """Assert every essay_set (1-8) produces non-empty train, val, and test splits."""
    all_splits = get_all_prompt_splits(
        asap_dataframe,
        train_size=0.8,
        val_size=0.1,
        test_size=0.1,
        random_state=42,
    )

    for essay_set in range(1, 9):
        assert essay_set in all_splits, f"essay_set {essay_set} missing from splits"

        splits = all_splits[essay_set]
        train_df = splits["train"]
        val_df = splits["val"]
        test_df = splits["test"]

        # 1. Non-empty check
        assert len(train_df) > 0, f"essay_set {essay_set} train split is empty"
        assert len(val_df) > 0, f"essay_set {essay_set} val split is empty"
        assert len(test_df) > 0, f"essay_set {essay_set} test split is empty"

        # 2. Rescaled score range check in splits
        for split_name, split_df in [("train", train_df), ("val", val_df), ("test", test_df)]:
            assert (split_df["scaled_score"] >= 0.0).all(), f"{split_name} has scores < 0.0"
            assert (split_df["scaled_score"] <= 1.0).all(), f"{split_name} has scores > 1.0"

        # 3. Disjoint index check
        train_ids = set(train_df["essay_id"])
        val_ids = set(val_df["essay_id"])
        test_ids = set(test_df["essay_id"])

        assert train_ids.isdisjoint(val_ids), f"Prompt {essay_set} train/val leakage"
        assert train_ids.isdisjoint(test_ids), f"Prompt {essay_set} train/test leakage"
        assert val_ids.isdisjoint(test_ids), f"Prompt {essay_set} val/test leakage"
