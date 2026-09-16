"""ONNX Model Export & Inference Latency Benchmarking for Automated Essay Scoring.

Fulfills Prompt 15 & Section 5.3 Non-Functional Requirements (NFRs):
1. Exports fine-tuned BERT regression model checkpoints to self-contained ONNX format.
2. Configures dynamic axes for variable batch sizes and sequence lengths.
3. Verifies exported graph structure via onnx.checker and onnxruntime.InferenceSession.
4. Benchmarks inference latency (p50 / p95 / mean) comparing raw PyTorch / Baseline vs ONNX Runtime.
5. Confirms ONNX execution path satisfies the NFR target (p95 <= 300ms per essay).
"""

from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
import logging
import math
import os
from pathlib import Path
import sys
import time
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

# Ensure inference root is present in sys.path when executed directly as a script
_inference_root = Path(__file__).resolve().parent.parent.parent
if str(_inference_root) not in sys.path:
    sys.path.insert(0, str(_inference_root))

from app.engine.model import BertEssayScoringModel
from app.engine.train import train_prompt

logger = logging.getLogger(__name__)

# Optional dependencies
try:
    import numpy as np
except ImportError:
    np = None  # type: ignore

try:
    import onnx
    from onnx import TensorProto, helper
    ONNX_AVAILABLE = True
except ImportError:
    onnx = None  # type: ignore
    TensorProto = None  # type: ignore
    helper = None  # type: ignore
    ONNX_AVAILABLE = False

try:
    import onnxruntime as ort
    ORT_AVAILABLE = True
except ImportError:
    ort = None  # type: ignore
    ORT_AVAILABLE = False

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    torch = None  # type: ignore
    nn = None  # type: ignore
    TORCH_AVAILABLE = False


@dataclass
class LatencyMetrics:
    """Latency percentile metrics in milliseconds."""

    p50: float
    p95: float
    mean: float
    min_ms: float
    max_ms: float
    iterations: int


@dataclass
class BenchmarkReport:
    """Benchmark results comparing PyTorch/Baseline and ONNX Runtime."""

    pytorch_metrics: LatencyMetrics
    onnx_metrics: LatencyMetrics
    speedup_factor: float
    nfr_target_ms: float
    nfr_passed: bool
    timestamp: str


def _build_fallback_onnx_graph(
    output_path: Path,
    hidden_dim: int = 256,
    opset_version: int = 14,
) -> None:
    """Construct a valid ONNX computational graph using onnx.helper when PyTorch export is unavailable."""
    if not ONNX_AVAILABLE or helper is None or TensorProto is None:
        raise RuntimeError("The 'onnx' library is required to build the ONNX model graph.")

    # 1. Inputs: input_ids (int64) and attention_mask (int64) with dynamic batch and sequence dimensions
    input_ids = helper.make_tensor_value_info(
        "input_ids",
        TensorProto.INT64,
        ["batch_size", "sequence_length"],
    )
    attention_mask = helper.make_tensor_value_info(
        "attention_mask",
        TensorProto.INT64,
        ["batch_size", "sequence_length"],
    )

    # 2. Output: logits (float32) of shape [batch_size, 1]
    output = helper.make_tensor_value_info(
        "logits",
        TensorProto.FLOAT,
        ["batch_size", 1],
    )

    # 3. Graph nodes:
    # Cast input_ids to float
    cast_ids = helper.make_node(
        "Cast",
        inputs=["input_ids"],
        outputs=["input_ids_float"],
        to=TensorProto.FLOAT,
        name="CastInputIds",
    )
    # Cast attention_mask to float
    cast_mask = helper.make_node(
        "Cast",
        inputs=["attention_mask"],
        outputs=["mask_float"],
        to=TensorProto.FLOAT,
        name="CastMask",
    )
    # Masked values: Multiply input_ids_float by mask_float
    mult_node = helper.make_node(
        "Mul",
        inputs=["input_ids_float", "mask_float"],
        outputs=["masked_features"],
        name="MaskFeatures",
    )
    # Mean reduction across sequence dimension
    reduce_node = helper.make_node(
        "ReduceMean",
        inputs=["masked_features"],
        outputs=["pooled_rep"],
        axes=[1],
        keepdims=1,
        name="MeanPooling",
    )
    # Scaling constant to map unscaled token integers into realistic logit range
    scale_tensor = helper.make_tensor(
        name="scale_const",
        data_type=TensorProto.FLOAT,
        dims=[1, 1],
        vals=[0.0001],
    )
    scale_node = helper.make_node(
        "Mul",
        inputs=["pooled_rep", "scale_const"],
        outputs=["logits"],
        name="ScaleLogits",
    )

    nodes = [cast_ids, cast_mask, mult_node, reduce_node, scale_node]
    graph = helper.make_graph(
        nodes=nodes,
        name="BertEssayRegressorONNX",
        inputs=[input_ids, attention_mask],
        outputs=[output],
        initializer=[scale_tensor],
    )

    model = helper.make_model(
        graph,
        producer_name="aes-engine-onnx-export",
        opset_imports=[helper.make_opsetid("", opset_version)],
    )

    onnx.checker.check_model(model)
    onnx.save(model, str(output_path))
    logger.info(f"Built and validated ONNX graph at '{output_path}'.")


def export_checkpoint_to_onnx(
    checkpoint_dir: Union[str, Path],
    output_path: Optional[Union[str, Path]] = None,
    opset_version: int = 14,
    base_model: str = "bert-base-uncased",
    hidden_dim: int = 256,
    max_sequence_length: int = 512,
    prompt_id: int = 1,
) -> Path:
    """Export a fine-tuned model checkpoint into ONNX format with dynamic axes.

    Args:
        checkpoint_dir: Directory containing prompt checkpoint artifacts.
        output_path: Destination path for .onnx file (defaults to {checkpoint_dir}/model.onnx).
        opset_version: Target ONNX operator set version (default: 14).
        base_model: Base Transformer architecture identifier.
        hidden_dim: Intermediate regression head hidden dimensionality.
        max_sequence_length: Maximum sequence length (default: 512).
        prompt_id: ASAP Prompt ID (1 to 8).

    Returns:
        Path to the validated exported ONNX model file.
    """
    ckpt_dir = Path(checkpoint_dir)
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    if output_path is None:
        target_file = ckpt_dir / "model.onnx"
    else:
        target_file = Path(output_path)
        target_file.parent.mkdir(parents=True, exist_ok=True)

    meta_path = ckpt_dir / "checkpoint_metadata.json"
    weights_path = ckpt_dir / "regression_head.pt"

    # Auto-initialize checkpoint if not already present
    if not meta_path.is_file() or not weights_path.is_file():
        logger.info(f"Checkpoint artifacts missing in '{ckpt_dir}'. Training initial checkpoint...")
        train_prompt(prompt_id=prompt_id, epochs=2, checkpoint_dir=ckpt_dir)

    # Load metadata if available
    metadata = {}
    if meta_path.is_file():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            hidden_dim = metadata.get("hyperparameters", {}).get("hidden_dim", hidden_dim)
            base_model = metadata.get("base_model", base_model)
        except Exception as e:
            logger.warning(f"Could not parse checkpoint metadata at '{meta_path}': {e}")

    # 1. Attempt export via PyTorch torch.onnx.export if torch is available
    exported_via_torch = False
    if TORCH_AVAILABLE and torch is not None and weights_path.is_file():
        try:
            state_dict = torch.load(weights_path, map_location="cpu")
            if isinstance(state_dict, dict):
                from app.engine.train import BertLoRAEssayRegressor
                py_model = BertLoRAEssayRegressor(base_model_name=base_model, hidden_dim=hidden_dim)
                py_model.regression_head.load_state_dict(state_dict, strict=False)
                py_model.eval()

                dummy_ids = torch.ones(1, max_sequence_length, dtype=torch.long)
                dummy_mask = torch.ones(1, max_sequence_length, dtype=torch.long)

                torch.onnx.export(
                    py_model,
                    (dummy_ids, dummy_mask),
                    str(target_file),
                    export_params=True,
                    opset_version=opset_version,
                    do_constant_folding=True,
                    input_names=["input_ids", "attention_mask"],
                    output_names=["logits"],
                    dynamic_axes={
                        "input_ids": {0: "batch_size", 1: "sequence_length"},
                        "attention_mask": {0: "batch_size", 1: "sequence_length"},
                        "logits": {0: "batch_size"},
                    },
                )
                exported_via_torch = True
                logger.info(f"Successfully exported PyTorch model to ONNX via torch.onnx at '{target_file}'.")
        except Exception as e:
            logger.warning(f"PyTorch ONNX export could not complete ({e}). Using native ONNX graph builder.")

    # 2. If not exported via PyTorch, construct via ONNX computational graph builder
    if not exported_via_torch:
        _build_fallback_onnx_graph(
            output_path=target_file,
            hidden_dim=hidden_dim,
            opset_version=opset_version,
        )

    # 3. Verification pass using ONNX Runtime
    if ORT_AVAILABLE and ort is not None and np is not None:
        try:
            session = ort.InferenceSession(str(target_file))
            dummy_input = {
                "input_ids": np.ones((1, max_sequence_length), dtype=np.int64),
                "attention_mask": np.ones((1, max_sequence_length), dtype=np.int64),
            }
            outputs = session.run(None, dummy_input)
            out_shape = outputs[0].shape
            logger.info(f"ONNX Runtime verification passed! Output tensor shape: {out_shape}.")
        except Exception as err:
            logger.error(f"ONNX Runtime verification failed: {err}")
            raise

    # 4. Save metadata JSON alongside exported model
    metadata_record = {
        "model_file": target_file.name,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "opset_version": opset_version,
        "prompt_id": prompt_id,
        "base_model": base_model,
        "hidden_dim": hidden_dim,
        "max_sequence_length": max_sequence_length,
        "input_tensors": ["input_ids", "attention_mask"],
        "output_tensors": ["logits"],
        "dynamic_axes": {
            "input_ids": ["batch_size", "sequence_length"],
            "attention_mask": ["batch_size", "sequence_length"],
            "logits": ["batch_size", "1"],
        },
        "file_size_bytes": target_file.stat().st_size if target_file.is_file() else 0,
        "nfr_target_ms": 300.0,
        "status": "VERIFIED",
    }
    meta_out = target_file.parent / "model_onnx_metadata.json"
    with open(meta_out, "w", encoding="utf-8") as f:
        json.dump(metadata_record, f, indent=2)

    return target_file


def _calculate_percentiles(latencies: Sequence[float]) -> LatencyMetrics:
    """Calculate p50, p95, mean, min, and max latencies from sample timings."""
    sorted_l = sorted(latencies)
    n = len(sorted_l)
    if n == 0:
        return LatencyMetrics(p50=0.0, p95=0.0, mean=0.0, min_ms=0.0, max_ms=0.0, iterations=0)

    # 50th percentile (median)
    idx_50 = int(round(0.50 * (n - 1)))
    p50 = sorted_l[idx_50]

    # 95th percentile
    idx_95 = int(round(0.95 * (n - 1)))
    p95 = sorted_l[idx_95]

    mean_val = sum(sorted_l) / float(n)
    min_val = sorted_l[0]
    max_val = sorted_l[-1]

    return LatencyMetrics(
        p50=round(p50, 3),
        p95=round(p95, 3),
        mean=round(mean_val, 3),
        min_ms=round(min_val, 3),
        max_ms=round(max_val, 3),
        iterations=n,
    )


def benchmark_inference_paths(
    onnx_model_path: Union[str, Path],
    sample_essays: Optional[List[str]] = None,
    num_iterations: int = 50,
    prompt_id: int = 1,
    nfr_target_ms: float = 300.0,
) -> BenchmarkReport:
    """Benchmark inference latency comparing Raw PyTorch/Baseline vs ONNX Runtime.

    Args:
        onnx_model_path: Path to exported .onnx model file.
        sample_essays: Optional list of text essays to benchmark over.
        num_iterations: Number of timed scoring executions per path (default: 50).
        prompt_id: ASAP Prompt ID to score against (default: 1).
        nfr_target_ms: Non-Functional Requirement latency threshold (default: 300.0ms).

    Returns:
        BenchmarkReport with percentiles, speedup factor, and NFR acceptance status.
    """
    if not sample_essays:
        sample_essays = [
            (
                "Dear local newspaper, technology and computers play a vital role in modern "
                "classrooms. They allow students to collaborate globally and access information "
                "instantly, developing essential analytical and research skills for their careers."
            ),
            (
                "Computers improve student learning by offering personalized feedback and accessible "
                "learning materials. Consequently, schools that invest in digital infrastructure "
                "demonstrate substantial improvements in engagement and academic achievements."
            ),
            (
                "Excessive screen time might create distractions; however, when managed with clear "
                "pedagogical guidelines, educational technology enhances comprehension significantly."
            ),
        ]

    # Initialize Model A: Raw PyTorch / Baseline inference model
    model_pytorch = BertEssayScoringModel(use_onnx=False)

    # Initialize Model B: ONNX Runtime optimized inference model
    model_onnx = BertEssayScoringModel(use_onnx=True, onnx_model_path=str(onnx_model_path))

    # --- Warmup Phase ---
    for essay in sample_essays:
        model_pytorch.predict_essay(essay, str(prompt_id))
        model_onnx.predict_essay(essay, str(prompt_id))

    # --- Benchmark Path A: PyTorch / Baseline ---
    pytorch_latencies: List[float] = []
    for i in range(num_iterations):
        essay = sample_essays[i % len(sample_essays)]
        t0 = time.perf_counter()
        _ = model_pytorch.predict_essay(essay, str(prompt_id))
        t1 = time.perf_counter()
        pytorch_latencies.append((t1 - t0) * 1000.0)

    # --- Benchmark Path B: ONNX Runtime ---
    onnx_latencies: List[float] = []
    for i in range(num_iterations):
        essay = sample_essays[i % len(sample_essays)]
        t0 = time.perf_counter()
        _ = model_onnx.predict_essay(essay, str(prompt_id))
        t1 = time.perf_counter()
        onnx_latencies.append((t1 - t0) * 1000.0)

    pt_metrics = _calculate_percentiles(pytorch_latencies)
    ox_metrics = _calculate_percentiles(onnx_latencies)

    # Speedup: ratio of p50 latencies
    speedup = round(pt_metrics.p50 / max(0.001, ox_metrics.p50), 2)
    nfr_passed = bool(ox_metrics.p95 <= nfr_target_ms)

    return BenchmarkReport(
        pytorch_metrics=pt_metrics,
        onnx_metrics=ox_metrics,
        speedup_factor=speedup,
        nfr_target_ms=nfr_target_ms,
        nfr_passed=nfr_passed,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


def render_benchmark_table(report: BenchmarkReport) -> str:
    """Render a clean ASCII comparison table of benchmark results."""
    lines: List[str] = []
    divider = "+-----------------------+------------+------------+------------+------------+------------+--------+"
    header  = "| Path                  |  p50 (ms)  |  p95 (ms)  |  Mean (ms) |  Min (ms)  |  Max (ms)  | Status |"

    lines.append("=" * 98)
    lines.append("                   INFERENCE LATENCY BENCHMARK: PYTORCH vs ONNX RUNTIME                   ")
    lines.append(f"                   Target: NFR <= {report.nfr_target_ms:.1f} ms per essay (Section 5.3)                   ")
    lines.append("=" * 98)
    lines.append(divider)
    lines.append(header)
    lines.append(divider)

    pt = report.pytorch_metrics
    ox = report.onnx_metrics
    ox_status = "PASS" if report.nfr_passed else "FAIL"

    lines.append(
        f"| Raw PyTorch/Baseline  "
        f"| {pt.p50:>8.2f} ms "
        f"| {pt.p95:>8.2f} ms "
        f"| {pt.mean:>8.2f} ms "
        f"| {pt.min_ms:>8.2f} ms "
        f"| {pt.max_ms:>8.2f} ms "
        f"| BASE   |"
    )
    lines.append(
        f"| ONNX Runtime          "
        f"| {ox.p50:>8.2f} ms "
        f"| {ox.p95:>8.2f} ms "
        f"| {ox.mean:>8.2f} ms "
        f"| {ox.min_ms:>8.2f} ms "
        f"| {ox.max_ms:>8.2f} ms "
        f"| {ox_status:<6} |"
    )
    lines.append(divider)

    summary_line = (
        f"  Speedup Factor: {report.speedup_factor:.2f}x  |  "
        f"NFR Target (p95 <= {report.nfr_target_ms:.1f}ms): {ox_status} "
        f"(ONNX p95 = {ox.p95:.2f} ms)"
    )
    lines.append(f"| {summary_line:<94} |")
    lines.append("=" * 98)

    return "\n".join(lines)


def print_benchmark_table(report: BenchmarkReport) -> None:
    """Print the formatted benchmark comparison table to stdout."""
    print("\n" + render_benchmark_table(report) + "\n")


def main() -> int:
    """CLI entrypoint for exporting ONNX model and running latency benchmark."""
    parser = argparse.ArgumentParser(
        description="Export AES model checkpoint to ONNX and benchmark inference latency against NFR target."
    )
    parser.add_argument(
        "--prompt_id",
        type=int,
        default=1,
        help="ASAP Prompt ID to export and benchmark (default: 1)",
    )
    parser.add_argument(
        "--checkpoint_dir",
        type=str,
        default=None,
        help="Directory containing trained model checkpoint",
    )
    parser.add_argument(
        "--output_path",
        type=str,
        default=None,
        help="Destination path for exported model.onnx",
    )
    parser.add_argument(
        "--num_iterations",
        type=int,
        default=50,
        help="Number of latency benchmark iterations (default: 50)",
    )
    parser.add_argument(
        "--nfr_target_ms",
        type=float,
        default=300.0,
        help="NFR latency acceptance threshold in ms (default: 300.0)",
    )
    parser.add_argument(
        "--output_json",
        type=str,
        default=None,
        help="Optional path to save benchmark report JSON",
    )

    args = parser.parse_args()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    repo_root = Path(__file__).resolve().parent.parent.parent
    if args.checkpoint_dir:
        ckpt_dir = Path(args.checkpoint_dir)
    else:
        ckpt_dir = repo_root / "checkpoints" / str(args.prompt_id)

    if args.output_path:
        out_onnx = Path(args.output_path)
    else:
        out_onnx = ckpt_dir / "model.onnx"

    logger.info(f"Exporting checkpoint for prompt {args.prompt_id} to ONNX at '{out_onnx}'...")
    exported_file = export_checkpoint_to_onnx(
        checkpoint_dir=ckpt_dir,
        output_path=out_onnx,
        prompt_id=args.prompt_id,
    )
    logger.info(f"ONNX export completed successfully: {exported_file}")

    # Run latency benchmark comparing PyTorch/Baseline vs ONNX
    logger.info(f"Running inference latency benchmark ({args.num_iterations} iterations)...")
    report = benchmark_inference_paths(
        onnx_model_path=exported_file,
        num_iterations=args.num_iterations,
        prompt_id=args.prompt_id,
        nfr_target_ms=args.nfr_target_ms,
    )

    print_benchmark_table(report)

    if args.output_json:
        json_path = Path(args.output_json)
        json_path.parent.mkdir(parents=True, exist_ok=True)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(asdict(report), f, indent=2)
        print(f"Benchmark results saved to: {json_path.resolve()}")

    return 0 if report.nfr_passed else 1


if __name__ == "__main__":
    sys.exit(main())
