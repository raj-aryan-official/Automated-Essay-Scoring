"""ASAP (Automated Student Assessment Prize) Dataset Adapter.

Handles:
1. Loading and parsing ASAP essay corpus from TSV/CSV.
2. Per-prompt rubric definitions across all 8 essay sets.
3. Per-prompt min-max normalization to [0, 1] and inverse transformations.
4. Stratified 80/10/10 train/val/test splits per prompt.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

logger = logging.getLogger(__name__)

# Official ASAP prompt rubric score ranges and genres
# Set 1: 2–12, Set 2: 1–6, Set 3: 0–3, Set 4: 0–3, Set 5: 0–4, Set 6: 0–4, Set 7: 0–30, Set 8: 0–60
ASAP_RUBRIC_CONFIG: Dict[int, Dict[str, Any]] = {
    1: {"min_score": 2.0, "max_score": 12.0, "genre": "persuasive"},
    2: {"min_score": 1.0, "max_score": 6.0, "genre": "persuasive"},
    3: {"min_score": 0.0, "max_score": 3.0, "genre": "source-dependent"},
    4: {"min_score": 0.0, "max_score": 3.0, "genre": "source-dependent"},
    5: {"min_score": 0.0, "max_score": 4.0, "genre": "source-dependent"},
    6: {"min_score": 0.0, "max_score": 4.0, "genre": "source-dependent"},
    7: {"min_score": 0.0, "max_score": 30.0, "genre": "narrative"},
    8: {"min_score": 0.0, "max_score": 60.0, "genre": "narrative"},
}


def get_prompt_rubric(essay_set: int) -> Dict[str, Any]:
    """Retrieve rubric min, max, and genre for a specific ASAP essay set."""
    if essay_set not in ASAP_RUBRIC_CONFIG:
        raise ValueError(
            f"Invalid essay_set: {essay_set}. Expected an integer in [1, 8]."
        )
    return ASAP_RUBRIC_CONFIG[essay_set]


def rescale_score(
    score: Union[float, int, np.ndarray, pd.Series],
    essay_set: int,
    clip: bool = True,
) -> Union[float, np.ndarray, pd.Series]:
    """Rescale raw domain1_score to normalized range [0, 1] using prompt min-max rubric.

    Args:
        score: Raw essay score(s).
        essay_set: Prompt ID (1 to 8).
        clip: Whether to clamp output to exactly [0.0, 1.0].

    Returns:
        Rescaled score(s) in [0, 1].
    """
    rubric = get_prompt_rubric(essay_set)
    min_score = rubric["min_score"]
    max_score = rubric["max_score"]

    if max_score == min_score:
        raise ValueError(f"Min and max scores are identical for essay_set {essay_set}")

    rescaled = (score - min_score) / (max_score - min_score)

    if clip:
        if isinstance(rescaled, (pd.Series, np.ndarray)):
            return np.clip(rescaled, 0.0, 1.0)
        return float(max(0.0, min(1.0, rescaled)))

    return rescaled


def inverse_rescale_score(
    normalized_score: Union[float, int, np.ndarray, pd.Series],
    essay_set: int,
    clip: bool = True,
    round_decimals: Optional[int] = None,
) -> Union[float, np.ndarray, pd.Series]:
    """Map normalized score [0, 1] back to the prompt's original rubric scale.

    Args:
        normalized_score: Model prediction(s) in [0, 1].
        essay_set: Prompt ID (1 to 8).
        clip: Whether to clamp output to prompt's [min_score, max_score].
        round_decimals: Optional decimal rounding precision (e.g. 0 for integer score).

    Returns:
        Raw rubric-scaled score(s).
    """
    rubric = get_prompt_rubric(essay_set)
    min_score = rubric["min_score"]
    max_score = rubric["max_score"]

    raw_score = normalized_score * (max_score - min_score) + min_score

    if clip:
        if isinstance(raw_score, (pd.Series, np.ndarray)):
            raw_score = np.clip(raw_score, min_score, max_score)
        else:
            raw_score = float(max(min_score, min(max_score, raw_score)))

    if round_decimals is not None:
        if isinstance(raw_score, pd.Series):
            raw_score = raw_score.round(round_decimals)
        elif isinstance(raw_score, np.ndarray):
            raw_score = np.round(raw_score, decimals=round_decimals)
        else:
            raw_score = round(raw_score, round_decimals)

    return raw_score


def load_asap_dataset(
    file_path: Optional[Union[str, Path]] = None,
) -> pd.DataFrame:
    """Load ASAP essay dataset from disk.

    Supports TSV or CSV format with columns: essay_id, essay_set, essay, domain1_score.
    Automatically handles encodings (utf-8, latin1, ISO-8859-1).

    Args:
        file_path: Path to dataset file. If None, defaults to 'inference/data/asap_essays.tsv'.

    Returns:
        Validated DataFrame with added 'scaled_score' column.
    """
    if file_path is None:
        file_path = Path(__file__).resolve().parent.parent.parent / "data" / "asap_essays.tsv"
    else:
        file_path = Path(file_path)

    if not file_path.is_file():
        raise FileNotFoundError(
            f"ASAP dataset file not found at: {file_path}. "
            f"Please place asap_essays.tsv in inference/data/ or provide an explicit file path."
        )

    # Determine delimiter from file extension or sniff
    delimiter = "\t" if file_path.suffix.lower() in [".tsv", ".tab"] else ","

    # Try common encodings for the ASAP dataset
    df = None
    for encoding in ["utf-8", "latin1", "cp1252", "ISO-8859-1"]:
        try:
            df = pd.read_csv(file_path, sep=delimiter, encoding=encoding)
            break
        except UnicodeDecodeError:
            continue

    if df is None:
        raise ValueError(f"Failed to decode dataset file at {file_path} with standard encodings.")

    required_cols = {"essay_id", "essay_set", "essay", "domain1_score"}
    missing_cols = required_cols - set(df.columns)
    if missing_cols:
        raise ValueError(
            f"Dataset at {file_path} is missing required columns: {missing_cols}. "
            f"Found columns: {list(df.columns)}"
        )

    # Clean & validate types
    df = df.dropna(subset=["essay_id", "essay_set", "essay", "domain1_score"]).copy()
    df["essay_id"] = df["essay_id"].astype(int)
    df["essay_set"] = df["essay_set"].astype(int)
    df["essay"] = df["essay"].astype(str).str.strip()
    df["domain1_score"] = df["domain1_score"].astype(float)

    # Filter invalid essay sets
    valid_sets = set(ASAP_RUBRIC_CONFIG.keys())
    df = df[df["essay_set"].isin(valid_sets)].copy()

    # Compute per-prompt normalized scores
    df["scaled_score"] = df.apply(
        lambda row: rescale_score(row["domain1_score"], int(row["essay_set"])),
        axis=1,
    )

    return df


def split_prompt_dataset(
    df: pd.DataFrame,
    essay_set: int,
    train_size: float = 0.8,
    val_size: float = 0.1,
    test_size: float = 0.1,
    random_state: int = 42,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Produce stratified train/val/test splits (80/10/10) for a specific essay_set.

    Uses domain1_score for stratification when class sizes allow; falls back
    gracefully to random splitting if class frequencies are too small.

    Args:
        df: Full ASAP DataFrame or prompt-specific subset.
        essay_set: Prompt ID (1 to 8).
        train_size: Ratio of train split (default 0.8).
        val_size: Ratio of validation split (default 0.1).
        test_size: Ratio of test split (default 0.1).
        random_state: Random seed for reproducibility.

    Returns:
        (train_df, val_df, test_df) tuple.
    """
    total = train_size + val_size + test_size
    if not np.isclose(total, 1.0):
        raise ValueError(f"Split ratios must sum to 1.0; got {total}")

    prompt_df = df[df["essay_set"] == essay_set].copy()
    if prompt_df.empty:
        raise ValueError(f"No records found for essay_set={essay_set}")

    n_samples = len(prompt_df)
    if n_samples < 3:
        raise ValueError(
            f"Prompt {essay_set} has {n_samples} samples; minimum 3 required for 3-way split."
        )

    # Check if stratification is viable (every class needs >= 2 instances for train_test_split)
    class_counts = prompt_df["domain1_score"].value_counts()
    can_stratify = (class_counts.min() >= 2) and (len(class_counts) > 1)

    stratify_col = prompt_df["domain1_score"] if can_stratify else None
    if not can_stratify:
        logger.warning(
            "Stratification disabled for prompt %d due to sparse score frequencies (<2 per score).",
            essay_set,
        )

    # First split: train vs temporary (val + test)
    temp_ratio = val_size + test_size
    train_df, temp_df = train_test_split(
        prompt_df,
        test_size=temp_ratio,
        random_state=random_state,
        stratify=stratify_col,
    )

    # Second split: val vs test (split temp 50/50 if val_size == test_size)
    val_relative_ratio = val_size / temp_ratio
    temp_stratify = None
    if can_stratify:
        temp_class_counts = temp_df["domain1_score"].value_counts()
        if (temp_class_counts.min() >= 2) and (len(temp_class_counts) > 1):
            temp_stratify = temp_df["domain1_score"]

    val_df, test_df = train_test_split(
        temp_df,
        test_size=(1.0 - val_relative_ratio),
        random_state=random_state,
        stratify=temp_stratify,
    )

    return (
        train_df.reset_index(drop=True),
        val_df.reset_index(drop=True),
        test_df.reset_index(drop=True),
    )


def get_all_prompt_splits(
    df: pd.DataFrame,
    train_size: float = 0.8,
    val_size: float = 0.1,
    test_size: float = 0.1,
    random_state: int = 42,
) -> Dict[int, Dict[str, pd.DataFrame]]:
    """Produce train, val, and test splits for all available essay sets in the DataFrame.

    Returns:
        Dict mapping essay_set -> {'train': df, 'val': df, 'test': df}
    """
    splits = {}
    available_sets = sorted(df["essay_set"].unique())

    for essay_set in available_sets:
        train_df, val_df, test_df = split_prompt_dataset(
            df=df,
            essay_set=int(essay_set),
            train_size=train_size,
            val_size=val_size,
            test_size=test_size,
            random_state=random_state,
        )
        splits[int(essay_set)] = {
            "train": train_df,
            "val": val_df,
            "test": test_df,
        }

    return splits


def create_sample_asap_dataset(
    samples_per_set: int = 30,
    random_state: int = 42,
) -> pd.DataFrame:
    """Generate a synthetic ASAP dataset spanning all 8 prompts for testing and scaffolding.

    Ensures each prompt has scores across its authentic rubric scale.
    """
    rng = np.random.default_rng(random_state)
    records = []
    essay_id = 1

    for essay_set, rubric in ASAP_RUBRIC_CONFIG.items():
        min_s = rubric["min_score"]
        max_s = rubric["max_score"]

        # Generate integer or half-integer scores within rubric bounds
        scores = rng.choice(
            np.linspace(min_s, max_s, int(max_s - min_s + 1)),
            size=samples_per_set,
        )

        for score in scores:
            records.append(
                {
                    "essay_id": essay_id,
                    "essay_set": essay_set,
                    "essay": (
                        f"This is a simulated essay submission for ASAP prompt {essay_set}. "
                        f"The argument explores key evidence and cohesive reasoning. "
                        f"Sample ID #{essay_id} with rubric range {min_s}-{max_s}."
                    ),
                    "domain1_score": float(score),
                }
            )
            essay_id += 1

    df = pd.DataFrame(records)
    df["scaled_score"] = df.apply(
        lambda row: rescale_score(row["domain1_score"], int(row["essay_set"])),
        axis=1,
    )
    return df
