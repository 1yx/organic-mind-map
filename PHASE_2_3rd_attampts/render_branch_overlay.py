#!/usr/bin/env python3
"""Render editable_branches.svg overlaid on the source image for visual inspection."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def run(svg_path: Path, image_path: Path, out_path: Path):
    import cv2
    import numpy as np

    image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if image is None:
        raise SystemExit(f"Could not read image: {image_path}")
    h, w = image.shape[:2]

    import json
    json_path = svg_path.parent / "editable_branches.json"
    if not json_path.exists():
        raise SystemExit(f"JSON not found: {json_path}")
    data = json.loads(json_path.read_text())

    overlay = image.copy()
    for br in data["branches"]:
        color_hex = br["stroke"].lstrip("#")
        r, g, b = int(color_hex[0:2], 16), int(color_hex[2:4], 16), int(color_hex[4:6], 16)
        pts = br["points"]
        for i in range(len(pts) - 1):
            p0 = (int(round(pts[i][0])), int(round(pts[i][1])))
            p1 = (int(round(pts[i + 1][0])), int(round(pts[i + 1][1])))
            cv2.line(overlay, p0, p1, (b, g, r), max(2, int(br["strokeWidth"] * 0.5)))
        # Draw endpoint dots
        for p in [pts[0], pts[-1]]:
            cv2.circle(overlay, (int(round(p[0])), int(round(p[1]))), 3, (b, g, r), -1)

    # Blend with original
    result = cv2.addWeighted(image, 0.6, overlay, 0.4, 0)
    cv2.imwrite(str(out_path), result)
    print(f"Wrote overlay: {out_path}")


def main():
    parser = argparse.ArgumentParser(description="Render branch SVG overlay on source image.")
    parser.add_argument("--svg", type=Path, default=Path("output/editable_branches.svg"))
    parser.add_argument("--image", type=Path, default=Path("reference.png"))
    parser.add_argument("--out", type=Path, default=Path("output/branch_overlay_rendered.png"))
    args = parser.parse_args()
    run(args.svg, args.image, args.out)


if __name__ == "__main__":
    main()
