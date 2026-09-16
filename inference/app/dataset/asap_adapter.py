"""ASAP (Automated Student Assessment Prize) Dataset Adapter.

Handles:
1. Loading and parsing ASAP essay corpus from TSV/CSV.
2. Per-prompt rubric definitions across all 8 essay sets.
3. Per-prompt min-max normalization to [0, 1] and inverse transformations.
4. Stratified 80/10/10 train/val/test splits per prompt.
5. Graceful fallback when scientific packages (numpy/pandas/sklearn) are missing.
"""

from __future__ import annotations

import csv
import logging
import math
from pathlib import Path
import random
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

logger = logging.getLogger(__name__)

# Optional third-party imports
try:
    import numpy as np
except (ImportError, Exception):
    np = None  # type: ignore

try:
    import pandas as pd
except (ImportError, Exception):
    pd = None  # type: ignore

try:
    from sklearn.model_selection import train_test_split  # type: ignore
except (ImportError, Exception):
    train_test_split = None  # type: ignore


class SimpleSeries(list):
    """Lightweight fallback for pd.Series when pandas is unavailable."""

    def __init__(self, items: Sequence[Any]) -> None:
        super().__init__(items)

    def isin(self, values: Any) -> SimpleSeries:
        val_set = set(values)
        return SimpleSeries([x in val_set for x in self])

    def unique(self) -> List[Any]:
        return list(dict.fromkeys(self))

    def value_counts(self) -> Dict[Any, int]:
        counts: Dict[Any, int] = {}
        for item in self:
            counts[item] = counts.get(item, 0) + 1
        return counts

    def astype(self, dtype: Any) -> SimpleSeries:
        if dtype in (int, "int"):
            return SimpleSeries([int(x) for x in self])
        if dtype in (float, "float"):
            return SimpleSeries([float(x) for x in self])
        return SimpleSeries([str(x) for x in self])

    @property
    def str(self) -> SimpleSeriesStrAccessor:
        return SimpleSeriesStrAccessor(self)


class SimpleSeriesStrAccessor:
    """String accessor for SimpleSeries."""

    def __init__(self, series: SimpleSeries) -> None:
        self.series = series

    def strip(self) -> SimpleSeries:
        return SimpleSeries([str(x).strip() for x in self.series])


class SimpleDataFrame:
    """Lightweight fallback for pd.DataFrame when pandas is unavailable."""

    def __init__(self, records: List[Dict[str, Any]]) -> None:
        self._records = [dict(r) for r in records]

    def __len__(self) -> int:
        return len(self._records)

    @property
    def empty(self) -> bool:
        return len(self._records) == 0

    @property
    def columns(self) -> List[str]:
        return list(self._records[0].keys()) if self._records else []

    def __getitem__(self, key: Any) -> Any:
        if isinstance(key, str):
            vals = [r.get(key) for r in self._records]
            return SimpleSeries(vals)
        if isinstance(key, (list, tuple, SimpleSeries)):
            filtered = [r for r, mask in zip(self._records, key) if mask]
            return SimpleDataFrame(filtered)
        raise KeyError(key)

    def __setitem__(self, key: str, value: Any) -> None:
        if hasattr(value, "__len__") and not isinstance(value, (str, bytes)):
            vals = list(value)
            for r, v in zip(self._records, vals):
                r[key] = v
        else:
            for r in self._records:
                r[key] = value

    def copy(self) -> SimpleDataFrame:
        return SimpleDataFrame(self._records)

    def apply(self, func: Any, axis: int = 1) -> List[Any]:
        return [func(r) for r in self._records]

    def reset_index(self, drop: bool = True) -> SimpleDataFrame:
        return self

    def dropna(self, subset: Optional[List[str]] = None) -> SimpleDataFrame:
        if not subset:
            return self
        filtered = [
            r for r in self._records
            if all(r.get(k) is not None for k in subset)
        ]
        return SimpleDataFrame(filtered)

    def to_dict(self, orient: str = "records") -> List[Dict[str, Any]]:
        return [dict(r) for r in self._records]


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
    score: Any,
    essay_set: int,
    clip: bool = True,
) -> Any:
    """Rescale raw domain1_score to normalized range [0, 1] using prompt min-max rubric.

    Args:
        score: Raw essay score(s).
        essay_set: Prompt ID (1 to 8).
        clip: Whether to clamp output to exactly [0.0, 1.0].

    Returns:
        Rescaled score(s) in [0, 1].
    """
    rubric = get_prompt_rubric(essay_set)
    min_score = float(rubric["min_score"])
    max_score = float(rubric["max_score"])

    if max_score == min_score:
        raise ValueError(f"Min and max scores are identical for essay_set {essay_set}")

    rescaled = (score - min_score) / (max_score - min_score)

    if clip:
        if pd is not None and isinstance(rescaled, getattr(pd, "Series", ())):
            return getattr(rescaled, "clip")(0.0, 1.0)
        if np is not None and isinstance(rescaled, getattr(np, "ndarray", ())):
            return getattr(np, "clip")(rescaled, 0.0, 1.0)
        return float(max(0.0, min(1.0, float(rescaled))))

    return rescaled


def inverse_rescale_score(
    normalized_score: Any,
    essay_set: int,
    clip: bool = True,
    round_decimals: Optional[int] = None,
) -> Any:
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
    min_score = float(rubric["min_score"])
    max_score = float(rubric["max_score"])

    raw_score = normalized_score * (max_score - min_score) + min_score

    if clip:
        if pd is not None and isinstance(raw_score, getattr(pd, "Series", ())):
            raw_score = getattr(raw_score, "clip")(min_score, max_score)
        elif np is not None and isinstance(raw_score, getattr(np, "ndarray", ())):
            raw_score = getattr(np, "clip")(raw_score, min_score, max_score)
        else:
            raw_score = float(max(min_score, min(max_score, float(raw_score))))

    if round_decimals is not None:
        if hasattr(raw_score, "round") and callable(getattr(raw_score, "round")):
            raw_score = getattr(raw_score, "round")(round_decimals)
        elif np is not None and isinstance(raw_score, getattr(np, "ndarray", ())):
            raw_score = getattr(np, "round")(raw_score, decimals=round_decimals)
        else:
            raw_score = round(float(raw_score), round_decimals)

    return raw_score


def load_asap_dataset(
    file_path: Optional[Union[str, Path]] = None,
) -> Any:
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

    # Determine delimiter from file extension
    delimiter = "\t" if file_path.suffix.lower() in [".tsv", ".tab"] else ","

    # Use pandas if available, otherwise pure Python csv reader
    if pd is not None:
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
            raise ValueError(f"Dataset at {file_path} is missing required columns: {missing_cols}.")

        df = df.dropna(subset=["essay_id", "essay_set", "essay", "domain1_score"]).copy()
        df["essay_id"] = df["essay_id"].astype(int)
        df["essay_set"] = df["essay_set"].astype(int)
        df["essay"] = df["essay"].astype(str).str.strip()
        df["domain1_score"] = df["domain1_score"].astype(float)

        valid_sets = set(ASAP_RUBRIC_CONFIG.keys())
        df = df[df["essay_set"].isin(valid_sets)].copy()
        df["scaled_score"] = df.apply(
            lambda row: rescale_score(row["domain1_score"], int(row["essay_set"])),
            axis=1,
        )
        return getattr(pd, "DataFrame")(df)

    # Pure-Python CSV/TSV loading fallback
    records: List[Dict[str, Any]] = []
    for encoding in ["utf-8", "latin1", "cp1252"]:
        try:
            with open(file_path, "r", encoding=encoding) as f:
                reader = csv.DictReader(f, delimiter=delimiter)
                for row in reader:
                    if not all(k in row for k in ["essay_id", "essay_set", "essay", "domain1_score"]):
                        continue
                    try:
                        eid = int(row["essay_id"])
                        eset = int(row["essay_set"])
                        score = float(row["domain1_score"])
                        text = str(row["essay"]).strip()
                        if eset in ASAP_RUBRIC_CONFIG:
                            records.append({
                                "essay_id": eid,
                                "essay_set": eset,
                                "essay": text,
                                "domain1_score": score,
                                "scaled_score": rescale_score(score, eset),
                            })
                    except (ValueError, TypeError):
                        continue
            break
        except UnicodeDecodeError:
            continue

    return SimpleDataFrame(records)


def split_prompt_dataset(
    df: Any,
    essay_set: int,
    train_size: float = 0.8,
    val_size: float = 0.1,
    test_size: float = 0.1,
    random_state: int = 42,
) -> Tuple[Any, Any, Any]:
    """Produce stratified train/val/test splits (80/10/10) for a specific essay_set."""
    total = train_size + val_size + test_size
    if abs(total - 1.0) > 1e-5:
        raise ValueError(f"Split ratios must sum to 1.0; got {total}")

    if pd is not None and isinstance(df, getattr(pd, "DataFrame", ())):
        prompt_df = df[df["essay_set"] == essay_set].copy()
    else:
        # SimpleDataFrame or list of records
        prompt_records = [r for r in df.to_dict() if int(r.get("essay_set", 0)) == essay_set] if hasattr(df, "to_dict") else []
        prompt_df = SimpleDataFrame(prompt_records)

    n_samples = len(prompt_df)
    if n_samples < 3:
        raise ValueError(
            f"Prompt {essay_set} has {n_samples} samples; minimum 3 required for 3-way split."
        )

    # Use sklearn if available
    if pd is not None and train_test_split is not None and isinstance(prompt_df, getattr(pd, "DataFrame", ())):
        class_counts = prompt_df["domain1_score"].value_counts()
        can_stratify = (class_counts.min() >= 2) and (len(class_counts) > 1)
        stratify_col = prompt_df["domain1_score"] if can_stratify else None

        temp_ratio = val_size + test_size
        train_df, temp_df = train_test_split(
            prompt_df,
            test_size=temp_ratio,
            random_state=random_state,
            stratify=stratify_col,
        )

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

    # Deterministic slice fallback
    records = prompt_df.to_dict() if hasattr(prompt_df, "to_dict") else []
    rng = random.Random(random_state)
    shuffled = list(records)
    rng.shuffle(shuffled)

    n_train = max(1, int(n_samples * train_size))
    n_val = max(1, int(n_samples * val_size))

    train_recs = shuffled[:n_train]
    val_recs = shuffled[n_train:n_train + n_val]
    test_recs = shuffled[n_train + n_val:]
    if not test_recs:
        test_recs = [val_recs[-1]]

    return (
        SimpleDataFrame(train_recs),
        SimpleDataFrame(val_recs),
        SimpleDataFrame(test_recs),
    )


def get_all_prompt_splits(
    df: Any,
    train_size: float = 0.8,
    val_size: float = 0.1,
    test_size: float = 0.1,
    random_state: int = 42,
) -> Dict[int, Dict[str, Any]]:
    """Produce train, val, and test splits for all available essay sets in the DataFrame."""
    splits = {}
    if hasattr(df, "unique"):
        available_sets = sorted(df["essay_set"].unique())
    elif hasattr(df, "__getitem__"):
        available_sets = sorted(set(df["essay_set"]))
    else:
        available_sets = list(ASAP_RUBRIC_CONFIG.keys())

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
) -> Any:
    """Generate a synthetic ASAP dataset spanning all 8 prompts for testing and scaffolding."""
    rng = random.Random(random_state)
    records: List[Dict[str, Any]] = []
    essay_id = 1

    prompt_topics = {
        1: ("computers and technology in education", "digital learning"),
        2: ("censorship and book removal from public libraries", "intellectual freedom"),
        3: ("the cyclist facing intense physical desert terrain", "stamina and grit"),
        4: ("the hibiscus plant and nostalgic emotional heritage", "cultural identity"),
        5: ("Narciso Rodriguez and his familial design inspiration", "fashion and heritage"),
        6: ("the historic dirigibles and lighter-than-air navigation", "aeronautical engineering"),
        7: ("patience and overcoming difficult personal challenges", "character development"),
        8: ("laughter and humorous moments diffusing interpersonal awkwardness", "social cohesion"),
    }

    high_phrases = [
        "In addition, thorough investigation demonstrates that rigorous analysis is indispensable.",
        "Furthermore, multiple empirical viewpoints emphasize the profound long-term significance.",
        "Consequently, coherent synthesis of diverse evidence directly substantiates the central thesis.",
        "Ultimately, persistent dedication and critical reflection cultivate transformative societal progress.",
    ]
    mid_phrases = [
        "Also, this situation shows how people can learn important lessons from daily experience.",
        "For example, several clear reasons explain why individuals should focus on these goals.",
        "Therefore, practicing good habits regularly makes a noticeable difference over time.",
    ]
    low_phrases = [
        "I think this is okay but sometimes it does not work well.",
        "People should just try harder because that is good.",
    ]

    for essay_set, rubric in ASAP_RUBRIC_CONFIG.items():
        min_s = int(rubric["min_score"])
        max_s = int(rubric["max_score"])
        possible_scores = list(range(min_s, max_s + 1)) if max_s > min_s else [min_s]
        topic, theme = prompt_topics.get(essay_set, ("general topics", "critical thinking"))

        for _ in range(samples_per_set):
            score = float(rng.choice(possible_scores))
            scaled = rescale_score(score, essay_set)

            # Synthesize text length and vocabulary richness corresponding to rubric quality
            body_parts = [
                f"Regarding {topic}, the core issue centers on {theme}.",
            ]
            if scaled >= 0.70:
                body_parts.extend(rng.sample(high_phrases, k=3))
                body_parts.append(
                    f"In summary, comprehensive consideration of {topic} reinforces our commitment to {theme}."
                )
            elif scaled >= 0.35:
                body_parts.extend(rng.sample(mid_phrases, k=2))
                body_parts.append(
                    f"To conclude, {topic} provides helpful insight into how we handle {theme}."
                )
            else:
                body_parts.extend(rng.sample(low_phrases, k=1))
                body_parts.append("That is all I have to say about it.")

            essay_text = " ".join(body_parts)

            records.append({
                "essay_id": essay_id,
                "essay_set": essay_set,
                "essay": essay_text,
                "domain1_score": score,
                "scaled_score": scaled,
            })
            essay_id += 1

    if pd is not None:
        return getattr(pd, "DataFrame")(records)
    return SimpleDataFrame(records)

