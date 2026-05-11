#!/usr/bin/env python3
"""Generate a small synthetic reference image for pipeline smoke tests."""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np


def main() -> None:
    out = Path("input/synthetic_reference.png")
    out.parent.mkdir(parents=True, exist_ok=True)

    image = np.full((720, 1080, 3), 255, dtype=np.uint8)

    # Thick colored branch strokes.
    cv2.line(image, (520, 360), (240, 180), (0, 140, 255), 38, cv2.LINE_AA)
    cv2.line(image, (520, 360), (850, 210), (170, 70, 190), 38, cv2.LINE_AA)
    cv2.line(image, (520, 360), (240, 540), (45, 170, 45), 34, cv2.LINE_AA)
    cv2.line(image, (520, 360), (850, 540), (210, 170, 25), 34, cv2.LINE_AA)

    # Center card.
    cv2.rectangle(image, (410, 300), (660, 420), (60, 220, 250), -1)
    cv2.rectangle(image, (410, 300), (660, 420), (20, 20, 20), 5)
    cv2.putText(image, "CENTER", (445, 375), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (10, 10, 10), 4, cv2.LINE_AA)

    # Text-like labels.
    cv2.putText(image, "FAST", (145, 145), cv2.FONT_HERSHEY_SIMPLEX, 1.15, (10, 10, 10), 3, cv2.LINE_AA)
    cv2.putText(image, "PM ROLE", (780, 165), cv2.FONT_HERSHEY_SIMPLEX, 1.05, (10, 10, 10), 3, cv2.LINE_AA)
    cv2.putText(image, "MISSION", (115, 595), cv2.FONT_HERSHEY_SIMPLEX, 1.05, (10, 10, 10), 3, cv2.LINE_AA)
    cv2.putText(image, "AI", (875, 575), cv2.FONT_HERSHEY_SIMPLEX, 1.35, (10, 10, 10), 4, cv2.LINE_AA)

    # Doodle-like assets.
    cv2.circle(image, (165, 235), 42, (235, 235, 235), -1)
    cv2.circle(image, (165, 235), 42, (20, 20, 20), 4)
    cv2.line(image, (190, 260), (225, 295), (20, 20, 20), 5, cv2.LINE_AA)
    cv2.circle(image, (165, 235), 19, (180, 210, 230), -1)

    cv2.rectangle(image, (820, 245), (940, 320), (235, 240, 245), -1)
    cv2.rectangle(image, (820, 245), (940, 320), (20, 20, 20), 4)
    cv2.line(image, (835, 275), (865, 295), (20, 20, 20), 5, cv2.LINE_AA)
    cv2.line(image, (875, 300), (915, 300), (20, 20, 20), 4, cv2.LINE_AA)

    cv2.circle(image, (180, 470), 50, (210, 235, 210), -1)
    cv2.circle(image, (180, 470), 50, (20, 20, 20), 4)
    cv2.line(image, (155, 470), (175, 490), (20, 130, 35), 6, cv2.LINE_AA)
    cv2.line(image, (175, 490), (215, 445), (20, 130, 35), 6, cv2.LINE_AA)

    cv2.rectangle(image, (835, 430), (930, 530), (230, 235, 240), -1)
    cv2.rectangle(image, (835, 430), (930, 530), (20, 20, 20), 4)
    cv2.circle(image, (862, 470), 7, (20, 20, 20), -1)
    cv2.circle(image, (902, 470), 7, (20, 20, 20), -1)
    cv2.line(image, (882, 430), (882, 405), (20, 20, 20), 3, cv2.LINE_AA)

    cv2.imwrite(str(out), image)
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()

