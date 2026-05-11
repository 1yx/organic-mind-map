#!/usr/bin/env python3
"""Coarse layer extraction for GPT Image 2 mind map references."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


@dataclass
class Component:
    id: str
    layer: str
    bbox: list[int]
    area: int
    crop: str | None = None


@dataclass
class TextBox:
    id: str
    bbox: list[int]
    text: str
    score: float


def require_cv2():
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except ModuleNotFoundError as exc:
        missing = exc.name or "dependency"
        raise SystemExit(
            f"Missing Python dependency: {missing}\n"
            "Install with:\n"
            "  python3 -m pip install -r PHASE_2_2nd_attempts/requirements.txt"
        ) from exc
    return cv2, np


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_mask(cv2, path: Path, mask) -> None:
    cv2.imwrite(str(path), mask)


def rgba_crop(cv2, np, image_bgr, mask, bbox: tuple[int, int, int, int]):
    x, y, w, h = bbox
    crop_bgr = image_bgr[y : y + h, x : x + w]
    crop_mask = mask[y : y + h, x : x + w]
    crop_rgba = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2BGRA)
    crop_rgba[:, :, 3] = crop_mask
    return crop_rgba


def morph_close(cv2, mask, size: int, iterations: int = 1):
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (size, size))
    return cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=iterations)


def morph_open(cv2, mask, size: int, iterations: int = 1):
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (size, size))
    return cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=iterations)


def dilate(cv2, mask, size: int, iterations: int = 1):
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (size, size))
    return cv2.dilate(mask, kernel, iterations=iterations)


def extract_foreground(cv2, np, image_bgr):
    """Separate non-white content from a white/off-white reference background."""
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]

    dark = gray < 235
    saturated = saturation > 35
    foreground = np.where(dark | saturated, 255, 0).astype("uint8")
    foreground = morph_close(cv2, foreground, 3, 1)
    return foreground


def extract_branch_mask(cv2, np, image_bgr, foreground):
    """Extract thick saturated colored branch strokes."""
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    hue = hsv[:, :, 0]
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    # Saturated, bright, non-black regions. This intentionally favors the large
    # colored branches over black text/doodle outlines.
    # Yellow is excluded because the reference uses it heavily for center cards,
    # stars, smileys, and highlights rather than main branches.
    non_yellow = ~((hue >= 21) & (hue <= 42) & (saturation > 70))
    color = ((saturation > 75) & (value > 85) & (gray > 55) & non_yellow).astype("uint8") * 255
    color = cv2.bitwise_and(color, foreground)
    color = morph_open(cv2, color, 5, 1)

    num, labels, stats, _ = cv2.connectedComponentsWithStats(color, 8)
    branch = np.zeros_like(color)
    image_area = image_bgr.shape[0] * image_bgr.shape[1]
    min_area = max(1800, int(image_area * 0.00085))

    for idx in range(1, num):
        x, y, w, h, area = stats[idx]
        if area < min_area:
            continue
        aspect = max(w, h) / max(1, min(w, h))
        bbox_area = max(1, w * h)
        fill_ratio = area / bbox_area
        # Keep long colored strokes and larger colored regions. Small icon fills
        # should mostly be filtered out by area.
        if (aspect >= 2.4 and fill_ratio <= 0.72) or (area >= min_area * 4.4 and fill_ratio <= 0.35):
            branch[labels == idx] = 255

    branch = morph_close(cv2, branch, 11, 1)
    return branch


def paddle_text_boxes(image_path: Path) -> list[TextBox]:
    try:
        from paddleocr import PaddleOCR  # type: ignore
    except ModuleNotFoundError:
        return []

    ocr = PaddleOCR(
        lang="ch",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )
    result = ocr.predict(str(image_path))
    boxes: list[TextBox] = []

    if not result:
        return boxes

    for page in result:
        if not page:
            continue
        if isinstance(page, dict) and "rec_polys" in page:
            texts = page.get("rec_texts") or []
            scores = page.get("rec_scores") or []
            polys = page.get("rec_polys") or []
            for idx, points in enumerate(polys):
                text = texts[idx] if idx < len(texts) else ""
                score = scores[idx] if idx < len(scores) else 1.0
                if not str(text).strip() or float(score) < 0.5:
                    continue
                xs = [int(p[0]) for p in points]
                ys = [int(p[1]) for p in points]
                x0, x1 = min(xs), max(xs)
                y0, y1 = min(ys), max(ys)
                boxes.append(
                    TextBox(
                        id=f"text_ocr_{len(boxes) + 1:03d}",
                        bbox=[x0, y0, x1 - x0, y1 - y0],
                        text=str(text).strip(),
                        score=float(score),
                    )
                )
            continue

        # PaddleOCR 2.x compatibility.
        for item in page:
            points = item[0]
            text_result = item[1] if len(item) > 1 else ("", 1.0)
            text = text_result[0] if len(text_result) > 0 else ""
            score = text_result[1] if len(text_result) > 1 else 1.0
            if not str(text).strip() or float(score) < 0.5:
                continue
            xs = [int(p[0]) for p in points]
            ys = [int(p[1]) for p in points]
            x0, x1 = min(xs), max(xs)
            y0, y1 = min(ys), max(ys)
            boxes.append(
                TextBox(
                    id=f"text_ocr_{len(boxes) + 1:03d}",
                    bbox=[x0, y0, x1 - x0, y1 - y0],
                    text=str(text).strip(),
                    score=float(score),
                )
            )
    return boxes


def extract_text_mask(cv2, np, image_bgr, image_path: Path, branch_mask, ocr: str):
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    black_ink = (gray < 105).astype("uint8") * 255

    boxes: list[TextBox] = []
    if ocr == "paddle":
        boxes = paddle_text_boxes(image_path)

    text = np.zeros_like(black_ink)
    if boxes:
        h, w = black_ink.shape
        for box in boxes:
            x, y, bw, bh = box.bbox
            pad = max(6, int(max(bw, bh) * 0.12))
            x0 = max(0, x - pad)
            y0 = max(0, y - pad)
            x1 = min(w, x + bw + pad)
            y1 = min(h, y + bh + pad)
            text[y0:y1, x0:x1] = black_ink[y0:y1, x0:x1]
    else:
        # Fallback: retain compact black connected components outside branch
        # strokes. This catches many handwritten characters but also keeps some
        # doodle outlines; it is a bootstrap path until OCR is enabled.
        black_without_branch = cv2.bitwise_and(black_ink, cv2.bitwise_not(dilate(cv2, branch_mask, 9, 1)))
        num, labels, stats, _ = cv2.connectedComponentsWithStats(black_without_branch, 8)
        image_area = image_bgr.shape[0] * image_bgr.shape[1]
        min_area = max(8, int(image_area * 0.000004))
        max_area = max(2600, int(image_area * 0.0018))

        for idx in range(1, num):
            x, y, bw, bh, area = stats[idx]
            if area < min_area or area > max_area:
                continue
            if bw > 180 or bh > 95:
                continue
            density = area / max(1, bw * bh)
            if 0.04 <= density <= 0.75:
                text[labels == idx] = 255

        text = dilate(cv2, text, 3, 1)

    text = cv2.bitwise_and(text, cv2.bitwise_not(dilate(cv2, branch_mask, 7, 1)))
    return text, boxes


def connected_components(cv2, mask, min_area: int) -> Iterable[tuple[int, int, int, int, int]]:
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    for idx in range(1, num):
        x, y, w, h, area = stats[idx]
        if area >= min_area:
            yield int(x), int(y), int(w), int(h), int(area)


def make_debug_overlay(cv2, np, image_bgr, branches, text, doodles):
    overlay = image_bgr.copy()
    color_layer = np.zeros_like(image_bgr)
    color_layer[branches > 0] = (255, 0, 255)  # BGR magenta
    color_layer[text > 0] = (0, 255, 0)  # BGR green
    color_layer[doodles > 0] = (255, 255, 0)  # BGR cyan/yellow visual marker
    return cv2.addWeighted(overlay, 0.72, color_layer, 0.28, 0)


def extract(image_path: Path, out_dir: Path, ocr: str) -> None:
    cv2, np = require_cv2()
    image_bgr = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise SystemExit(f"Could not read image: {image_path}")

    ensure_dir(out_dir)
    ensure_dir(out_dir / "doodles")

    foreground = extract_foreground(cv2, np, image_bgr)
    branches = extract_branch_mask(cv2, np, image_bgr, foreground)
    text, text_boxes = extract_text_mask(cv2, np, image_bgr, image_path, branches, ocr)

    reserved = cv2.bitwise_or(dilate(cv2, branches, 7, 1), dilate(cv2, text, 5, 1))
    doodles = cv2.bitwise_and(foreground, cv2.bitwise_not(reserved))
    doodles = morph_close(cv2, doodles, 5, 1)
    doodles = morph_open(cv2, doodles, 3, 1)

    save_mask(cv2, out_dir / "foreground_mask.png", foreground)
    save_mask(cv2, out_dir / "branches_mask.png", branches)
    save_mask(cv2, out_dir / "text_mask.png", text)
    save_mask(cv2, out_dir / "doodles_mask.png", doodles)
    cv2.imwrite(str(out_dir / "branches_rgba.png"), rgba_crop(cv2, np, image_bgr, branches, (0, 0, image_bgr.shape[1], image_bgr.shape[0])))
    cv2.imwrite(str(out_dir / "text_rgba.png"), rgba_crop(cv2, np, image_bgr, text, (0, 0, image_bgr.shape[1], image_bgr.shape[0])))
    cv2.imwrite(str(out_dir / "doodles_rgba.png"), rgba_crop(cv2, np, image_bgr, doodles, (0, 0, image_bgr.shape[1], image_bgr.shape[0])))
    cv2.imwrite(str(out_dir / "debug_overlay.png"), make_debug_overlay(cv2, np, image_bgr, branches, text, doodles))

    components: list[Component] = []
    image_area = image_bgr.shape[0] * image_bgr.shape[1]
    min_doodle_area = max(220, int(image_area * 0.00012))

    for i, (x, y, w, h, area) in enumerate(connected_components(cv2, doodles, min_doodle_area), start=1):
        component_id = f"doodle_{i:03d}"
        crop_name = f"doodles/{component_id}.png"
        crop = rgba_crop(cv2, np, image_bgr, doodles, (x, y, w, h))
        cv2.imwrite(str(out_dir / crop_name), crop)
        components.append(
            Component(
                id=component_id,
                layer="doodle",
                bbox=[x, y, w, h],
                area=area,
                crop=crop_name,
            )
        )

    for i, (x, y, w, h, area) in enumerate(connected_components(cv2, branches, max(500, int(image_area * 0.00025))), start=1):
        components.append(Component(id=f"branch_{i:03d}", layer="branch", bbox=[x, y, w, h], area=area))

    for box in text_boxes:
        x, y, w, h = box.bbox
        components.append(Component(id=box.id, layer="text_box", bbox=[x, y, w, h], area=w * h))

    metadata = {
        "input": str(image_path),
        "image": {"width": int(image_bgr.shape[1]), "height": int(image_bgr.shape[0])},
        "ocr": ocr,
        "text_boxes": [asdict(box) for box in text_boxes],
        "components": [asdict(component) for component in components],
        "outputs": {
            "foreground_mask": "foreground_mask.png",
            "branches_mask": "branches_mask.png",
            "text_mask": "text_mask.png",
            "doodles_mask": "doodles_mask.png",
            "branches_rgba": "branches_rgba.png",
            "text_rgba": "text_rgba.png",
            "doodles_rgba": "doodles_rgba.png",
            "debug_overlay": "debug_overlay.png",
        },
    }
    (out_dir / "segmentation.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print(f"Wrote extraction outputs to {out_dir}")
    print(f"Doodle crops: {sum(1 for component in components if component.layer == 'doodle')}")
    print(f"OCR text boxes: {len(text_boxes)}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract coarse branches/text/doodle layers from a mind map reference.")
    parser.add_argument("image", type=Path, help="Input reference image path.")
    parser.add_argument("--out", type=Path, required=True, help="Output directory.")
    parser.add_argument("--ocr", choices=["none", "paddle"], default="none", help="Optional OCR detector.")
    parser.add_argument("--check-deps", action="store_true", help="Only check required Python dependencies.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.check_deps:
        require_cv2()
        print("Required dependencies are available.")
        return 0
    extract(args.image, args.out, args.ocr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
