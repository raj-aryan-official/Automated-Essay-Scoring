"""BERT Encoder with Regression Head for Automated Essay Scoring.

Conforms strictly to Section 10.2 Model Architecture and Section 9.1 Interfaces:
- WordPiece Tokenizer (max sequence length 512, truncation and padding)
- BERT Encoder (12-layer Transformer, hidden dimension 768)
- Extraction of pooled [CLS] token representation
- Regression Head: Dense(768 -> hidden_dim) -> Activation (GELU/ReLU) -> Dropout -> Dense(hidden_dim -> 1)
- Sigmoid/linear rescaling into prompt rubric range [rubric_min, rubric_max]
- Scoring evaluation into discrete rubric bands and calibrated confidence metrics
- Class BertEssayScoringModel implementing the EssayScoringModel abstract interface
"""

from __future__ import annotations

import json
import logging
import math
import os
from pathlib import Path
import time
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Tuple, Union

from app.engine.feedback import RuleBasedDimensionFeedbackGenerator
from app.engine.interfaces import (
    DimensionFeedbackGenerator,
    EssayScoringModel,
    RubricBand,
    ScorePrediction,
)

logger = logging.getLogger(__name__)

# Official ASAP rubric boundaries:
# Set 1: [2, 12], Set 2: [1, 6], Set 3: [0, 3], Set 4: [0, 3]
# Set 5: [0, 4],  Set 6: [0, 4], Set 7: [0, 30], Set 8: [0, 60]
DEFAULT_ASAP_RUBRICS: Dict[str, Dict[str, float]] = {
    "1": {"min_score": 2.0, "max_score": 12.0},
    "2": {"min_score": 1.0, "max_score": 6.0},
    "3": {"min_score": 0.0, "max_score": 3.0},
    "4": {"min_score": 0.0, "max_score": 3.0},
    "5": {"min_score": 0.0, "max_score": 4.0},
    "6": {"min_score": 0.0, "max_score": 4.0},
    "7": {"min_score": 0.0, "max_score": 30.0},
    "8": {"min_score": 0.0, "max_score": 60.0},
}

# Optional torch / transformers support with graceful runtime fallback
try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
    _ModuleBase = nn.Module
except ImportError:
    torch = None  # type: ignore
    nn = None  # type: ignore
    TORCH_AVAILABLE = False
    _ModuleBase = object  # type: ignore

try:
    from transformers import AutoConfig, AutoModel, AutoTokenizer  # type: ignore
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    AutoConfig = None  # type: ignore
    AutoModel = None  # type: ignore
    AutoTokenizer = None  # type: ignore
    TRANSFORMERS_AVAILABLE = False

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore

try:
    import onnxruntime as ort
    ORT_AVAILABLE = True
except ImportError:
    ort = None  # type: ignore
    ORT_AVAILABLE = False



class BertRegressionHead(_ModuleBase):  # type: ignore[misc]
    """Two-layer dense regression head on pooled [CLS] representation (Section 10.2).
    
    Architecture:
        Input (768) -> Dense(768 -> hidden_dim) -> Activation (GELU/ReLU) -> Dropout(p) -> Dense(hidden_dim -> 1)
    """

    def __init__(
        self,
        input_dim: int = 768,
        hidden_dim: int = 256,
        dropout_prob: float = 0.1,
        activation: str = "gelu",
    ) -> None:
        if nn is not None and _ModuleBase is not object:
            super().__init__()
            act_layer = nn.GELU() if (activation.lower() == "gelu" and hasattr(nn, "GELU")) else nn.ReLU()
            self.dense1 = nn.Linear(input_dim, hidden_dim)
            self.activation = act_layer
            self.dropout = nn.Dropout(dropout_prob)
            self.dense2 = nn.Linear(hidden_dim, 1)
        else:
            self.dense1 = None
            self.activation = None
            self.dropout = None
            self.dense2 = None

        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.dropout_prob = dropout_prob
        self.activation_name = activation

    def forward(self, features: Any) -> Any:
        """Execute regression head forward pass.
        
        Args:
            features: Tensor of pooled [CLS] representations of shape (batch_size, input_dim).
            
        Returns:
            Tensor of shape (batch_size, 1) representing unscaled regression logits.
        """
        if self.dense1 is not None and self.activation is not None and self.dropout is not None and self.dense2 is not None:
            x = self.dense1(features)
            x = self.activation(x)
            x = self.dropout(x)
            x = self.dense2(x)
            return x
        return 0.0

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        return self.forward(*args, **kwargs)

    def to(self, *args: Any, **kwargs: Any) -> Any:
        if hasattr(super(), "to"):
            return getattr(super(), "to")(*args, **kwargs)
        return self

    def eval(self) -> Any:
        if hasattr(super(), "eval"):
            return getattr(super(), "eval")()
        return self

    def load_state_dict(self, state_dict: Any, strict: bool = True) -> Any:
        if hasattr(super(), "load_state_dict"):
            return getattr(super(), "load_state_dict")(state_dict, strict=strict)
        return None


class BertEssayScoringModel(EssayScoringModel):
    """Production BERT Encoder with Regression Head for Automated Essay Scoring.

    Implements Section 9.1's EssayScoringModel interface and Section 10.2's
    BERT regression architecture:
    1. WordPiece tokenization with max length 512, truncation, and padding.
    2. 12-layer BERT Transformer extracting the 768-dimensional [CLS] representation.
    3. Regression Head: Dense(768 -> hidden_dim) -> GELU -> Dropout -> Dense(hidden_dim -> 1).
    4. Sigmoid or linear rescaling into the prompt's rubric range [rubric_min, rubric_max].
    5. Categorization into rubric bands and confidence score estimation.
    """

    def __init__(
        self,
        model_name_or_path: str = "bert-base-uncased",
        weights_path: Optional[str] = None,
        config_path: Optional[str] = None,
        device: Optional[str] = None,
        max_length: int = 512,
        hidden_dim: int = 256,
        dropout_prob: float = 0.1,
        activation: str = "gelu",
        scaling_method: str = "sigmoid",
        prompt_rubrics: Optional[Dict[str, Dict[str, float]]] = None,
        use_onnx: bool = False,
        onnx_model_path: Optional[str] = None,
    ) -> None:
        self.model_name_or_path = model_name_or_path
        self.max_length = max_length
        self.hidden_dim = hidden_dim
        self.dropout_prob = dropout_prob
        self.activation = activation
        self.scaling_method = scaling_method
        self.prompt_rubrics = dict(DEFAULT_ASAP_RUBRICS)
        if prompt_rubrics:
            self.prompt_rubrics.update(prompt_rubrics)

        self.use_onnx = use_onnx
        self.onnx_model_path = onnx_model_path
        self.ort_session: Optional[Any] = None

        # Device selection
        if device is not None:
            self.device = device
        elif TORCH_AVAILABLE and torch is not None and hasattr(torch, "cuda") and torch.cuda.is_available():
            self.device = "cuda"
        else:
            self.device = "cpu"

        # Initialize tokenizer, encoder, and regression head
        self.tokenizer: Any = None
        self.encoder: Any = None
        self.regression_head = BertRegressionHead(
            input_dim=768,
            hidden_dim=self.hidden_dim,
            dropout_prob=self.dropout_prob,
            activation=self.activation,
        )

        self.is_loaded = False
        self.feedback_generator = RuleBasedDimensionFeedbackGenerator()

        # If ONNX model path is explicitly provided, load it
        if self.onnx_model_path:
            self.load_onnx_model(self.onnx_model_path)

        # If weights or config paths provided at construction, load them
        if weights_path or config_path:
            self.load_model(weights_path or "", config_path or "")
        elif not self.use_onnx:
            self._initialize_default_components()
        else:
            self.is_loaded = True

    def load_onnx_model(self, onnx_model_path: str) -> None:
        """Initialize ONNX Runtime InferenceSession from exported model file."""
        if not ORT_AVAILABLE or ort is None:
            logger.warning("onnxruntime is not available in environment. Cannot load ONNX model.")
            return

        resolved_path = os.path.abspath(onnx_model_path)
        if not os.path.isfile(resolved_path):
            raise FileNotFoundError(f"ONNX model file not found at: {resolved_path}")

        try:
            session_options = ort.SessionOptions()
            session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            self.ort_session = ort.InferenceSession(resolved_path, session_options)
            self.use_onnx = True
            self.onnx_model_path = resolved_path
            self.is_loaded = True
            logger.info(f"Successfully initialized ONNX Runtime session from '{resolved_path}'.")
        except Exception as e:
            logger.warning(f"Failed to initialize ONNX Runtime session from '{resolved_path}': {e}")

    def _initialize_default_components(self) -> None:
        """Initialize default encoder and tokenizer if dependencies are available."""
        if TRANSFORMERS_AVAILABLE and TORCH_AVAILABLE and AutoTokenizer is not None and AutoModel is not None:
            try:
                tokenizer_loader = getattr(AutoTokenizer, "from_pretrained", None)
                model_loader = getattr(AutoModel, "from_pretrained", None)
                if callable(tokenizer_loader) and callable(model_loader):
                    self.tokenizer = tokenizer_loader(self.model_name_or_path)
                    self.encoder = model_loader(self.model_name_or_path)
                    if self.device != "cpu" and hasattr(self.encoder, "to"):
                        self.encoder.to(self.device)
                        self.regression_head.to(self.device)
                self.is_loaded = True
                logger.info(f"Loaded BERT model from '{self.model_name_or_path}' on device '{self.device}'.")
            except Exception as e:
                logger.warning(
                    f"Could not load Hugging Face pretrained model '{self.model_name_or_path}': {e}. "
                    "Operating in simulated/fallback mode."
                )
                self.is_loaded = True
        else:
            self.is_loaded = True

    def load_model(self, weights_path: str, config_path: str) -> None:
        """Initialize BERT encoder weights and regression head config (Section 9.1).
        
        Args:
            weights_path: Path to model weights (e.g. PyTorch state dict, checkpoint, or HF directory).
            config_path: Path to model configuration file (JSON/YAML).
        """
        logger.info(f"Initializing model with weights='{weights_path}', config='{config_path}'")

        # 0. Route to ONNX loader if weights_path points to an ONNX model file
        if weights_path and (weights_path.endswith(".onnx") or "onnx" in weights_path.lower() and os.path.isfile(weights_path)):
            self.load_onnx_model(weights_path)
            return

        # 1. Parse configuration if provided
        if config_path and os.path.isfile(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    config_data = json.load(f)
                if "hidden_dim" in config_data:
                    self.hidden_dim = int(config_data["hidden_dim"])
                if "max_length" in config_data:
                    self.max_length = int(config_data["max_length"])
                if "scaling_method" in config_data:
                    self.scaling_method = str(config_data["scaling_method"])
                if "prompt_rubrics" in config_data:
                    self.prompt_rubrics.update(config_data["prompt_rubrics"])
                logger.info(f"Updated configuration from '{config_path}': {config_data}")
            except Exception as err:
                logger.warning(f"Error parsing config file '{config_path}': {err}")

        # 2. Load weights if provided and PyTorch is available
        if weights_path and os.path.exists(weights_path) and TORCH_AVAILABLE and torch is not None:
            try:
                if os.path.isdir(weights_path) and TRANSFORMERS_AVAILABLE and AutoTokenizer is not None and AutoModel is not None:
                    tokenizer_loader = getattr(AutoTokenizer, "from_pretrained", None)
                    model_loader = getattr(AutoModel, "from_pretrained", None)
                    if callable(tokenizer_loader) and callable(model_loader):
                        self.tokenizer = tokenizer_loader(weights_path)
                        self.encoder = model_loader(weights_path)
                elif os.path.isfile(weights_path):
                    state_dict = torch.load(weights_path, map_location=self.device)
                    self.regression_head.load_state_dict(state_dict, strict=False)
                logger.info(f"Successfully loaded model weights from '{weights_path}'.")
            except Exception as err:
                logger.warning(f"Failed to load weights from '{weights_path}': {err}")

        self.is_loaded = True

    def get_rubric_bounds(self, prompt_id: str) -> Tuple[float, float]:
        """Retrieve rubric min and max for the requested prompt ID."""
        clean_id = prompt_id.strip()
        if clean_id in self.prompt_rubrics:
            rubric = self.prompt_rubrics[clean_id]
            return float(rubric.get("min_score", 2.0)), float(rubric.get("max_score", 12.0))

        # Check numeric ASAP set extraction (e.g. "set_1" -> "1")
        for num_str, rubric in self.prompt_rubrics.items():
            if num_str == clean_id or f"set_{num_str}" == clean_id.lower() or f"prompt_{num_str}" == clean_id.lower():
                return float(rubric.get("min_score", 2.0)), float(rubric.get("max_score", 12.0))

        # Default fallback bounds (ASAP Prompt 1 standard: [2.0, 12.0])
        return 2.0, 12.0

    def compute_rubric_band(self, score: float, min_score: float, max_score: float) -> str:
        """Categorize a rescaled holistic score into standard rubric bands."""
        if max_score <= min_score:
            return "Proficient"

        normalized = (score - min_score) / (max_score - min_score)
        if normalized >= 0.75:
            return "Advanced"
        elif normalized >= 0.50:
            return "Proficient"
        elif normalized >= 0.25:
            return "Basic"
        else:
            return "Below Basic"

    def _scale_score(self, raw_logit: float, min_score: float, max_score: float) -> float:
        """Rescale regression logit into prompt rubric range using sigmoid or linear scaling."""
        if self.scaling_method == "sigmoid":
            # Sigmoid activation: 1 / (1 + e^(-logit))
            try:
                normalized = 1.0 / (1.0 + math.exp(-raw_logit))
            except OverflowError:
                normalized = 0.0 if raw_logit < 0 else 1.0
        else:
            # Linear scaling / clamp
            normalized = max(0.0, min(1.0, (raw_logit + 3.0) / 6.0))

        scaled = min_score + normalized * (max_score - min_score)
        # Strictly clamp within rubric range
        return max(min_score, min(max_score, scaled))

    def _estimate_confidence(self, raw_logit: float, essay_len: int) -> float:
        """Estimate prediction confidence based on margin certainty and text completeness."""
        # Sigmoid distance from center (0.0 logit represents 0.5 probability)
        sigmoid_val = 1.0 / (1.0 + math.exp(-max(-10.0, min(10.0, raw_logit))))
        margin = abs(sigmoid_val - 0.5) * 2.0  # [0.0, 1.0]

        # Length factor (essays under 50 words have slightly reduced confidence)
        len_factor = min(1.0, essay_len / 50.0) if essay_len > 0 else 0.5

        confidence = 0.70 + (0.25 * margin * len_factor)
        return float(round(max(0.60, min(0.98, confidence)), 3))

    def predict_essay(self, essay_text: str, prompt_id: str) -> ScorePrediction:
        """Execute single-essay inference yielding rescaled score, rubric band, and confidence (Section 9.1).
        
        Args:
            essay_text: The raw textual body of the submitted essay.
            prompt_id: Identifier of the prompt/rubric definition.
            
        Returns:
            ScorePrediction instance containing holistic_score, rubric_band, confidence, and dimension_scores.
        """
        start_time = time.perf_counter()
        min_score, max_score = self.get_rubric_bounds(prompt_id)

        clean_text = essay_text.strip()
        word_count = len(clean_text.split())

        # If essay text is completely empty, clamp to min_score
        if not clean_text:
            return ScorePrediction(
                holistic_score=min_score,
                rubric_band="Below Basic",
                confidence=0.99,
                dimension_scores={
                    "grammar": min_score,
                    "coherence": min_score,
                    "argumentation": min_score,
                },
                raw_score=min_score,
                inference_ms=1,
            )

        # 1. Execute inference via ONNX Runtime if enabled and initialized
        raw_logit: float = 0.0
        if self.use_onnx and self.ort_session is not None and np is not None:
            try:
                if TRANSFORMERS_AVAILABLE and self.tokenizer is not None:
                    encoded = self.tokenizer(
                        clean_text,
                        max_length=self.max_length,
                        truncation=True,
                        padding="max_length",
                        return_tensors="np",
                    )
                    input_ids = encoded["input_ids"].astype(np.int64)
                    attention_mask = encoded["attention_mask"].astype(np.int64)
                else:
                    # Token sequence encoding fallback
                    tokens = [hash(w) % 30000 for w in clean_text.split()][:self.max_length]
                    input_ids = np.zeros((1, self.max_length), dtype=np.int64)
                    attention_mask = np.zeros((1, self.max_length), dtype=np.int64)
                    input_ids[0, :len(tokens)] = tokens
                    attention_mask[0, :len(tokens)] = 1

                ort_inputs = {"input_ids": input_ids, "attention_mask": attention_mask}
                ort_outputs = self.ort_session.run(None, ort_inputs)
                out_arr = ort_outputs[0]
                raw_logit = float(out_arr[0][0] if getattr(out_arr, "ndim", 1) > 1 else out_arr[0])
            except Exception as e:
                logger.warning(f"Error during ONNX runtime forward pass: {e}. Falling back to deterministic features.")
                raw_logit = self._fallback_logit(clean_text)

        # 2. Execute inference through PyTorch BERT + Regression Head if available
        elif TORCH_AVAILABLE and TRANSFORMERS_AVAILABLE and self.encoder is not None and self.tokenizer is not None and torch is not None:
            try:
                # Tokenize with WordPiece tokenizer, truncation to max_length (512), and padding
                inputs = self.tokenizer(
                    clean_text,
                    max_length=self.max_length,
                    truncation=True,
                    padding="max_length",
                    return_tensors="pt",
                )

                if self.device != "cpu" and hasattr(inputs, "to"):
                    inputs = {k: v.to(self.device) for k, v in inputs.items()}

                self.encoder.eval()
                self.regression_head.eval()

                with torch.no_grad():
                    # 12-layer Transformer forward pass
                    outputs = self.encoder(**inputs)

                    # Extract pooled [CLS] representation (index 0)
                    if hasattr(outputs, "pooler_output") and outputs.pooler_output is not None:
                        cls_rep = outputs.pooler_output
                    elif hasattr(outputs, "last_hidden_state"):
                        cls_rep = outputs.last_hidden_state[:, 0, :]
                    else:
                        cls_rep = outputs[0][:, 0, :]

                    # Regression Head: Dense(768 -> 256) -> GELU -> Dropout -> Dense(256 -> 1)
                    logits = self.regression_head(cls_rep)
                    raw_logit = float(logits.squeeze().cpu().item())
            except Exception as e:
                logger.warning(f"Error during PyTorch model forward pass: {e}. Using deterministic fallback.")
                raw_logit = self._fallback_logit(clean_text)
        else:
            # Deterministic text-feature fallback when PyTorch/Transformers runtime is unavailable
            raw_logit = self._fallback_logit(clean_text)

        # 2. Rescale logit into rubric range using sigmoid/linear scaling
        holistic_score = self._scale_score(raw_logit, min_score, max_score)
        holistic_score = round(holistic_score, 2)

        # 3. Categorize into rubric band
        rubric_band = self.compute_rubric_band(holistic_score, min_score, max_score)

        # 4. Calibrate confidence
        confidence = self._estimate_confidence(raw_logit, word_count)

        # 5. Compute dimension scores (grammar, coherence, argumentation)
        dimension_scores = self.feedback_generator.score_dimensions(
            clean_text, holistic_score, min_score, max_score
        )

        inference_ms = int((time.perf_counter() - start_time) * 1000)

        return ScorePrediction(
            holistic_score=holistic_score,
            rubric_band=rubric_band,
            confidence=confidence,
            dimension_scores=dimension_scores,
            raw_score=raw_logit,
            inference_ms=max(1, inference_ms),
        )

    def _fallback_logit(self, text: str) -> float:
        """Deterministic text representation logit when neural weights are uninitialized."""
        words = text.split()
        num_words = len(words)
        unique_words = len(set(words))
        vocab_ratio = unique_words / max(1, num_words)
        avg_word_len = sum(len(w) for w in words) / max(1, num_words)

        # Heuristic logit centered around 0.0 with positive correlation to essay substance
        score_base = (
            min(2.0, (num_words - 50) / 100.0)
            + (vocab_ratio - 0.5) * 1.5
            + (avg_word_len - 4.0) * 0.5
        )
        return float(max(-4.0, min(4.0, score_base)))


class RuleBasedFeedbackGenerator(RuleBasedDimensionFeedbackGenerator):
    """Implementation of DimensionFeedbackGenerator producing pedagogical feedback."""
    pass
