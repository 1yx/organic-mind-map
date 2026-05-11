#!/usr/bin/env python3
"""Run Replicate meta/sam-2 on one image or crop and save returned masks."""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


API_BASE = "https://api.replicate.com/v1"
DEFAULT_SAM2_VERSION = "b88dc2ea8f814e5f4af2bac79f2414079800b5035b065d4eab99c857ab67e125"


def request_json(url: str, token: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    data = None
    method = "GET"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        method = "POST"
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Replicate API error {exc.code}: {body}") from exc


def image_data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def download(url: str, path: Path) -> None:
    with urllib.request.urlopen(url, timeout=120) as response:
        path.write_bytes(response.read())


def main() -> None:
    parser = argparse.ArgumentParser(description="Run hosted Replicate SAM2 on an image.")
    parser.add_argument("image", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--points-per-side", type=int, default=32)
    parser.add_argument("--pred-iou-thresh", type=float, default=0.88)
    parser.add_argument("--stability-score-thresh", type=float, default=0.95)
    parser.add_argument("--version", default=DEFAULT_SAM2_VERSION, help="Replicate model version hash.")
    parser.add_argument("--poll-seconds", type=float, default=2.0)
    parser.add_argument("--timeout-seconds", type=float, default=180.0)
    args = parser.parse_args()

    token = os.environ.get("REPLICATE_API_TOKEN")
    if not token:
        raise SystemExit("Missing REPLICATE_API_TOKEN.")

    args.out.mkdir(parents=True, exist_ok=True)

    payload = {
        "version": args.version,
        "input": {
            "image": image_data_uri(args.image),
            "points_per_side": args.points_per_side,
            "pred_iou_thresh": args.pred_iou_thresh,
            "stability_score_thresh": args.stability_score_thresh,
            "use_m2m": True,
        }
    }
    prediction = request_json(f"{API_BASE}/predictions", token, payload)
    (args.out / "prediction_initial.json").write_text(json.dumps(prediction, indent=2), encoding="utf-8")

    get_url = prediction.get("urls", {}).get("get")
    if not get_url:
        raise SystemExit("Replicate response did not include a polling URL.")

    started = time.time()
    while True:
        prediction = request_json(get_url, token)
        status = prediction.get("status")
        if status in {"succeeded", "failed", "canceled"}:
            break
        if time.time() - started > args.timeout_seconds:
            raise SystemExit(f"Timed out waiting for Replicate prediction. Last status: {status}")
        time.sleep(args.poll_seconds)

    (args.out / "prediction_final.json").write_text(json.dumps(prediction, indent=2), encoding="utf-8")
    if prediction.get("status") != "succeeded":
        raise SystemExit(f"Replicate prediction did not succeed: {prediction.get('status')}")

    output = prediction.get("output") or {}
    combined = output.get("combined_mask")
    if combined:
        download(combined, args.out / "combined_mask.png")

    individual = output.get("individual_masks") or []
    masks_dir = args.out / "individual_masks"
    masks_dir.mkdir(exist_ok=True)
    for idx, url in enumerate(individual, start=1):
        download(url, masks_dir / f"mask_{idx:03d}.png")

    print(f"Wrote SAM2 outputs to {args.out}")
    print(f"Individual masks: {len(individual)}")


if __name__ == "__main__":
    main()
