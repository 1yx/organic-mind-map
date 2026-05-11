#!/usr/bin/env python3
"""Create a compact preview sheet for extraction outputs."""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np


def resize_fit(image, size: tuple[int, int]):
    target_w, target_h = size
    h, w = image.shape[:2]
    scale = min(target_w / w, target_h / h)
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    canvas = np.full((target_h, target_w, 3), 255, dtype=np.uint8)
    x = (target_w - new_w) // 2
    y = (target_h - new_h) // 2
    canvas[y : y + new_h, x : x + new_w] = resized[:, :, :3]
    return canvas


def label(image, text: str):
    out = image.copy()
    cv2.rectangle(out, (0, 0), (out.shape[1], 32), (255, 255, 255), -1)
    cv2.putText(out, text, (10, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (20, 20, 20), 2, cv2.LINE_AA)
    return out


def read_color(path: Path):
    image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise SystemExit(f"Could not read {path}")
    if image.ndim == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    elif image.shape[2] == 4:
        alpha = image[:, :, 3:4] / 255.0
        image = (image[:, :, :3] * alpha + 255 * (1 - alpha)).astype("uint8")
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    output_dir = args.output_dir
    out = args.out or output_dir / "contact_sheet.png"

    panels = []
    panel_names = ["debug_overlay.png", "branches_mask.png", "text_mask.png", "doodles_mask.png"]
    if not (output_dir / "debug_overlay.png").exists() and (output_dir / "doodles_refined_mask.png").exists():
        panel_names = ["doodles_refined_mask.png", "doodles_refined_rgba.png"]

    for name in panel_names:
        panels.append(label(resize_fit(read_color(output_dir / name), (520, 390)), name))

    if len(panels) == 2:
        summary = np.hstack(panels)
    else:
        top = np.hstack(panels[:2])
        bottom = np.hstack(panels[2:])
        summary = np.vstack([top, bottom])

    crop_paths = sorted((output_dir / "doodles").glob("*.png"))[:24]
    thumb_w, thumb_h = 170, 140
    thumbs = []
    for path in crop_paths:
        thumbs.append(label(resize_fit(read_color(path), (thumb_w, thumb_h)), path.stem))

    while len(thumbs) % 6:
        thumbs.append(np.full((thumb_h, thumb_w, 3), 255, dtype=np.uint8))

    rows = [np.hstack(thumbs[i : i + 6]) for i in range(0, len(thumbs), 6)]
    crops = np.vstack(rows) if rows else np.full((thumb_h, thumb_w * 6, 3), 255, dtype=np.uint8)

    width = max(summary.shape[1], crops.shape[1])
    def pad_to_width(image):
        if image.shape[1] == width:
            return image
        pad = np.full((image.shape[0], width - image.shape[1], 3), 255, dtype=np.uint8)
        return np.hstack([image, pad])

    sheet = np.vstack([pad_to_width(summary), pad_to_width(crops)])
    cv2.imwrite(str(out), sheet)
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
