"""Model engine package: BERT encoder + regression head.

Exports Section 9.1 and Section 10.2 interfaces and models:
- RubricBand
- ScorePrediction
- EssayScoringModel
- DimensionFeedbackGenerator
- BertRegressionHead
- BertEssayScoringModel
- RuleBasedFeedbackGenerator
- PromptTrainer
- train_prompt
"""

from app.engine.interfaces import (
    DimensionFeedbackGenerator,
    EssayScoringModel,
    RubricBand,
    ScorePrediction,
)
from app.engine.model import (
    BertEssayScoringModel,
    BertRegressionHead,
    RuleBasedFeedbackGenerator,
)
from app.engine.train import (
    PromptTrainer,
    TensorBoardLogger,
    train_prompt,
)

__all__ = [
    "RubricBand",
    "ScorePrediction",
    "EssayScoringModel",
    "DimensionFeedbackGenerator",
    "BertRegressionHead",
    "BertEssayScoringModel",
    "RuleBasedFeedbackGenerator",
    "PromptTrainer",
    "TensorBoardLogger",
    "train_prompt",
]
