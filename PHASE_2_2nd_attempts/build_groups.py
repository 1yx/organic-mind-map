#!/usr/bin/env python3
"""Build editable-style visual groups from extraction outputs.

The goal is to separate text masks from doodle masks while preserving their
layout relationship through group metadata.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import cv2
import numpy as np


def rect_intersection(a: list[int], b: list[int]) -> int:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    x0 = max(ax, bx)
    y0 = max(ay, by)
    x1 = min(ax + aw, bx + bw)
    y1 = min(ay + ah, by + bh)
    return max(0, x1 - x0) * max(0, y1 - y0)


def expand_rect(rect: list[int], margin: int, width: int, height: int) -> list[int]:
    x, y, w, h = rect
    x0 = max(0, x - margin)
    y0 = max(0, y - margin)
    x1 = min(width, x + w + margin)
    y1 = min(height, y + h + margin)
    return [x0, y0, x1 - x0, y1 - y0]


def union_rect(rects: list[list[int]]) -> list[int]:
    x0 = min(r[0] for r in rects)
    y0 = min(r[1] for r in rects)
    x1 = max(r[0] + r[2] for r in rects)
    y1 = max(r[1] + r[3] for r in rects)
    return [x0, y0, x1 - x0, y1 - y0]


def draw_text_mask(mask: np.ndarray, text_boxes: list[dict[str, object]]) -> np.ndarray:
    out = np.zeros_like(mask)
    for item in text_boxes:
        x, y, w, h = item["bbox"]  # type: ignore[index]
        out[int(y) : int(y) + int(h), int(x) : int(x) + int(w)] = mask[int(y) : int(y) + int(h), int(x) : int(x) + int(w)]
    return out


def make_preview(image: np.ndarray, groups: list[dict[str, object]], map_text: list[dict[str, object]], unassigned: list[dict[str, object]]):
    preview = image.copy()
    for group in groups:
        x, y, w, h = group["bbox"]  # type: ignore[index]
        cv2.rectangle(preview, (x, y), (x + w, y + h), (255, 180, 0), 3)
        cv2.putText(preview, str(group["id"]), (x, max(18, y - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 120, 0), 2)
        for text in group["doodle_text"]:  # type: ignore[index]
            tx, ty, tw, th = text["bbox"]
            cv2.rectangle(preview, (tx, ty), (tx + tw, ty + th), (0, 180, 255), 2)

    for text in map_text:
        x, y, w, h = text["bbox"]  # type: ignore[index]
        cv2.rectangle(preview, (x, y), (x + w, y + h), (0, 255, 0), 2)

    for text in unassigned:
        x, y, w, h = text["bbox"]  # type: ignore[index]
        cv2.rectangle(preview, (x, y), (x + w, y + h), (0, 0, 255), 2)

    return preview


def normalize_text(value: object) -> str:
    text = str(value or "").lower()
    text = re.sub(r"[\s·.'’:_\-]+", "", text)
    text = re.sub(r"^[0-9]+[.、)]*", "", text)
    text = text.replace("agi", "agi")
    return text


def load_structure(path: Path | None) -> list[dict[str, object]]:
    if path is None:
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    entries: list[dict[str, object]] = []
    entries.append({"kind": "title_text", "expected": data["title"], "aliases": [data["title"]], "branch": None})
    center_aliases = [data["center"]]
    center_aliases.extend(part for part in re.findall(r"[A-Za-z0-9]+|[\u4e00-\u9fff]+", data["center"]) if len(part) >= 2)
    entries.append({"kind": "center_text", "expected": data["center"], "aliases": center_aliases, "branch": None})
    for branch_index, branch in enumerate(data.get("branches", []), start=1):
        entries.append(
            {
                "kind": "branch_text",
                "expected": branch["concept"],
                "aliases": [branch["concept"]],
                "branch": branch_index,
            }
        )
        for child_index, child in enumerate(branch.get("children", []), start=1):
            entries.append(
                {
                    "kind": "child_text",
                    "expected": child,
                    "aliases": [child],
                    "branch": branch_index,
                    "child": child_index,
                }
            )
    return entries


def match_structure(text: dict[str, object], entries: list[dict[str, object]]) -> dict[str, object] | None:
    detected = normalize_text(text.get("text"))
    if not detected:
        return None

    best: tuple[float, dict[str, object]] | None = None
    for entry in entries:
        aliases = entry.get("aliases") or [entry["expected"]]
        score = 0.0
        for alias in aliases:
            expected = normalize_text(alias)
            if not expected:
                continue
            alias_score = 0.0
            if detected == expected:
                alias_score = 1.0
            elif expected in detected or detected in expected:
                alias_score = min(len(detected), len(expected)) / max(len(detected), len(expected))
            score = max(score, alias_score)
        if score >= 0.68 and (best is None or score > best[0]):
            best = (score, entry)

    if best is None:
        return None

    matched = dict(best[1])
    matched["match_score"] = best[0]
    return matched


def main() -> None:
    parser = argparse.ArgumentParser(description="Group doodles with internal OCR text.")
    parser.add_argument("extraction_dir", type=Path)
    parser.add_argument("--refined-doodles-dir", type=Path, default=None)
    parser.add_argument("--source-image", type=Path, default=Path("input/reference.png"))
    parser.add_argument("--structure", type=Path, default=None)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--margin", type=int, default=24)
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)

    image = cv2.imread(str(args.source_image), cv2.IMREAD_COLOR)
    if image is None:
        raise SystemExit(f"Could not read source image: {args.source_image}")
    height, width = image.shape[:2]

    segmentation = json.loads((args.extraction_dir / "segmentation.json").read_text(encoding="utf-8"))
    text_mask = cv2.imread(str(args.extraction_dir / "text_mask.png"), cv2.IMREAD_GRAYSCALE)
    if text_mask is None:
        raise SystemExit(f"Could not read text mask: {args.extraction_dir / 'text_mask.png'}")

    doodle_components = [c for c in segmentation["components"] if c.get("layer") == "doodle"]
    if args.refined_doodles_dir and (args.refined_doodles_dir / "refined_doodles.json").exists():
        refined = json.loads((args.refined_doodles_dir / "refined_doodles.json").read_text(encoding="utf-8"))
        doodle_components = refined["components"]

    raw_text_boxes = segmentation.get("text_boxes") or []
    text_boxes: list[dict[str, object]] = []
    for idx, item in enumerate(raw_text_boxes, start=1):
        if isinstance(item, dict):
            text_boxes.append(item)
        else:
            text_boxes.append({"id": f"text_ocr_{idx:03d}", "bbox": item, "text": "", "score": None})

    structure_entries = load_structure(args.structure)
    semantic_text: dict[str, list[dict[str, object]]] = {
        "title_text": [],
        "center_text": [],
        "branch_text": [],
        "child_text": [],
    }
    group_map: dict[str, dict[str, object]] = {}
    unassigned_text: list[dict[str, object]] = []

    for text in text_boxes:
        structure_match = match_structure(text, structure_entries)
        if structure_match is not None:
            classified = dict(text)
            classified["semantic"] = structure_match
            semantic_text[str(structure_match["kind"])].append(classified)
            continue

        text_bbox = text["bbox"]  # type: ignore[assignment]
        text_area = max(1, int(text_bbox[2]) * int(text_bbox[3]))
        candidates = []
        for doodle in doodle_components:
            doodle_bbox = doodle["bbox"]
            expanded = expand_rect(doodle_bbox, args.margin, width, height)
            overlap = rect_intersection(text_bbox, expanded)
            if overlap <= 0:
                continue
            candidates.append((overlap / text_area, overlap, doodle))

        if candidates:
            candidates.sort(key=lambda item: (item[0], item[1]), reverse=True)
            ratio, _, doodle = candidates[0]
            if ratio >= 0.25:
                group_id = f"group_{doodle['id'].split('_')[-1]}"
                group = group_map.setdefault(
                    group_id,
                    {
                        "id": group_id,
                        "kind": "doodle_with_text",
                        "doodles": [doodle],
                        "doodle_text": [],
                    },
                )
                group["doodle_text"].append(text)  # type: ignore[index]
                continue

        text_value = str(text.get("text", "")).strip()
        if len(text_value) <= 1 and not text_value.isdigit():
            unassigned_text.append(text)
        else:
            unassigned_text.append(text)

    for doodle in doodle_components:
        group_id = f"group_{doodle['id'].split('_')[-1]}"
        if group_id not in group_map:
            group_map[group_id] = {
                "id": group_id,
                "kind": "doodle",
                "doodles": [doodle],
                "doodle_text": [],
            }

    groups = list(group_map.values())
    for group in groups:
        rects = [d["bbox"] for d in group["doodles"]] + [t["bbox"] for t in group["doodle_text"]]  # type: ignore[index]
        group["bbox"] = union_rect(rects)

    doodle_text = [text for group in groups for text in group["doodle_text"]]  # type: ignore[index]
    map_text = (
        semantic_text["title_text"]
        + semantic_text["center_text"]
        + semantic_text["branch_text"]
        + semantic_text["child_text"]
    )
    cv2.imwrite(str(args.out / "map_text_mask.png"), draw_text_mask(text_mask, map_text))
    cv2.imwrite(str(args.out / "title_text_mask.png"), draw_text_mask(text_mask, semantic_text["title_text"]))
    cv2.imwrite(str(args.out / "center_text_mask.png"), draw_text_mask(text_mask, semantic_text["center_text"]))
    cv2.imwrite(str(args.out / "branch_text_mask.png"), draw_text_mask(text_mask, semantic_text["branch_text"]))
    cv2.imwrite(str(args.out / "child_text_mask.png"), draw_text_mask(text_mask, semantic_text["child_text"]))
    cv2.imwrite(str(args.out / "doodle_text_mask.png"), draw_text_mask(text_mask, doodle_text))
    cv2.imwrite(str(args.out / "unassigned_text_mask.png"), draw_text_mask(text_mask, unassigned_text))
    cv2.imwrite(str(args.out / "group_preview.png"), make_preview(image, groups, map_text, unassigned_text))

    out = {
        "input": str(args.extraction_dir),
        "source_image": str(args.source_image),
        "groups": groups,
        "title_text": semantic_text["title_text"],
        "center_text": semantic_text["center_text"],
        "branch_text": semantic_text["branch_text"],
        "child_text": semantic_text["child_text"],
        "map_text": map_text,
        "doodle_text": doodle_text,
        "unassigned_text": unassigned_text,
        "outputs": {
            "map_text_mask": "map_text_mask.png",
            "title_text_mask": "title_text_mask.png",
            "center_text_mask": "center_text_mask.png",
            "branch_text_mask": "branch_text_mask.png",
            "child_text_mask": "child_text_mask.png",
            "doodle_text_mask": "doodle_text_mask.png",
            "unassigned_text_mask": "unassigned_text_mask.png",
            "group_preview": "group_preview.png",
        },
    }
    (args.out / "groups.json").write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote groups to {args.out}")
    print(f"Groups: {len(groups)}")
    print(f"Title text: {len(semantic_text['title_text'])}")
    print(f"Center text: {len(semantic_text['center_text'])}")
    print(f"Branch text: {len(semantic_text['branch_text'])}")
    print(f"Child text: {len(semantic_text['child_text'])}")
    print(f"Doodle text: {len(doodle_text)}")
    print(f"Unassigned text: {len(unassigned_text)}")


if __name__ == "__main__":
    main()
