#!/usr/bin/env python3
"""Environment and Hardware Acceleration Verification Script.

Checks for CUDA availability via torch.cuda.is_available(), inspects GPU
specifications, and falls back gracefully to CPU with appropriate warnings.
"""

import os
import platform
import sys


def check_environment() -> str:
    """Verify PyTorch hardware acceleration environment.

    Returns:
        str: Active compute device string ('cuda' or 'cpu').
    """
    print("=" * 60)
    print(" Automated Essay Scoring — Compute Environment Verification")
    print("=" * 60)
    print(f"Python Version : {sys.version.split()[0]}")
    print(f"OS Platform    : {platform.system()} {platform.release()} ({platform.machine()})")

    try:
        import torch
    except ImportError:
        print("\n[ERROR] PyTorch is not installed in the current environment.")
        print("Please install requirements using: pip install -r requirements.txt")
        return "none"

    print(f"PyTorch Version: {torch.__version__}")

    # Check CUDA Availability
    if torch.cuda.is_available():
        device_count = torch.cuda.device_count()
        current_device = torch.cuda.current_device()
        device_name = torch.cuda.get_device_name(current_device)
        cuda_version = torch.version.cuda
        vram_gb = torch.cuda.get_device_properties(current_device).total_memory / (1024 ** 3)

        print("-" * 60)
        print(f"[SUCCESS] CUDA is available!")
        print(f"CUDA Version   : {cuda_version}")
        print(f"GPU Device(s)  : {device_count} detected")
        print(f"Active Device  : [{current_device}] {device_name}")
        print(f"Dedicated VRAM : {vram_gb:.2f} GB")
        print("-" * 60)
        print("[INFO] GPU acceleration is active and ready for BERT training/inference.")
        return "cuda"
    else:
        print("-" * 60)
        print("[WARNING] No CUDA-capable GPU detected or CUDA runtime is unavailable.")
        print("Falling back gracefully to CPU compute.")
        print(f"CPU Processor  : {platform.processor() or 'Standard CPU'}")
        print(f"Logical Cores  : {os.cpu_count() or 'Unknown'}")
        print("-" * 60)
        print("[NOTE] Inference will execute on CPU. Note that training and low-latency")
        print("scoring (<300ms) require an NVIDIA GPU with Tensor Cores.")
        print("For CUDA support, install PyTorch with CUDA enabled:")
        print("  pip install torch --index-url https://download.pytorch.org/whl/cu121")
        return "cpu"


if __name__ == "__main__":
    device = check_environment()
    sys.exit(0 if device in ("cuda", "cpu") else 1)
