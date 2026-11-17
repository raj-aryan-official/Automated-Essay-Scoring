"""Repeated per-prompt training sweep with per-run artifact storage.

Every run gets its own directory so runs can be compared side by side:

    <output_dir>/<sweep_name>/prompt_1/run_01_seed42/
        run_config.json      # resolved hyperparameters, device, dataset provenance
        train.log            # full console log of the run
        metrics.json         # loss history, best validation loss, duration, training mode
        scalars.jsonl        # per-epoch loss and learning-rate scalars
        checkpoints/1/       # LoRA adapter, regression head, checkpoint metadata
        eval.json            # held-out QWK report (neural runs only)

The sweep also writes summary.json and summary.csv with per-run and per-prompt
aggregates. Simulation checkpoints are never evaluated: their weights are
placeholders, so a QWK from them would measure the fallback heuristic rather
than a model.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import importlib
import json
import logging
import platform
import statistics
import sys
import time
import traceback
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Ensure inference root is present in sys.path when executed directly as a script
_inference_root = Path(__file__).resolve().parent.parent.parent
if str(_inference_root) not in sys.path:
    sys.path.insert(0, str(_inference_root))

from app.dataset.asap_adapter import ASAP_RUBRIC_CONFIG
from app.engine.train import PromptTrainer
from app.eval.evaluate import evaluate_prompt

logger = logging.getLogger(__name__)

_LIBRARIES = ("torch", "transformers", "peft", "sklearn", "numpy", "pandas")


def _library_versions() -> dict[str, str]:
    versions = {"python": platform.python_version(), "platform": platform.platform()}
    for name in _LIBRARIES:
        try:
            module = importlib.import_module(name)
            versions[name] = str(getattr(module, "__version__", "unknown"))
        except ImportError:
            versions[name] = "missing"
    return versions


def _torch_available() -> bool:
    try:
        import torch  # noqa: F401

        return True
    except ImportError:
        return False


def _resolve_device(requested: str) -> str:
    if requested != "auto":
        return requested
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        return "cpu"
    except ImportError:
        return "cpu"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            digest.update(chunk)
    return digest.hexdigest()


def _describe_dataset(dataset_path: str | None) -> dict[str, Any]:
    if dataset_path:
        resolved = Path(dataset_path).resolve()
        if not resolved.is_file():
            raise FileNotFoundError(f"Dataset not found: {resolved}")
        return {
            "source": "file",
            "path": str(resolved),
            "sha256": _sha256(resolved),
        }
    return {
        "source": "synthetic scaffold",
        "path": None,
        "detail": "create_sample_asap_dataset(samples_per_set=40) generated in-process",
    }


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, default=str)


def _stats(values: list[float]) -> dict[str, float]:
    if not values:
        return {}
    return {
        "mean": round(statistics.fmean(values), 6),
        "std": round(statistics.pstdev(values), 6) if len(values) > 1 else 0.0,
        "min": round(min(values), 6),
        "max": round(max(values), 6),
    }


def _expanded_seeds(seeds_arg: str | None, runs: int, default_base: int = 42) -> list[int]:
    seeds = [int(part.strip()) for part in seeds_arg.split(",") if part.strip()] if seeds_arg else []
    if not seeds:
        seeds = list(range(default_base, default_base + runs))
    while len(seeds) < runs:
        seeds.append(seeds[-1] + 1)
    return seeds[:runs]


def run_single(
    prompt_id: int,
    run_index: int,
    seed: int,
    args: argparse.Namespace,
    device: str,
    dataset_info: dict[str, Any],
    sweep_dir: Path,
) -> dict[str, Any]:
    """Train and (optionally) evaluate one run, writing every artifact under its own directory."""
    run_dir = sweep_dir / f"prompt_{prompt_id}" / f"run_{run_index:02d}_seed{seed}"
    run_dir.mkdir(parents=True, exist_ok=True)
    ckpt_root = run_dir / "checkpoints"

    trainer = PromptTrainer(
        prompt_id=prompt_id,
        config_path=args.config,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        weight_decay=args.weight_decay,
        warmup_ratio=args.warmup_ratio,
        lora_r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        max_sequence_length=args.max_seq_len,
        checkpoint_dir=ckpt_root / str(prompt_id),
        log_dir=run_dir,
        dataset_path=args.dataset_path,
        device=device,
        seed=seed,
    )

    run_config = {
        "prompt_id": prompt_id,
        "run_index": run_index,
        "seed": seed,
        "rubric": ASAP_RUBRIC_CONFIG.get(prompt_id),
        "device": device,
        "base_model": trainer.base_model,
        "dataset": dataset_info,
        "config_file": str(Path(args.config).resolve()) if args.config else None,
        "hyperparameters": {
            "epochs": trainer.epochs,
            "batch_size": trainer.batch_size,
            "learning_rate": trainer.learning_rate,
            "weight_decay": trainer.weight_decay,
            "warmup_ratio": trainer.warmup_ratio,
            "lora_r": trainer.lora_r,
            "lora_alpha": trainer.lora_alpha,
            "lora_dropout": trainer.lora_dropout,
            "hidden_dim": trainer.hidden_dim,
            "max_sequence_length": trainer.max_sequence_length,
        },
        "environment": _library_versions(),
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_json(run_dir / "run_config.json", run_config)

    handler = logging.FileHandler(run_dir / "train.log", encoding="utf-8")
    handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    )
    logging.getLogger().addHandler(handler)

    row: dict[str, Any] = {
        "prompt_id": prompt_id,
        "run_index": run_index,
        "seed": seed,
        "status": "failed",
        "training_mode": None,
        "device": device,
        "best_val_loss": None,
        "duration_seconds": None,
        "qwk": None,
        "passed": None,
        "inference_mode": None,
    }

    start = time.perf_counter()
    try:
        result = trainer.train()
        row.update(
            {
                "status": "completed",
                "training_mode": result.get("training_mode"),
                "best_val_loss": result.get("best_val_loss"),
                "duration_seconds": round(time.perf_counter() - start, 2),
            }
        )
        _write_json(
            run_dir / "metrics.json",
            {
                **result,
                "status": "completed",
                "duration_seconds": row["duration_seconds"],
                "finished_at": datetime.now(timezone.utc).isoformat(),
            },
        )
    except Exception as exc:  # recorded, then the sweep continues
        row["duration_seconds"] = round(time.perf_counter() - start, 2)
        row["error"] = repr(exc)
        _write_json(
            run_dir / "metrics.json",
            {
                "status": "failed",
                "error": repr(exc),
                "traceback": traceback.format_exc(),
                "duration_seconds": row["duration_seconds"],
                "finished_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        logger.error(f"Prompt {prompt_id} run {run_index} (seed {seed}) failed: {exc}")
    finally:
        logging.getLogger().removeHandler(handler)
        handler.close()

    if row["status"] != "completed":
        return row

    if args.no_evaluate:
        return row

    if row["training_mode"] != "neural":
        _write_json(
            run_dir / "eval.json",
            {
                "status": "skipped",
                "reason": "simulation checkpoint holds placeholder weights, not a trained model",
            },
        )
        return row

    try:
        evaluation = evaluate_prompt(
            prompt_id=prompt_id,
            checkpoint_dir=ckpt_root,
            dataset_path=args.dataset_path,
            target_qwk=args.target_qwk,
            require_neural_model=True,
        )
        _write_json(run_dir / "eval.json", asdict(evaluation))
        row["qwk"] = evaluation.qwk
        row["passed"] = evaluation.passed
        row["inference_mode"] = evaluation.inference_mode
    except Exception as exc:  # recorded, not hidden
        _write_json(
            run_dir / "eval.json",
            {"status": "failed", "error": repr(exc), "traceback": traceback.format_exc()},
        )
        logger.error(f"Prompt {prompt_id} run {run_index} evaluation failed: {exc}")

    return row


def _write_summary(sweep_dir: Path, rows: list[dict[str, Any]], config: dict[str, Any]) -> dict[str, Any]:
    per_prompt: dict[str, Any] = {}
    for prompt_id in sorted({row["prompt_id"] for row in rows}):
        prompt_rows = [row for row in rows if row["prompt_id"] == prompt_id]
        completed = [row for row in prompt_rows if row["status"] == "completed"]
        val_losses = [row["best_val_loss"] for row in completed if row["best_val_loss"] is not None]
        qwks = [row["qwk"] for row in completed if row["qwk"] is not None]
        per_prompt[str(prompt_id)] = {
            "runs": len(prompt_rows),
            "completed": len(completed),
            "failed": len(prompt_rows) - len(completed),
            "training_modes": sorted({str(row["training_mode"]) for row in completed}),
            "best_val_loss": _stats(val_losses),
            "qwk": _stats(qwks) if qwks else None,
            "qwk_passed_runs": sum(1 for row in completed if row["passed"]),
        }

    completed_rows = [row for row in rows if row["status"] == "completed"]
    all_qwk = [row["qwk"] for row in completed_rows if row["qwk"] is not None]
    summary = {
        **config,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "overall": {
            "runs_total": len(rows),
            "completed": len(completed_rows),
            "failed": len(rows) - len(completed_rows),
            "best_val_loss": _stats(
                [row["best_val_loss"] for row in completed_rows if row["best_val_loss"] is not None]
            ),
            "qwk": _stats(all_qwk) if all_qwk else None,
            "qwk_prompt_pass_rate": (
                round(
                    sum(1 for row in completed_rows if row["passed"])
                    / len(all_qwk),
                    4,
                )
                if all_qwk
                else None
            ),
        },
        "per_prompt": per_prompt,
        "runs": rows,
    }
    _write_json(sweep_dir / "summary.json", summary)

    columns = [
        "prompt_id",
        "run_index",
        "seed",
        "status",
        "training_mode",
        "device",
        "best_val_loss",
        "duration_seconds",
        "qwk",
        "passed",
        "inference_mode",
    ]
    with open(sweep_dir / "summary.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    with open(sweep_dir / "summary.md", "w", encoding="utf-8") as f:
        f.write(_render_markdown(summary))
    return summary


def _render_markdown(summary: dict[str, Any]) -> str:
    dataset = summary["dataset"]
    lines = [
        f"# Training sweep `{summary['sweep_name']}`",
        "",
        f"- Device: `{summary['device']}`",
        f"- Dataset: {dataset.get('source')}"
        + (f" (`{dataset['path']}`)" if dataset.get("path") else ""),
        f"- Runs per prompt: {summary['runs_per_prompt']} (seeds {summary['seeds']})",
        f"- Evaluation target: QWK >= {summary['target_qwk']}",
        "",
        "| Prompt | Runs | Best val loss (mean ± std) | QWK (mean ± std) | QWK passed |",
        "|---|---|---|---|---|",
    ]
    for prompt_id, stats in sorted(summary["per_prompt"].items(), key=lambda kv: int(kv[0])):
        val_loss = stats["best_val_loss"]
        qwk = stats["qwk"]
        val_loss_text = f"{val_loss['mean']:.4f} ± {val_loss['std']:.4f}" if val_loss else "—"
        qwk_text = f"{qwk['mean']:.4f} ± {qwk['std']:.4f}" if qwk else "—"
        lines.append(
            f"| {prompt_id} | {stats['completed']}/{stats['runs']} "
            f"| {val_loss_text} | {qwk_text} | {stats['qwk_passed_runs']} |"
        )
    overall = summary["overall"]
    lines += [
        "",
        f"Runs: {overall['completed']}/{overall['runs_total']} completed, "
        f"{overall['failed']} failed. Artifacts live under each `prompt_<id>/run_<n>_seed<seed>/`.",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run a repeated per-prompt training sweep and store every run's artifacts."
    )
    parser.add_argument(
        "--prompt_ids", type=str, default="all", help="'all' or comma-separated IDs, e.g. 1,2,5"
    )
    parser.add_argument("--runs", type=int, default=3, help="Training runs per prompt")
    parser.add_argument("--seeds", type=str, default=None, help="Comma-separated seeds, e.g. 42,43,44")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch_size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--weight_decay", type=float, default=0.01)
    parser.add_argument("--warmup_ratio", type=float, default=0.1)
    parser.add_argument("--lora_r", type=int, default=8)
    parser.add_argument("--lora_alpha", type=int, default=16)
    parser.add_argument("--lora_dropout", type=float, default=0.05)
    parser.add_argument("--max_seq_len", type=int, default=512)
    parser.add_argument("--config", type=str, default=None, help="YAML config (overrides CLI hyperparameters)")
    parser.add_argument("--dataset_path", type=str, default=None)
    parser.add_argument("--device", choices=["auto", "cpu", "mps", "cuda"], default="auto")
    parser.add_argument("--target_qwk", type=float, default=0.70)
    parser.add_argument("--output_dir", type=str, default=None, help="Default: inference/runs/sweeps")
    parser.add_argument("--sweep_name", type=str, default=None)
    parser.add_argument("--no-evaluate", action="store_true", help="Train only, skip held-out evaluation")
    parser.add_argument(
        "--allow-simulation",
        action="store_true",
        help="Permit runs without PyTorch (records them as simulation artifacts)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )

    if not _torch_available() and not args.allow_simulation:
        logger.error(
            "PyTorch is not installed in this interpreter, so runs would only produce "
            "simulated losses. Install inference/requirements.txt or pass --allow-simulation."
        )
        return 2

    prompt_ids = (
        sorted(ASAP_RUBRIC_CONFIG)
        if args.prompt_ids.strip().lower() == "all"
        else [int(p.strip()) for p in args.prompt_ids.split(",") if p.strip()]
    )
    unknown = [p for p in prompt_ids if p not in ASAP_RUBRIC_CONFIG]
    if unknown:
        logger.error(f"Unknown prompt IDs: {unknown}")
        return 2

    dataset_info = _describe_dataset(args.dataset_path)
    output_root = (
        Path(args.output_dir) if args.output_dir else _inference_root / "runs" / "sweeps"
    )
    sweep_name = args.sweep_name or datetime.now().strftime("sweep_%Y%m%d_%H%M%S")
    sweep_dir = output_root / sweep_name
    if sweep_dir.exists() and any(sweep_dir.iterdir()):
        logger.error(f"Sweep directory already exists and is not empty: {sweep_dir}")
        return 2
    sweep_dir.mkdir(parents=True, exist_ok=True)

    device = _resolve_device(args.device)
    seeds = _expanded_seeds(args.seeds, args.runs)
    sweep_config = {
        "sweep_name": sweep_name,
        "sweep_dir": str(sweep_dir),
        "prompt_ids": prompt_ids,
        "runs_per_prompt": args.runs,
        "seeds": seeds,
        "device": device,
        "dataset": dataset_info,
        "evaluate": not args.no_evaluate,
        "target_qwk": args.target_qwk,
        "environment": _library_versions(),
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_json(sweep_dir / "sweep_config.json", sweep_config)
    logger.info(
        f"Sweep '{sweep_name}': {len(prompt_ids)} prompts x {args.runs} runs, "
        f"device={device}, seeds={seeds}"
    )

    rows: list[dict[str, Any]] = []
    for prompt_id in prompt_ids:
        for run_index, seed in enumerate(seeds, start=1):
            logger.info(f"--- prompt {prompt_id} run {run_index}/{args.runs} (seed {seed}) ---")
            rows.append(
                run_single(prompt_id, run_index, seed, args, device, dataset_info, sweep_dir)
            )

    summary = _write_summary(sweep_dir, rows, sweep_config)
    overall = summary["overall"]
    print("\nSweep complete")
    print(f"  artifacts : {sweep_dir}")
    print(
        f"  runs      : {overall['completed']}/{overall['runs_total']} completed"
        f" ({overall['failed']} failed)"
    )
    if overall["best_val_loss"]:
        print(f"  val loss  : mean {overall['best_val_loss']['mean']:.6f}")
    if overall["qwk"]:
        print(
            f"  QWK       : mean {overall['qwk']['mean']:.4f}"
            f" over {len([r for r in rows if r['qwk'] is not None])} evaluated runs"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
