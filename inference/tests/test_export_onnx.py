"""Unit and benchmark verification tests for ONNX model export and ONNX Runtime inference.

Verifies:
1. Exporting trained checkpoints to ONNX format with dynamic axes.
2. Metadata generation and ONNX graph validation.
3. ONNX Runtime InferenceSession forward pass across variable batch sizes.
4. BertEssayScoringModel integration with use_onnx=True and onnx_model_path.
5. Inference latency percentiles (p50 and p95) and NFR <= 300ms compliance.
6. CLI execution of export_onnx.py with JSON export.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING, Any
import pytest

from app.engine.export_onnx import (
    BenchmarkReport,
    LatencyMetrics,
    benchmark_inference_paths,
    export_checkpoint_to_onnx,
    main as onnx_main,
    render_benchmark_table,
)
from app.engine.model import BertEssayScoringModel

if TYPE_CHECKING:
    import numpy as np
    import onnxruntime as ort
    ORT_AVAILABLE = True
else:
    try:
        import numpy as np
        import onnxruntime as ort
        ORT_AVAILABLE = True
    except ImportError:
        np = None  # type: ignore
        ort = None  # type: ignore
        ORT_AVAILABLE = False


@pytest.fixture
def exported_onnx_model(tmp_path: Path) -> Path:
    """Fixture producing a validated ONNX model file in a temporary checkpoint folder."""
    ckpt_dir = tmp_path / "checkpoints" / "1"
    onnx_file = export_checkpoint_to_onnx(
        checkpoint_dir=ckpt_dir,
        prompt_id=1,
    )
    return onnx_file


def test_export_checkpoint_creates_valid_onnx_and_metadata(tmp_path: Path):
    """Assert ONNX export creates model.onnx and validated metadata record."""
    ckpt_dir = tmp_path / "checkpoints" / "1"
    onnx_path = export_checkpoint_to_onnx(
        checkpoint_dir=ckpt_dir,
        output_path=ckpt_dir / "custom_model.onnx",
        prompt_id=1,
    )

    assert onnx_path.is_file()
    assert onnx_path.stat().st_size > 0

    # Verify metadata JSON
    meta_path = ckpt_dir / "model_onnx_metadata.json"
    assert meta_path.is_file()

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["model_file"] == "custom_model.onnx"
    assert meta["opset_version"] == 14
    assert meta["status"] == "VERIFIED"
    assert meta["nfr_target_ms"] == 300.0
    assert "input_ids" in meta["input_tensors"]
    assert "attention_mask" in meta["input_tensors"]
    assert "logits" in meta["output_tensors"]
    assert "batch_size" in meta["dynamic_axes"]["input_ids"]


def test_onnxruntime_inference_dynamic_axes(exported_onnx_model: Path):
    """Verify onnxruntime loads model and executes across dynamic batch sizes and lengths."""
    if not ORT_AVAILABLE or ort is None or np is None:
        pytest.skip("onnxruntime or numpy not installed.")

    session = ort.InferenceSession(str(exported_onnx_model))
    assert session is not None

    # Test batch size 1, sequence length 128
    ids_1 = np.ones((1, 128), dtype=np.int64)
    mask_1 = np.ones((1, 128), dtype=np.int64)
    res_1 = session.run(None, {"input_ids": ids_1, "attention_mask": mask_1})
    out_1: Any = res_1[0]
    assert isinstance(out_1, np.ndarray)
    assert out_1.shape == (1, 1)

    # Test batch size 4, sequence length 512
    ids_4 = np.ones((4, 512), dtype=np.int64)
    mask_4 = np.ones((4, 512), dtype=np.int64)
    res_4 = session.run(None, {"input_ids": ids_4, "attention_mask": mask_4})
    out_4: Any = res_4[0]
    assert isinstance(out_4, np.ndarray)
    assert out_4.shape == (4, 1)



def test_bert_scoring_model_onnx_mode(exported_onnx_model: Path):
    """Verify BertEssayScoringModel operates in ONNX mode yielding calibrated predictions."""
    model = BertEssayScoringModel(
        use_onnx=True,
        onnx_model_path=str(exported_onnx_model),
    )

    assert model.use_onnx is True
    assert model.onnx_model_path == str(exported_onnx_model.resolve())
    assert model.ort_session is not None

    essay = (
        "Computers and technology dramatically improve educational outcomes. "
        "Students access research materials and communicate effectively."
    )
    prediction = model.predict_essay(essay, prompt_id="1")

    assert prediction.holistic_score >= 2.0
    assert prediction.holistic_score <= 12.0
    assert prediction.rubric_band in ["Below Basic", "Basic", "Proficient", "Advanced"]
    assert prediction.confidence >= 0.60
    assert "grammar" in prediction.dimension_scores
    assert prediction.inference_ms is not None
    assert prediction.inference_ms <= 300


def test_bert_scoring_model_onnx_weights_path_routing(exported_onnx_model: Path):
    """Verify load_model routes to load_onnx_model when path ends in .onnx."""
    model = BertEssayScoringModel()
    model.load_model(weights_path=str(exported_onnx_model), config_path="")

    assert model.use_onnx is True
    assert model.ort_session is not None


def test_benchmark_inference_paths_meets_nfr_target(exported_onnx_model: Path):
    """Verify benchmarking computes p50/p95 and confirms ONNX satisfies <= 300ms NFR target."""
    report = benchmark_inference_paths(
        onnx_model_path=exported_onnx_model,
        num_iterations=25,
        prompt_id=1,
        nfr_target_ms=300.0,
    )

    assert isinstance(report, BenchmarkReport)
    assert report.onnx_metrics.iterations == 25
    assert report.onnx_metrics.p50 >= 0.0
    assert report.onnx_metrics.p95 >= 0.0

    # Verify NFR compliance: p95 latency must stay under 300ms
    assert report.onnx_metrics.p95 <= 300.0, f"ONNX p95 was {report.onnx_metrics.p95}ms, exceeding 300ms"
    assert report.nfr_passed is True

    # Check table formatting
    table = render_benchmark_table(report)
    assert "INFERENCE LATENCY BENCHMARK: PYTORCH vs ONNX RUNTIME" in table
    assert "NFR <= 300.0 ms per essay" in table
    assert "ONNX Runtime" in table
    assert "PASS" in table


def test_export_onnx_cli_with_json(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Verify export_onnx.py CLI exports model, runs benchmark, and saves report JSON."""
    ckpt_dir = tmp_path / "checkpoints" / "1"
    json_path = tmp_path / "onnx_benchmark.json"

    monkeypatch.setattr(
        "sys.argv",
        [
            "export_onnx.py",
            "--prompt_id", "1",
            "--checkpoint_dir", str(ckpt_dir),
            "--num_iterations", "15",
            "--nfr_target_ms", "300.0",
            "--output_json", str(json_path),
        ],
    )

    exit_code = onnx_main()
    assert exit_code == 0
    assert (ckpt_dir / "model.onnx").is_file()
    assert json_path.is_file()

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["nfr_passed"] is True
    assert data["nfr_target_ms"] == 300.0
    assert data["onnx_metrics"]["p95"] <= 300.0
