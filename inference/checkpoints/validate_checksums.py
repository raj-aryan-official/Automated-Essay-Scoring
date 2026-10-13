#!/usr/bin/env python3
"""Checkpoint SHA-256 Integrity Validation Script.

Verifies model checkpoints and metadata artifacts against the SHA-256 integrity
manifest (checksums.sha256) per Section 13 CI/CD gating requirements.
"""

from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path


def compute_sha256(file_path: Path, chunk_size: int = 65536) -> str:
    """Compute the SHA-256 hexadecimal digest of a file in chunks."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(chunk_size):
            hasher.update(chunk)
    return hasher.hexdigest()


def validate_checksums(
    manifest_path: Path,
    base_dir: Path | None = None,
    strict: bool = False,
) -> bool:
    """Validate checkpoint artifacts against a sha256 manifest.

    Args:
        manifest_path: Path to checksums.sha256 file.
        base_dir: Directory where checkpoint artifacts reside (default: manifest dir).
        strict: If True, treat missing files as validation failures.

    Returns:
        True if all checked artifacts match and no failures occurred, False otherwise.
    """
    if not manifest_path.is_file():
        print(f"[ERROR] Manifest file not found at: {manifest_path}", file=sys.stderr)
        return False

    if base_dir is None:
        base_dir = manifest_path.parent

    print("=" * 68)
    print(" Checkpoint Artifact SHA-256 Integrity Validation")
    print("=" * 68)
    print(f"Manifest Path   : {manifest_path.resolve()}")
    print(f"Checkpoints Dir : {base_dir.resolve()}")
    print("-" * 68)

    passed_count = 0
    failed_count = 0
    skipped_count = 0

    with open(manifest_path, encoding="utf-8") as f:
        lines = f.readlines()

    entries = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        parts = stripped.split(None, 1)
        if len(parts) == 2:
            expected_hash, rel_path = parts[0].strip(), parts[1].strip().lstrip("*")
            entries.append((expected_hash, rel_path))

    if not entries:
        print("[WARNING] Manifest file is empty or contains no valid checksum entries.")
        print("-" * 68)
        print("[SUCCESS] Integrity check passed (no entries to validate).")
        return True

    for expected_hash, rel_path in entries:
        target_path = base_dir / rel_path

        if target_path.is_file():
            computed_hash = compute_sha256(target_path)
            if computed_hash.lower() == expected_hash.lower():
                print(f"[PASS] {rel_path:<35} SHA-256: {computed_hash[:16]}...")
                passed_count += 1
            else:
                print(f"[FAIL] {rel_path:<35} HASH MISMATCH!")
                print(f"       Expected: {expected_hash}")
                print(f"       Actual  : {computed_hash}")
                failed_count += 1
        else:
            if strict:
                print(f"[FAIL] {rel_path:<35} FILE NOT FOUND (Strict mode)")
                failed_count += 1
            else:
                print(f"[SKIP] {rel_path:<35} Not present locally (external storage)")
                skipped_count += 1

    print("-" * 68)
    print(
        f"Summary: {passed_count} passed, {failed_count} failed, "
        f"{skipped_count} skipped (external storage)"
    )
    print("=" * 68)

    if failed_count > 0:
        print("[ERROR] Checksum verification failed!", file=sys.stderr)
        return False

    print("[SUCCESS] All checkpoint artifacts verified successfully.")
    return True


def main() -> None:
    """CLI entrypoint for validate_checksums."""
    parser = argparse.ArgumentParser(
        description="Verify model checkpoints and metadata artifacts against checksums.sha256 manifest."
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=None,
        help="Path to checksums.sha256 manifest file (default: inference/checkpoints/checksums.sha256)",
    )
    parser.add_argument(
        "--check-dir",
        type=Path,
        default=None,
        help="Base directory containing checkpoint files (default: directory containing manifest)",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail if any files listed in the manifest are missing on disk",
    )
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    manifest_path = args.manifest or (script_dir / "checksums.sha256")
    base_dir = args.check_dir or script_dir

    success = validate_checksums(manifest_path, base_dir, strict=args.strict)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
