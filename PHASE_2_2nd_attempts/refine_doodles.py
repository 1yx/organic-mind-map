#!/usr/bin/env python3
"""Refine doodle masks after OCR-based subtraction.

This is the local fallback before using SAM2. It repairs the main artifact we
see in OCR output: doodle interiors, such as faces, can be cut out by text/ink
subtraction. For each connected component, we close small gaps and fill enclosed
holes, then regenerate transparent crops from the original reference image.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def fill_holes(mask: np.ndarray) -> np.ndarray:
    """Fill enclosed holes in a binary mask."""
    h, w = mask.shape
    flood = mask.copy()
    flood_mask = np.zeros((h + 2, w + 2), dtype=np.uint8)
    cv2.floodFill(flood, flood_mask, (0, 0), 255)
    holes = cv2.bitwise_not(flood)
    return cv2.bitwise_or(mask, holes)


def rgba_from_mask(image_bgr: np.ndarray, mask: np.ndarray) -> np.ndarray:
    rgba = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = mask
    return rgba


def crop_rgba(image_bgr: np.ndarray, mask: np.ndarray, bbox: tuple[int, int, int, int]) -> np.ndarray:
    x, y, w, h = bbox
    crop = cv2.cvtColor(image_bgr[y : y + h, x : x + w], cv2.COLOR_BGR2BGRA)
    crop[:, :, 3] = mask[y : y + h, x : x + w]
    return crop


def main() -> None:
    parser = argparse.ArgumentParser(description="Repair doodle masks by filling enclosed holes.")
    parser.add_argument("source_image", type=Path)
    parser.add_argument("extraction_dir", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--min-area", type=int, default=220)
    args = parser.parse_args()

    image = cv2.imread(str(args.source_image), cv2.IMREAD_COLOR)
    if image is None:
        raise SystemExit(f"Could not read source image: {args.source_image}")

    doodles_mask = cv2.imread(str(args.extraction_dir / "doodles_mask.png"), cv2.IMREAD_GRAYSCALE)
    if doodles_mask is None:
        raise SystemExit(f"Could not read doodles mask: {args.extraction_dir / 'doodles_mask.png'}")

    ensure_dir(args.out)
    ensure_dir(args.out / "doodles")

    kernel3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    kernel5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    base = cv2.morphologyEx(doodles_mask, cv2.MORPH_CLOSE, kernel3, iterations=1)

    num, labels, stats, _ = cv2.connectedComponentsWithStats(base, 8)
    refined = np.zeros_like(base)
    components: list[dict[str, object]] = []

    for idx in range(1, num):
        x, y, w, h, area = [int(v) for v in stats[idx]]
        if area < args.min_area:
            continue

        component = np.zeros_like(base)
        component[labels == idx] = 255

        # A gentle close repairs broken black outlines without fusing distant
        # doodles. Hole fill then restores face/skin/color interiors.
        component = cv2.morphologyEx(component, cv2.MORPH_CLOSE, kernel5, iterations=1)
        component = fill_holes(component)
        refined = cv2.bitwise_or(refined, component)

    num, labels, stats, _ = cv2.connectedComponentsWithStats(refined, 8)
    for out_idx, idx in enumerate(range(1, num), start=1):
        x, y, w, h, area = [int(v) for v in stats[idx]]
        if area < args.min_area:
            continue
        component_id = f"doodle_{out_idx:03d}"
        crop_name = f"doodles/{component_id}.png"
        component_mask = np.zeros_like(refined)
        component_mask[labels == idx] = 255
        cv2.imwrite(str(args.out / crop_name), crop_rgba(image, component_mask, (x, y, w, h)))
        components.append(
            {
                "id": component_id,
                "layer": "doodle_refined",
                "bbox": [x, y, w, h],
                "area": area,
                "crop": crop_name,
            }
        )

    cv2.imwrite(str(args.out / "doodles_refined_mask.png"), refined)
    cv2.imwrite(str(args.out / "doodles_refined_rgba.png"), rgba_from_mask(image, refined))

    metadata = {
        "input": str(args.source_image),
        "source_extraction": str(args.extraction_dir),
        "components": components,
        "outputs": {
            "doodles_refined_mask": "doodles_refined_mask.png",
            "doodles_refined_rgba": "doodles_refined_rgba.png",
        },
    }
    (args.out / "refined_doodles.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Wrote refined doodles to {args.out}")
    print(f"Refined doodle crops: {len(components)}")


if __name__ == "__main__":
    main()

