#!/usr/bin/env python3
"""Create a visual sheet for SAM2 parameter sweep outputs."""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np


def read(path: Path):
    img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise SystemExit(f"Could not read {path}")
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.shape[2] == 4:
        alpha = img[:, :, 3:4] / 255
        img = (img[:, :, :3] * alpha + 255 * (1 - alpha)).astype("uint8")
    return img[:, :, :3]


def fit(img, size=(220, 170)):
    w, h = size
    ih, iw = img.shape[:2]
    scale = min(w / iw, h / ih)
    nw, nh = max(1, int(iw * scale)), max(1, int(ih * scale))
    resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)
    canvas = np.full((h, w, 3), 255, dtype=np.uint8)
    x, y = (w - nw) // 2, (h - nh) // 2
    canvas[y : y + nh, x : x + nw] = resized
    return canvas


def label(img, text):
    out = img.copy()
    cv2.rectangle(out, (0, 0), (out.shape[1], 28), (255, 255, 255), -1)
    cv2.putText(out, text, (8, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 2, cv2.LINE_AA)
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("sweep_dir", type=Path)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    rows = []
    for run_dir in sorted(p for p in args.sweep_dir.iterdir() if p.is_dir()):
        cells = [label(fit(read(run_dir / "combined_mask.png")), f"{run_dir.name} combined")]
        masks = sorted((run_dir / "individual_masks").glob("*.png"))
        masks = sorted(masks, key=lambda p: int((cv2.imread(str(p), cv2.IMREAD_GRAYSCALE) > 0).sum()), reverse=True)
        for path in masks[:5]:
            cells.append(label(fit(read(path)), path.stem))
        rows.append(np.hstack(cells))

    sheet = np.vstack(rows)
    out = args.out or args.sweep_dir / "sweep_sheet.png"
    cv2.imwrite(str(out), sheet)
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()

