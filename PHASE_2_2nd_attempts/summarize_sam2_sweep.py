#!/usr/bin/env python3
"""Summarize Replicate SAM2 sweep outputs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2


def mask_area(path: Path) -> int:
    image = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if image is None:
        return 0
    return int((image > 0).sum())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("sweep_dir", type=Path)
    args = parser.parse_args()

    rows = []
    for run_dir in sorted(p for p in args.sweep_dir.iterdir() if p.is_dir()):
        final_path = run_dir / "prediction_final.json"
        if not final_path.exists():
            continue
        final = json.loads(final_path.read_text(encoding="utf-8"))
        masks = sorted((run_dir / "individual_masks").glob("*.png"))
        areas = sorted([mask_area(path) for path in masks], reverse=True)
        rows.append(
            {
                "run": run_dir.name,
                "status": final.get("status"),
                "predict_time": (final.get("metrics") or {}).get("predict_time"),
                "total_time": (final.get("metrics") or {}).get("total_time"),
                "combined_area": mask_area(run_dir / "combined_mask.png"),
                "mask_count": len(masks),
                "top_areas": areas[:8],
            }
        )

    print(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()

