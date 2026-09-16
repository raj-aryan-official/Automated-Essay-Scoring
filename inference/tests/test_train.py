"""Unit tests for the per-prompt LoRA/PEFT training loop (inference/app/engine/train.py).

Verifies:
1. PromptTrainer initialization, hyperparameter defaults, and config parsing.
2. Dataset loading and stratification using ASAP dataset adapter.
3. LoRA/PEFT model structure and regression head execution with MSE loss.
4. TensorBoard metric logging (loss/train, loss/val, learning_rate).
5. Validation loss tracking and checkpoint creation under inference/checkpoints/{prompt_id}/.
6. Checkpoint metadata integrity (JSON payload with hyperparameters and loss metrics).
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest

from app.engine.train import (
    BertLoRAEssayRegressor,
    PromptTrainer,
    TensorBoardLogger,
    train_prompt,
)


def test_trainer_initialization(tmp_path: Path):
    """Verify PromptTrainer initialization and path resolution."""
    trainer = PromptTrainer(
        prompt_id=1,
        epochs=3,
        batch_size=16,
        learning_rate=3e-5,
        checkpoint_dir=tmp_path / "checkpoints" / "1",
        log_dir=tmp_path / "logs" / "1",
    )

    assert trainer.prompt_id == 1
    assert trainer.epochs == 3
    assert trainer.batch_size == 16
    assert trainer.learning_rate == 3e-5
    assert trainer.lora_r == 8
    assert trainer.lora_alpha == 16
    assert trainer.warmup_ratio == 0.1
    assert trainer.checkpoint_dir == tmp_path / "checkpoints" / "1"


def test_trainer_data_loading():
    """Verify data loading and splitting for a prompt via ASAP adapter."""
    trainer = PromptTrainer(prompt_id=2)
    train_df, val_df, test_df = trainer.load_data()

    assert len(train_df) > 0
    assert len(val_df) > 0
    assert len(test_df) > 0

    assert "essay" in train_df.columns
    assert "scaled_score" in train_df.columns
    # Check normalized bounds [0, 1]
    for score in train_df["scaled_score"]:
        assert 0.0 <= float(score) <= 1.0


def test_tensorboard_logger(tmp_path: Path):
    """Verify TensorBoardLogger records scalars to disk."""
    log_dir = tmp_path / "tb_logs"
    logger = TensorBoardLogger(log_dir=log_dir)

    logger.add_scalar("loss/train", 0.045, global_step=1)
    logger.add_scalar("loss/val", 0.052, global_step=1)
    logger.add_scalar("learning_rate", 2e-5, global_step=1)
    logger.close()

    scalar_file = log_dir / "scalars.jsonl"
    assert scalar_file.is_file()
    lines = scalar_file.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 3

    entry = json.loads(lines[0])
    assert entry["tag"] == "loss/train"
    assert entry["value"] == pytest.approx(0.045)
    assert entry["step"] == 1


def test_train_prompt_and_checkpoints(tmp_path: Path):
    """Verify end-to-end training execution, validation checkpointing, and metadata generation."""
    ckpt_dir = tmp_path / "checkpoints" / "1"
    tb_dir = tmp_path / "runs" / "prompt_1"

    result = train_prompt(
        prompt_id=1,
        epochs=3,
        batch_size=8,
        learning_rate=2e-5,
        checkpoint_dir=ckpt_dir,
        log_dir=tb_dir,
    )

    assert result["prompt_id"] == 1
    assert result["epochs_completed"] == 3
    assert result["best_val_loss"] < float("inf")
    assert len(result["history"]) == 3

    # Check that checkpoint directory exists and contains checkpoint artifacts
    assert ckpt_dir.is_dir()
    meta_path = ckpt_dir / "checkpoint_metadata.json"
    assert meta_path.is_file()

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["prompt_id"] == 1
    assert meta["loss_metric"] == "MSE"
    assert meta["status"] == "IMPROVED"
    assert "hyperparameters" in meta
    assert meta["hyperparameters"]["lora_r"] == 8
    assert meta["hyperparameters"]["epochs"] == 3
    assert meta["best_epoch"] >= 1
    assert meta["val_loss"] <= result["best_val_loss"]

    # Verify regression head weight file exists
    assert (ckpt_dir / "regression_head.pt").is_file()


def test_train_prompt_set_2(tmp_path: Path):
    """Verify training loop on ASAP Prompt 2."""
    ckpt_dir = tmp_path / "checkpoints" / "2"
    result = train_prompt(
        prompt_id=2,
        epochs=2,
        batch_size=4,
        checkpoint_dir=ckpt_dir,
    )

    assert result["prompt_id"] == 2
    assert result["epochs_completed"] == 2
    assert (ckpt_dir / "checkpoint_metadata.json").is_file()


def test_bert_lora_regressor_instantiation():
    """Verify model initialization and attributes."""
    model = BertLoRAEssayRegressor(
        base_model_name="bert-base-uncased",
        hidden_dim=128,
        lora_r=8,
        lora_alpha=16,
    )
    assert model.hidden_dim == 128
    assert model.regression_head.hidden_dim == 128
