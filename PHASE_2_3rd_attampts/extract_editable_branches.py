#!/usr/bin/env python3
"""Convert branch mask to editable SVG centerline paths.

Pipeline:
  1. Load branch mask (or regenerate from source image)
  2. Skeletonize to 1-pixel centerlines
  3. Trace graph: endpoints, junctions, segments
  4. Simplify and smooth segments
  5. Estimate stroke width via distance transform
  6. Estimate stroke color from original image
  7. Generate editable SVG and JSON
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path


def require_cv2():
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except ModuleNotFoundError as exc:
        missing = exc.name or "dependency"
        raise SystemExit(
            f"Missing Python dependency: {missing}\n"
            "Install with:\n"
            "  uv run --project ../PHASE_2_2nd_attempts --no-sync python -c 'import cv2'"
        ) from exc
    return cv2, np


# ---------------------------------------------------------------------------
# 1. Skeletonize
# ---------------------------------------------------------------------------

def zhang_suen_thinning(np, img):
    """Zhang-Suen thinning for binary images (pure NumPy)."""
    skeleton = (img > 0).astype(np.uint8)
    prev = np.zeros_like(skeleton)
    while True:
        # Step 1
        to_remove = _zs_step(np, skeleton, step=1)
        skeleton[to_remove] = 0
        # Step 2
        to_remove = _zs_step(np, skeleton, step=2)
        skeleton[to_remove] = 0
        if np.array_equal(skeleton, prev):
            break
        prev = skeleton.copy()
    return skeleton * 255


def _zs_step(np, img, step):
    """One iteration of Zhang-Suen step 1 or 2."""
    h, w = img.shape
    # Pad with zeros
    p = np.pad(img, 1, mode='constant', constant_values=0)
    # Neighbors: P2..P9 (clockwise from top)
    P2 = p[0:h, 1:w+1]
    P3 = p[0:h, 2:w+2]
    P4 = p[1:h+1, 2:w+2]
    P5 = p[2:h+2, 2:w+2]
    P6 = p[2:h+2, 1:w+1]
    P7 = p[2:h+2, 0:w]
    P8 = p[1:h+1, 0:w]
    P9 = p[0:h, 0:w]

    neighbors = (P2 + P3 + P4 + P5 + P6 + P7 + P8 + P9) // 255
    transitions = _count_transitions(np, P2, P3, P4, P5, P6, P7, P8, P9)

    cond2 = (neighbors >= 2) & (neighbors <= 6)
    cond3 = transitions == 1
    if step == 1:
        cond4 = (P2 * P4 * P6) == 0
        cond5 = (P4 * P6 * P8) == 0
    else:
        cond4 = (P2 * P4 * P8) == 0
        cond5 = (P2 * P6 * P8) == 0

    return (img > 0) & cond2 & cond3 & cond4 & cond5


def _count_transitions(np, P2, P3, P4, P5, P6, P7, P8, P9):
    """Count 0->1 transitions in the ordered neighbor sequence."""
    def b(x):
        return (x > 0).astype(np.int32)

    return (
        ((b(P2) == 0) & (b(P3) == 1)).astype(np.int32) +
        ((b(P3) == 0) & (b(P4) == 1)).astype(np.int32) +
        ((b(P4) == 0) & (b(P5) == 1)).astype(np.int32) +
        ((b(P5) == 0) & (b(P6) == 1)).astype(np.int32) +
        ((b(P6) == 0) & (b(P7) == 1)).astype(np.int32) +
        ((b(P7) == 0) & (b(P8) == 1)).astype(np.int32) +
        ((b(P8) == 0) & (b(P9) == 1)).astype(np.int32) +
        ((b(P9) == 0) & (b(P2) == 1)).astype(np.int32)
    )


def skeletonize(cv2, np, mask):
    """Skeletonize a binary mask. Prefer cv2.ximgproc.thinning if available."""
    binary = (mask > 0).astype(np.uint8) * 255
    # Try ximgproc first (requires opencv-contrib-python)
    try:
        result = cv2.ximgproc.thinning(binary, thinningType=cv2.ximgproc.THINNING_ZHANGSUEN)
        if np.count_nonzero(result) > 0:
            return result
    except AttributeError:
        pass
    # Fallback: Zhang-Suen in pure NumPy
    print("  [skeleton] using pure NumPy Zhang-Suen thinning (slow for large masks)")
    return zhang_suen_thinning(np, binary)


def prune_skeleton(np, skeleton, min_spur_length=12):
    """Remove short spurs (dead-end branches) from skeleton.

    Iteratively removes endpoint-connected paths shorter than min_spur_length.
    This cleans up noise from thick stroke skeletonization.
    """
    skel = (skeleton > 0).astype(np.uint8)
    h, w = skel.shape

    def get_neighbors(r, c):
        nbrs = []
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < h and 0 <= nc < w and skel[nr, nc]:
                    nbrs.append((nr, nc))
        return nbrs

    changed = True
    while changed:
        changed = False
        # Find endpoints
        pixels = np.argwhere(skel > 0)
        endpoints = []
        for r, c in pixels:
            if len(get_neighbors(r, c)) == 1:
                endpoints.append((r, c))

        # Trace each spur from endpoint
        for ep in endpoints:
            path = [ep]
            prev, curr = None, ep
            while True:
                nbrs = [n for n in get_neighbors(curr[0], curr[1]) if n != prev]
                if len(nbrs) != 1:
                    break  # junction or dead-end
                prev, curr = curr, nbrs[0]
                path.append(curr)

            if len(path) < min_spur_length:
                for r, c in path[:-1]:  # keep the junction pixel
                    skel[r, c] = 0
                changed = True

    return skel * 255


# ---------------------------------------------------------------------------
# 2. Graph tracing
# ---------------------------------------------------------------------------

@dataclass
class Segment:
    """A traced path between endpoints/junctions."""
    id: str
    points: list[tuple[int, int]]  # pixel coordinates (col, row)
    start_type: str  # "endpoint" | "junction"
    end_type: str


def simplify_junctions(np, cv2, skeleton):
    """Collapse clusters of adjacent junction pixels into single representative points.

    When the skeleton has thick/blurry junctions, thinning produces many adjacent
    junction pixels (degree>=3). This confuses segment tracing into producing
    many tiny fragments. We collapse each connected cluster of junction pixels
    into its centroid, keeping only that single pixel and removing the rest.
    """
    skel = skeleton.copy()
    h, w = skel.shape

    # Find all 8-connected neighbor counts
    kernel = np.array([[1,1,1],[0,0,0],[1,1,1]], dtype=np.uint8)
    # Count neighbors for each pixel
    neighbor_count = np.zeros_like(skel, dtype=np.int32)
    for dr in range(-1, 2):
        for dc in range(-1, 2):
            if dr == 0 and dc == 0:
                continue
            shifted = np.zeros_like(skel)
            src_r = slice(max(0, dr), min(h, h + dr))
            src_c = slice(max(0, dc), min(w, w + dc))
            dst_r = slice(max(0, -dr), min(h, h - dr))
            dst_c = slice(max(0, -dc), min(w, w - dc))
            shifted[dst_r, dst_c] = skel[src_r, src_c]
            neighbor_count += shifted

    # Junction pixels: degree >= 3
    junction_mask = (skel > 0) & (neighbor_count >= 3 * 255)

    if not np.any(junction_mask):
        return skel

    # Find connected components of junction pixels using cv2
    junction_uint8 = junction_mask.astype(np.uint8) * 255
    num_features, labeled = cv2.connectedComponents(junction_uint8, connectivity=8)

    removed = 0
    for label_id in range(1, num_features + 1):
        cluster = np.argwhere(labeled == label_id)  # (row, col)
        if len(cluster) < 2:
            continue
        # Compute centroid
        cy = int(round(cluster[:, 0].mean()))
        cx = int(round(cluster[:, 1].mean()))
        # Remove all cluster pixels except centroid
        for r, c in cluster:
            skel[r, c] = 0
        # Keep the centroid
        skel[cy, cx] = 255
        removed += len(cluster) - 1

    if removed > 0:
        print(f"  Simplified {removed} junction pixels into {num_features} nodes")
    return skel


def build_skeleton_graph(np, skeleton):
    """Build adjacency from skeleton pixels. Returns degree map and neighbor dict."""
    h, w = skeleton.shape
    skel_pixels = np.argwhere(skeleton > 0)  # (row, col)
    skel_set = set(map(tuple, skel_pixels))

    # For each skeleton pixel, find 8-connected skeleton neighbors
    neighbors = {}
    degree = {}
    for r, c in skel_pixels:
        nbrs = []
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if (nr, nc) in skel_set:
                    nbrs.append((nc, nr))  # store as (col, row)
        neighbors[(c, r)] = nbrs  # key is (col, row)
        degree[(c, r)] = len(nbrs)

    return neighbors, degree, skel_set


def trace_segments(np, skeleton, min_length=15):
    """Trace skeleton into segments between endpoints and junctions."""
    neighbors, degree, skel_set = build_skeleton_graph(np, skeleton)

    # Classify pixels
    endpoints = {p for p, d in degree.items() if d == 1}
    junctions = {p for p, d in degree.items() if d >= 3}

    visited_edges = set()
    segments = []
    seg_idx = 0

    def trace_from(start, start_type):
        nonlocal seg_idx
        # Follow the path from start
        for first_nbr in neighbors.get(start, []):
            edge = (min(start, first_nbr), max(start, first_nbr))
            if edge in visited_edges:
                continue
            visited_edges.add(edge)
            path = [start, first_nbr]
            prev, curr = start, first_nbr
            while True:
                if curr in endpoints or curr in junctions:
                    # End of segment
                    end_type = "endpoint" if curr in endpoints else "junction"
                    seg_idx += 1
                    segments.append(Segment(
                        id=f"seg_{seg_idx:03d}",
                        points=list(path),
                        start_type=start_type,
                        end_type=end_type,
                    ))
                    break
                # Continue: find next unvisited neighbor
                next_candidates = [
                    n for n in neighbors.get(curr, [])
                    if n != prev
                    and (min(curr, n), max(curr, n)) not in visited_edges
                ]
                if not next_candidates:
                    # Dead end (isolated pixel or loop)
                    seg_idx += 1
                    segments.append(Segment(
                        id=f"seg_{seg_idx:03d}",
                        points=list(path),
                        start_type=start_type,
                        end_type="endpoint",
                    ))
                    break
                next_p = next_candidates[0]
                visited_edges.add((min(curr, next_p), max(curr, next_p)))
                path.append(next_p)
                prev, curr = curr, next_p

    # Start tracing from endpoints first (they're clean start points)
    for ep in endpoints:
        trace_from(ep, "endpoint")

    # Then trace from junctions for any unvisited edges
    for jn in junctions:
        trace_from(jn, "junction")

    # Filter out very short segments
    segments = [s for s in segments if len(s.points) >= min_length]
    # Re-number
    for i, seg in enumerate(segments):
        seg.id = f"seg_{i+1:03d}"

    return segments


# ---------------------------------------------------------------------------
# 3. Simplify and smooth
# ---------------------------------------------------------------------------

def rdp_simplify(points, epsilon):
    """Ramer-Douglas-Peucker simplification."""
    if len(points) <= 2:
        return points

    # Find point farthest from line (first -> last)
    start = points[0]
    end = points[-1]
    max_dist = 0
    max_idx = 0

    dx = end[0] - start[0]
    dy = end[1] - start[1]
    line_len_sq = dx * dx + dy * dy

    for i in range(1, len(points) - 1):
        px, py = points[i]
        if line_len_sq == 0:
            dist = math.hypot(px - start[0], py - start[1])
        else:
            t = max(0, min(1, ((px - start[0]) * dx + (py - start[1]) * dy) / line_len_sq))
            proj_x = start[0] + t * dx
            proj_y = start[1] + t * dy
            dist = math.hypot(px - proj_x, py - proj_y)
        if dist > max_dist:
            max_dist = dist
            max_idx = i

    if max_dist > epsilon:
        left = rdp_simplify(points[:max_idx + 1], epsilon)
        right = rdp_simplify(points[max_idx:], epsilon)
        return left[:-1] + right
    else:
        return [start, end]


def chaikin_smooth(points, iterations=1):
    """Chaikin's corner-cutting smoothing. Preserves first and last points."""
    for _ in range(iterations):
        if len(points) <= 2:
            return points
        new = [points[0]]
        for i in range(len(points) - 1):
            p0 = points[i]
            p1 = points[i + 1]
            # Quarter points
            q = (0.75 * p0[0] + 0.25 * p1[0], 0.75 * p0[1] + 0.25 * p1[1])
            r = (0.25 * p0[0] + 0.75 * p1[0], 0.25 * p0[1] + 0.75 * p1[1])
            new.append(q)
            new.append(r)
        new.append(points[-1])
        points = new
    return points


def extend_orphan_roots(simplified_segments, image_center, junction_thresh=30.0,
                        max_gap=200.0, primary_dist=250.0):
    """Extend orphan segment roots toward the nearest parent branch path.

    Only extends small fragments whose root is far from center (not primary
    branches). Finds the closest point on any other segment's path and adds
    a straight-line extension to bridge the gap.
    """
    if len(simplified_segments) < 2:
        return simplified_segments

    cx, cy = image_center

    # Find which segments have junction neighbors (endpoint within threshold)
    has_junction = {}
    for i, (seg_a, pts_a) in enumerate(simplified_segments):
        has_junction[seg_a.id] = False
        for j, (seg_b, pts_b) in enumerate(simplified_segments):
            if i == j:
                continue
            for pa in [pts_a[0], pts_a[-1]]:
                for pb in [pts_b[0], pts_b[-1]]:
                    if math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < junction_thresh:
                        has_junction[seg_a.id] = True
                        break
                if has_junction[seg_a.id]:
                    break
            if has_junction[seg_a.id]:
                break

    result = []
    for seg, pts in simplified_segments:
        if has_junction.get(seg.id, True):
            result.append((seg, pts))
            continue

        # Skip primary branches (root near center)
        d0 = math.hypot(pts[0][0] - cx, pts[0][1] - cy)
        d1 = math.hypot(pts[-1][0] - cx, pts[-1][1] - cy)
        if min(d0, d1) < primary_dist:
            result.append((seg, pts))
            continue

        # Find closest point on any other segment's path
        best_dist = float("inf")
        best_point = None
        for other_seg, other_pts in simplified_segments:
            if other_seg.id == seg.id:
                continue
            for i in range(len(other_pts) - 1):
                # Point-to-segment distance for orphan endpoints
                for ep in [pts[0], pts[-1]]:
                    # Project ep onto segment (other_pts[i], other_pts[i+1])
                    ax, ay = other_pts[i]
                    bx, by = other_pts[i + 1]
                    dx, dy = bx - ax, by - ay
                    len_sq = dx * dx + dy * dy
                    if len_sq == 0:
                        d = math.hypot(ep[0] - ax, ep[1] - ay)
                        proj = (ax, ay)
                    else:
                        t = max(0, min(1, ((ep[0] - ax) * dx + (ep[1] - ay) * dy) / len_sq))
                        proj = (ax + t * dx, ay + t * dy)
                        d = math.hypot(ep[0] - proj[0], ep[1] - proj[1])
                    if d < best_dist:
                        best_dist = d
                        best_point = proj

        if best_dist > max_gap or best_point is None:
            result.append((seg, pts))
            continue

        # Move the closer endpoint to the parent path point
        d_first = math.hypot(pts[0][0] - best_point[0], pts[0][1] - best_point[1])
        d_last = math.hypot(pts[-1][0] - best_point[0], pts[-1][1] - best_point[1])

        new_pts = list(pts)
        if d_first <= d_last:
            new_pts[0] = best_point
        else:
            new_pts[-1] = best_point

        print(f"  {seg.id}: moved root to ({best_point[0]:.0f},{best_point[1]:.0f}), gap={best_dist:.0f}px")
        result.append((seg, new_pts))

    return result


def simplify_segment(points, rdp_epsilon=4.0, smooth_passes=1):
    """Simplify and smooth a pixel path."""
    # Convert to float
    pts = [(float(x), float(y)) for x, y in points]
    # RDP simplify
    simplified = rdp_simplify(pts, rdp_epsilon)
    # Light Chaikin smoothing
    if smooth_passes > 0 and len(simplified) > 2:
        smoothed = chaikin_smooth(simplified, smooth_passes)
        return smoothed
    return simplified


def align_dense_points_to_edit_points(dense_points, edit_points):
    """Align raw traced points to simplified edit endpoints.

    RDP can reduce a gently curved branch to two edit points. For Bezier
    fitting we still want the original skeleton rhythm, but the fitted path
    must start/end at the editable endpoints, including any later endpoint
    adjustment such as orphan-root extension.
    """
    if len(dense_points) < 2 or len(edit_points) < 2:
        return [(float(x), float(y)) for x, y in dense_points]

    dense = [(float(x), float(y)) for x, y in dense_points]
    start = (float(edit_points[0][0]), float(edit_points[0][1]))
    end = (float(edit_points[-1][0]), float(edit_points[-1][1]))

    same_order = (
        math.hypot(dense[0][0] - start[0], dense[0][1] - start[1])
        + math.hypot(dense[-1][0] - end[0], dense[-1][1] - end[1])
    )
    reverse_order = (
        math.hypot(dense[-1][0] - start[0], dense[-1][1] - start[1])
        + math.hypot(dense[0][0] - end[0], dense[0][1] - end[1])
    )

    if reverse_order < same_order:
        dense = list(reversed(dense))

    dense[0] = start
    dense[-1] = end
    return dense


# ---------------------------------------------------------------------------
# 4. Estimate stroke width via distance transform
# ---------------------------------------------------------------------------

def estimate_stroke_widths(cv2, np, branch_mask, points):
    """Estimate stroke width at each point using distance transform."""
    dist = cv2.distanceTransform(branch_mask, cv2.DIST_L2, 5)
    widths = []
    for x, y in points:
        ix, iy = int(round(x)), int(round(y))
        h, w = dist.shape
        if 0 <= iy < h and 0 <= ix < w:
            widths.append(float(dist[iy, ix] * 2))
        else:
            widths.append(0.0)
    return widths


# ---------------------------------------------------------------------------
# 5. Estimate branch color
# ---------------------------------------------------------------------------

def estimate_segment_color(cv2, np, image_bgr, branch_mask, points, sample_radius=8):
    """Sample original image pixels near the segment path under the branch mask."""
    h, w = branch_mask.shape
    r, g, b_vals = [], [], []
    for x, y in points:
        ix, iy = int(round(x)), int(round(y))
        for dy in range(-sample_radius, sample_radius + 1):
            for dx in range(-sample_radius, sample_radius + 1):
                sy, sx = iy + dy, ix + dx
                if 0 <= sy < h and 0 <= sx < w and branch_mask[sy, sx] > 0:
                    b, g_, r_ = image_bgr[sy, sx]
                    r.append(int(r_))
                    g.append(int(g_))
                    b_vals.append(int(b))

    if not r:
        return "#888888"

    # Use median to be robust to noise
    med_r = sorted(r)[len(r) // 2]
    med_g = sorted(g)[len(g) // 2]
    med_b = sorted(b_vals)[len(b_vals) // 2]
    return f"#{med_r:02x}{med_g:02x}{med_b:02x}"


# ---------------------------------------------------------------------------
# 6. SVG path generation
# ---------------------------------------------------------------------------

def points_to_svg_path(points):
    """Convert simplified points to SVG path string (polyline M/L)."""
    if len(points) < 2:
        return ""
    parts = [f"M {points[0][0]:.1f} {points[0][1]:.1f}"]
    for x, y in points[1:]:
        parts.append(f"L {x:.1f} {y:.1f}")
    return " ".join(parts)


def fit_single_bezier(dense_points):
    """Fit a cubic Bezier curve through dense skeleton points.

    Uses least-squares fitting so the curve passes through the actual
    skeleton shape, not just start/end tangents.
    Returns SVG path string with one C command.
    """
    if len(dense_points) < 2:
        return ""
    p0 = dense_points[0]
    p3 = dense_points[-1]

    if len(dense_points) == 2:
        return f"M {p0[0]:.1f} {p0[1]:.1f} L {p3[0]:.1f} {p3[1]:.1f}"

    # Assign parameter t to each dense point (uniform by index)
    n = len(dense_points)
    ts = [i / (n - 1) for i in range(n)]

    # For cubic Bezier B(t) = (1-t)^3*P0 + 3*(1-t)^2*t*C1 + 3*(1-t)*t^2*C2 + t^3*P3
    # We know P0 and P3. Solve for C1 and C2 via least squares.
    # B(t) - (1-t)^3*P0 - t^3*P3 = 3*(1-t)^2*t*C1 + 3*(1-t)*t^2*C2
    # This is a linear system in C1 and C2.

    # Build matrix A and vector bx, by
    ax_list, ay_list = [], []
    bx_list, by_list = [], []

    for i in range(n):
        t = ts[i]
        u = 1.0 - t
        pt = dense_points[i]

        # Right-hand side: point minus known contributions
        rhs_x = pt[0] - (u ** 3) * p0[0] - (t ** 3) * p3[0]
        rhs_y = pt[1] - (u ** 3) * p0[1] - (t ** 3) * p3[1]

        # Coefficients for C1 and C2
        a1 = 3.0 * (u ** 2) * t  # coefficient of C1
        a2 = 3.0 * u * (t ** 2)   # coefficient of C2

        ax_list.append([a1, a2])
        bx_list.append(rhs_x)
        by_list.append(rhs_y)

    # Solve 2x2 normal equations: A^T * A * x = A^T * b
    def solve_2x2(M, rhs):
        """Solve 2x2 system M * x = rhs."""
        a, b = M[0]
        c, d = M[1]
        det = a * d - b * c
        if abs(det) < 1e-10:
            return None
        r0, r1 = rhs[0], rhs[1]
        return ((d * r0 - b * r1) / det, (-c * r0 + a * r1) / det)

    # Build A^T * A and A^T * b
    ata = [[0.0, 0.0], [0.0, 0.0]]
    atbx = [0.0, 0.0]
    atby = [0.0, 0.0]
    for i in range(n):
        a1, a2 = ax_list[i]
        ata[0][0] += a1 * a1
        ata[0][1] += a1 * a2
        ata[1][0] += a2 * a1
        ata[1][1] += a2 * a2
        atbx[0] += a1 * bx_list[i]
        atbx[1] += a2 * bx_list[i]
        atby[0] += a1 * by_list[i]
        atby[1] += a2 * by_list[i]

    cx = solve_2x2(ata, atbx)
    cy = solve_2x2(ata, atby)

    if cx is None or cy is None:
        # Fallback: straight line
        return f"M {p0[0]:.1f} {p0[1]:.1f} L {p3[0]:.1f} {p3[1]:.1f}"

    cp1 = (cx[0], cy[0])
    cp2 = (cx[1], cy[1])

    return f"M {p0[0]:.1f} {p0[1]:.1f} C {cp1[0]:.1f} {cp1[1]:.1f} {cp2[0]:.1f} {cp2[1]:.1f} {p3[0]:.1f} {p3[1]:.1f}"


def midpoint_bezier_controls(start, end, dense_points):
    """Return cubic controls for a curve through the original local midpoint."""
    p0 = (float(start[0]), float(start[1]))
    p3 = (float(end[0]), float(end[1]))

    if len(dense_points) < 3:
        c1 = (p0[0] + (p3[0] - p0[0]) / 3.0, p0[1] + (p3[1] - p0[1]) / 3.0)
        c2 = (p0[0] + 2.0 * (p3[0] - p0[0]) / 3.0, p0[1] + 2.0 * (p3[1] - p0[1]) / 3.0)
        return c1, c2

    mid = dense_points[len(dense_points) // 2]
    # Convert a quadratic Bezier through mid at t=0.5 to cubic controls.
    q = (
        2.0 * mid[0] - 0.5 * (p0[0] + p3[0]),
        2.0 * mid[1] - 0.5 * (p0[1] + p3[1]),
    )
    c1 = (p0[0] + (2.0 / 3.0) * (q[0] - p0[0]), p0[1] + (2.0 / 3.0) * (q[1] - p0[1]))
    c2 = (p3[0] + (2.0 / 3.0) * (q[0] - p3[0]), p3[1] + (2.0 / 3.0) * (q[1] - p3[1]))
    return c1, c2


def fit_midpoint_bezier(start, end, dense_points):
    """Fit a stable cubic through the original curve midpoint.

    This is intentionally more conservative than least squares for paths that
    RDP simplified to two editable points. It preserves gentle organic bend
    without allowing short segments or adjusted endpoints to create looping
    control handles.
    """
    p0 = (float(start[0]), float(start[1]))
    p3 = (float(end[0]), float(end[1]))
    c1, c2 = midpoint_bezier_controls(p0, p3, dense_points)

    return f"M {p0[0]:.1f} {p0[1]:.1f} C {c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p3[0]:.1f} {p3[1]:.1f}"


def nearest_dense_indices_for_edit_points(edit_points, dense_points):
    """Map each editable point to a monotonic nearest index in dense points."""
    if not dense_points:
        return []

    indices = []
    start_idx = 0
    last_idx = len(dense_points) - 1
    for point in edit_points:
        px, py = point
        best_idx = start_idx
        best_dist = float("inf")
        for i in range(start_idx, len(dense_points)):
            dx = dense_points[i][0] - px
            dy = dense_points[i][1] - py
            dist = dx * dx + dy * dy
            if dist < best_dist:
                best_idx = i
                best_dist = dist
        indices.append(best_idx)
        start_idx = min(best_idx, last_idx)
    return indices


def points_to_cubic_bezier(points, dense_points=None):
    """Convert points to cubic Bezier SVG path using Catmull-Rom interpolation.

    For 2-point paths, uses dense_points to fit a curved Bezier with handles.
    """
    if len(points) < 2:
        return ""
    if len(points) == 2:
        if dense_points and len(dense_points) >= 3:
            return fit_midpoint_bezier(points[0], points[1], dense_points)
        return f"M {points[0][0]:.1f} {points[0][1]:.1f} L {points[1][0]:.1f} {points[1][1]:.1f}"

    parts = [f"M {points[0][0]:.1f} {points[0][1]:.1f}"]

    if dense_points and len(dense_points) >= 3:
        dense_indices = nearest_dense_indices_for_edit_points(points, dense_points)
        for i in range(len(points) - 1):
            p1 = points[i]
            p2 = points[i + 1]
            start_idx = dense_indices[i]
            end_idx = dense_indices[i + 1]
            if end_idx <= start_idx:
                local_dense = [p1, p2]
            else:
                local_dense = list(dense_points[start_idx:end_idx + 1])
                local_dense[0] = p1
                local_dense[-1] = p2
            cp1, cp2 = midpoint_bezier_controls(p1, p2, local_dense)
            parts.append(f"C {cp1[0]:.1f} {cp1[1]:.1f} {cp2[0]:.1f} {cp2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}")
        return " ".join(parts)

    for i in range(len(points) - 1):
        p0 = points[max(0, i - 1)]
        p1 = points[i]
        p2 = points[min(len(points) - 1, i + 1)]
        p3 = points[min(len(points) - 1, i + 2)]

        # Catmull-Rom to cubic Bezier control points
        cp1x = p1[0] + (p2[0] - p0[0]) / 6.0
        cp1y = p1[1] + (p2[1] - p0[1]) / 6.0
        cp2x = p2[0] - (p3[0] - p1[0]) / 6.0
        cp2y = p2[1] - (p3[1] - p1[1]) / 6.0

        parts.append(f"C {cp1x:.1f} {cp1y:.1f} {cp2x:.1f} {cp2y:.1f} {p2[0]:.1f} {p2[1]:.1f}")

    return " ".join(parts)


# ---------------------------------------------------------------------------
# 6b. Parametric taper width model
# ---------------------------------------------------------------------------

def build_branch_tree(simplified_segments, image_center):
    """Build tree topology from simplified segments.

    Returns dict: seg_id -> {level, root_dist, root_end, parent_id, parent_tip_width}
    """
    cx, cy = image_center

    # For each segment, find root end (closer to center)
    seg_info = {}
    for seg, smooth_pts in simplified_segments:
        p0, p1 = smooth_pts[0], smooth_pts[-1]
        d0 = math.hypot(p0[0] - cx, p0[1] - cy)
        d1 = math.hypot(p1[0] - cx, p1[1] - cy)
        root_end = "first" if d0 <= d1 else "last"
        root_dist = min(d0, d1)
        seg_info[seg.id] = {
            "level": 1,
            "root_dist": root_dist,
            "root_end": root_end,
            "root_point": p0 if root_end == "first" else p1,
            "tip_point": p1 if root_end == "first" else p0,
            "parent_id": None,
        }

    # Detect junctions: endpoints within 30px
    junction_thresh = 30.0
    ids = list(seg_info.keys())
    for i, id_a in enumerate(ids):
        for j in range(i + 1, len(ids)):
            id_b = ids[j]
            ta = seg_info[id_a]["tip_point"]
            ra = seg_info[id_a]["root_point"]
            tb = seg_info[id_b]["tip_point"]
            rb = seg_info[id_b]["root_point"]
            for pa in [ra, ta]:
                for pb in [rb, tb]:
                    if math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < junction_thresh:
                        if pa is ta and pb is rb:
                            if seg_info[id_b]["level"] <= seg_info[id_a]["level"]:
                                seg_info[id_b]["level"] = seg_info[id_a]["level"] + 1
                                seg_info[id_b]["parent_id"] = id_a
                        elif pa is ra and pb is tb:
                            if seg_info[id_a]["level"] <= seg_info[id_b]["level"]:
                                seg_info[id_a]["level"] = seg_info[id_b]["level"] + 1
                                seg_info[id_a]["parent_id"] = id_b

    # Assign orphans (no junction, root far from center) to nearest branch endpoint
    seg_map = {seg.id: pts for seg, pts in simplified_segments}
    orphan_thresh = 150.0
    primary_dist = 250.0  # segments with root this close to center are primary branches
    for sid, info in seg_info.items():
        if info["parent_id"] is not None:
            continue
        if info["root_dist"] < primary_dist:
            continue
        pts = seg_map[sid]
        best_dist = float("inf")
        best_id = None
        for other_id, other_pts in seg_map.items():
            if other_id == sid:
                continue
            for pa in [pts[0], pts[-1]]:
                for pb in [other_pts[0], other_pts[-1]]:
                    d = math.hypot(pa[0] - pb[0], pa[1] - pb[1])
                    if d < best_dist:
                        best_dist = d
                        best_id = other_id
        if best_id and best_dist < orphan_thresh:
            info["parent_id"] = best_id
            info["level"] = seg_info[best_id]["level"] + 1

    return seg_info


def taper_width(t, root_w, taper_rate=0.7, min_width=3.0):
    """Parametric width at normalized position t along a branch.

    t: 0 = root end, 1 = tip
    root_w: width at root (t=0), either from parametric model or inherited from parent tip
    """
    return max(min_width, root_w * (1.0 - taper_rate * t))


# ---------------------------------------------------------------------------
# 7. Variable-width outline generation
# ---------------------------------------------------------------------------

def resample_centerline(points, step=4.0):
    """Resample a polyline at uniform arc-length intervals."""
    if len(points) < 2:
        return list(points)

    # Compute cumulative arc length
    cum_len = [0.0]
    for i in range(1, len(points)):
        d = math.hypot(points[i][0] - points[i-1][0], points[i][1] - points[i-1][1])
        cum_len.append(cum_len[-1] + d)
    total = cum_len[-1]
    if total < step:
        return list(points)

    # Sample at uniform intervals
    resampled = [points[0]]
    target = step
    i = 1
    while target < total:
        while i < len(cum_len) and cum_len[i] < target:
            i += 1
        if i >= len(cum_len):
            break
        # Interpolate between points[i-1] and points[i]
        seg_start = cum_len[i - 1]
        seg_end = cum_len[i]
        seg_len = seg_end - seg_start
        if seg_len == 0:
            target += step
            continue
        t = (target - seg_start) / seg_len
        x = points[i-1][0] + t * (points[i][0] - points[i-1][0])
        y = points[i-1][1] + t * (points[i][1] - points[i-1][1])
        resampled.append((x, y))
        target += step

    # Always include the last point
    last = points[-1]
    if math.hypot(resampled[-1][0] - last[0], resampled[-1][1] - last[1]) > 1.0:
        resampled.append(last)

    return resampled


def compute_normals(points):
    """Compute unit normals (perpendicular to tangent) at each point."""
    normals = []
    n = len(points)
    for i in range(n):
        if i == 0:
            dx = points[1][0] - points[0][0]
            dy = points[1][1] - points[0][1]
        elif i == n - 1:
            dx = points[-1][0] - points[-2][0]
            dy = points[-1][1] - points[-2][1]
        else:
            dx = points[i+1][0] - points[i-1][0]
            dy = points[i+1][1] - points[i-1][1]
        length = math.hypot(dx, dy)
        if length == 0:
            normals.append((0.0, 1.0))
        else:
            # Normal is perpendicular: rotate tangent 90 degrees CCW
            normals.append((-dy / length, dx / length))
    return normals


def smooth_width_profile(widths, window=5):
    """Smooth width values with a moving average."""
    n = len(widths)
    if n <= window:
        return list(widths)
    result = []
    half = window // 2
    for i in range(n):
        start = max(0, i - half)
        end = min(n, i + half + 1)
        result.append(sum(widths[start:end]) / (end - start))
    return result


def generate_outline_path(centerline, widths, min_width=4.0, width_scale=1.15):
    """Generate left/right outline points from centerline + width profile.

    Returns a closed SVG path string for a filled variable-width stroke.
    width_scale compensates for outline narrowing from Chaikin smoothing.
    """
    if len(centerline) < 2:
        return "", [], []

    # Apply scale and clamp minimum width
    widths = [max(min_width, w * width_scale) for w in widths]

    normals = compute_normals(centerline)

    left = []
    right = []
    for i in range(len(centerline)):
        cx, cy = centerline[i]
        nx, ny = normals[i]
        half_w = widths[i] / 2.0
        left.append((cx + nx * half_w, cy + ny * half_w))
        right.append((cx - nx * half_w, cy - ny * half_w))

    # Smooth the outlines
    left_smooth = [(float(p[0]), float(p[1])) for p in chaikin_smooth(left, 1)] if len(left) > 3 else left
    right_smooth = [(float(p[0]), float(p[1])) for p in chaikin_smooth(right, 1)] if len(right) > 3 else right

    # Build closed path: forward along left, backward along right, close
    parts = [f"M {left_smooth[0][0]:.1f} {left_smooth[0][1]:.1f}"]
    for p in left_smooth[1:]:
        parts.append(f"L {p[0]:.1f} {p[1]:.1f}")
    for p in reversed(right_smooth):
        parts.append(f"L {p[0]:.1f} {p[1]:.1f}")
    parts.append("Z")

    return " ".join(parts), left_smooth, right_smooth


# ---------------------------------------------------------------------------
# 8. Merge collinear segments
# ---------------------------------------------------------------------------

def attach_fragments_to_path(segments, proximity=60):
    """Attach small segments whose endpoint is near another segment's mid-path.

    Unlike merge_adjacent_segments (endpoint-to-endpoint), this handles the case
    where a sub-branch sprouts from the middle of a parent branch. The fragment
    is attached by inserting a junction point at the nearest path position.
    """
    if len(segments) < 2:
        return segments

    def seg_length(seg):
        pts = seg.points
        return sum(math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1])
                   for i in range(len(pts)-1))

    # Identify fragments: short segments (likely noise from junction clusters)
    # that have an endpoint close to another segment's path (not just endpoints)
    merged_ids = set()
    for frag in segments:
        if seg_length(frag) > 200:
            continue
        # Find nearest point on any other segment's path
        best_dist = float("inf")
        best_seg = None
        best_idx = None
        best_frag_end = None

        for other in segments:
            if other.id == frag.id or other.id in merged_ids:
                continue
            for frag_end, frag_pt in [("start", frag.points[0]), ("end", frag.points[-1])]:
                for i, op in enumerate(other.points):
                    d = math.hypot(frag_pt[0]-op[0], frag_pt[1]-op[1])
                    if d < best_dist:
                        best_dist = d
                        best_seg = other
                        best_idx = i
                        best_frag_end = frag_end

        if best_dist < proximity and best_seg is not None:
            # Attach: insert a branch point into the parent path
            frag_pt = frag.points[0] if best_frag_end == "start" else frag.points[-1]
            best_seg.points.insert(best_idx + 1, frag_pt)
            # Add fragment points to parent
            if best_frag_end == "end":
                best_seg.points.extend(frag.points[1:])
            else:
                frag_reversed = list(reversed(frag.points))
                best_seg.points.extend(frag_reversed[1:])
            merged_ids.add(frag.id)

    return [s for s in segments if s.id not in merged_ids]


def merge_adjacent_segments(segments, angle_thresh_deg=40, proximity=15):
    """Merge segments with close endpoints and similar direction.

    Uses proximity-based matching so segments don't need exact shared points.
    """
    if not segments:
        return segments

    def direction_at(points, end, window=5):
        if end == "start":
            p0, p1 = points[0], points[min(window, len(points) - 1)]
        else:
            p0, p1 = points[max(0, len(points) - 1 - window)], points[-1]
        dx = p1[0] - p0[0]
        dy = p1[1] - p0[1]
        length = math.hypot(dx, dy)
        if length == 0:
            return (0.0, 0.0)
        return (dx / length, dy / length)

    def angle_between(v1, v2):
        dot = v1[0] * v2[0] + v1[1] * v2[1]
        return math.degrees(math.acos(max(-1.0, min(1.0, dot))))

    def endpoint_dist(seg_a, end_a, seg_b, end_b):
        pa = seg_a.points[0] if end_a == "start" else seg_a.points[-1]
        pb = seg_b.points[0] if end_b == "start" else seg_b.points[-1]
        return math.hypot(pa[0] - pb[0], pa[1] - pb[1])

    def aligned_dir(dir_a, end_a, dir_b, end_b):
        """Get the outbound direction at each end for alignment check."""
        # Outbound from end_a means: if end_a is "end", direction is forward
        # if end_a is "start", direction is backward
        if end_a == "end":
            da = dir_a
        else:
            da = (-dir_a[0], -dir_a[1])
        if end_b == "start":
            db = dir_b
        else:
            db = (-dir_b[0], -dir_b[1])
        return da, db

    seg_dict = {s.id: s for s in segments}
    merged_ids = set()
    new_segments = []

    for seg in segments:
        if seg.id in merged_ids:
            continue

        current = seg
        changed = True
        while changed:
            changed = False
            best_score = None
            best_other = None
            best_end_a = None
            best_end_b = None

            for end_a in ("end", "start"):
                for other in segments:
                    if other.id == current.id or other.id in merged_ids:
                        continue
                    for end_b in ("start", "end"):
                        dist = endpoint_dist(current, end_a, other, end_b)
                        if dist > proximity:
                            continue
                        dir_a = direction_at(current.points, end_a)
                        dir_b = direction_at(other.points, end_b)
                        da, db = aligned_dir(dir_a, end_a, dir_b, end_b)
                        ang = angle_between(da, db)
                        if ang > angle_thresh_deg:
                            continue
                        # Score: prefer closer distance, smaller angle
                        score = (dist, ang)
                        if best_score is None or score < best_score:
                            best_score = score
                            best_other = other
                            best_end_a = end_a
                            best_end_b = end_b

            if best_other is not None:
                other = best_other
                if best_end_a == "end":
                    if best_end_b == "start":
                        current.points.extend(other.points[1:])
                    else:
                        current.points.extend(other.points[-2::-1])
                else:
                    if best_end_b == "end":
                        current.points = other.points[:-1] + current.points
                    else:
                        current.points = other.points[::-1][:-1] + current.points
                merged_ids.add(other.id)
                changed = True

        new_segments.append(current)

    for i, seg in enumerate(new_segments):
        seg.id = f"seg_{i+1:03d}"

    return new_segments


# ---------------------------------------------------------------------------
# 8. Main pipeline
# ---------------------------------------------------------------------------

@dataclass
class BranchResult:
    id: str
    path: str
    stroke: str
    stroke_width: float
    bbox: list[float]
    points: list[list[float]]
    width_samples: list[float]
    point_count: int
    outline_path: str = ""
    resampled_points: list[list[float]] = field(default_factory=list)
    resampled_widths: list[float] = field(default_factory=list)


def run(image_path: Path, mask_path: Path | None, out_dir: Path,
        rdp_epsilon: float, smooth_passes: int, min_seg_length: int,
        merge: bool, bezier: bool, prune_spur: int = 15):
    cv2, np = require_cv2()
    out_dir.mkdir(parents=True, exist_ok=True)

    # Load source image
    image_bgr = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise SystemExit(f"Could not read image: {image_path}")
    h, w = image_bgr.shape[:2]
    print(f"Source image: {w}x{h}")

    # Load or regenerate branch mask
    if mask_path and mask_path.exists():
        print(f"Loading branch mask: {mask_path}")
        branch_mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
    else:
        print("Regenerating branch mask from source image...")
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "PHASE_2_2nd_attempts"))
        from extract_layers import extract_foreground, extract_branch_mask
        foreground = extract_foreground(cv2, np, image_bgr)
        branch_mask = extract_branch_mask(cv2, np, image_bgr, foreground)
        mask_out = out_dir / "branches_mask.png"
        cv2.imwrite(str(mask_out), branch_mask)
        print(f"  Saved regenerated mask: {mask_out}")

    # Keep original mask for distance transform (true branch width).
    # Create smoothed version for skeletonization (cleaner centerlines).
    original_mask = branch_mask.copy()

    print("Smoothing branch mask for skeletonization...")
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    branch_mask = cv2.morphologyEx(branch_mask, cv2.MORPH_CLOSE, kernel_close, iterations=2)
    branch_mask = cv2.morphologyEx(branch_mask, cv2.MORPH_OPEN, kernel_open, iterations=1)
    cv2.imwrite(str(out_dir / "branches_mask_smoothed.png"), branch_mask)

    # Step 1: Skeletonize
    print("Skeletonizing branch mask...")
    skeleton = skeletonize(cv2, np, branch_mask)
    skel_pixels = int(np.count_nonzero(skeleton))
    print(f"  Skeleton pixels: {skel_pixels}")

    # Step 1b: Prune short spurs
    if prune_spur > 0:
        print(f"  Pruning spurs shorter than {prune_spur} pixels...")
        skeleton = prune_skeleton(np, skeleton, min_spur_length=prune_spur)
        skel_pixels = int(np.count_nonzero(skeleton))
        print(f"  After pruning: {skel_pixels} pixels")

    skel_debug = np.zeros((h, w, 3), dtype=np.uint8)
    skel_debug[skeleton > 0] = (255, 255, 255)
    cv2.imwrite(str(out_dir / "branch_skeleton_debug.png"), skel_debug)

    # Step 2: Trace graph segments (keep all, filter after merge)
    print("Tracing skeleton graph...")
    raw_segments = trace_segments(np, skeleton, min_length=min_seg_length)
    print(f"  Raw segments: {len(raw_segments)}")

    # Step 3: Merge adjacent collinear segments
    if merge:
        print("Merging adjacent segments...")
        segments = merge_adjacent_segments(raw_segments, proximity=30, angle_thresh_deg=45)
        print(f"  After merge: {len(segments)}")
    else:
        segments = raw_segments

    # Step 4: Simplify and smooth
    print(f"Simplifying (RDP ε={rdp_epsilon}, Chaikin passes={smooth_passes})...")
    simplified_segments = []
    for seg in segments:
        smooth_pts = simplify_segment(seg.points, rdp_epsilon, smooth_passes)
        if len(smooth_pts) >= 2:
            simplified_segments.append((seg, smooth_pts))
    print(f"  Segments after simplification: {len(simplified_segments)}")

    # Step 4b: Extend orphan roots to nearest parent path point
    simplified_segments = extend_orphan_roots(simplified_segments, (w / 2, h / 2))

    # Step 5-6: Parametric taper width + color estimation
    print("Building branch tree and computing taper widths...")
    tree = build_branch_tree(simplified_segments, (w / 2, h / 2))

    # Step 5-6: Parametric taper width + color estimation
    max_root_dist = max(info["root_dist"] for sid, info in tree.items()
                        if sid in {s[0].id for s in simplified_segments}) if simplified_segments else 1.0

    taper_params = {
        "base_width": 30.0, "dist_power": 0.5,
        "taper_rate": 0.7, "min_width": 3.0,
    }

    # Compute root_w for each branch (parent tip → child root continuity)
    seg_tip_widths = {}  # seg_id -> width at tip (t=1)
    seg_root_widths = {}  # seg_id -> width at root (t=0)

    # Process in level order so parents are computed before children
    sorted_segs = sorted(simplified_segments,
                         key=lambda s: tree.get(s[0].id, {}).get("level", 1))

    for seg, smooth_pts in sorted_segs:
        info = tree.get(seg.id, {"level": 1, "root_dist": 0, "parent_id": None})
        parent_id = info.get("parent_id")

        if parent_id and parent_id in seg_tip_widths:
            root_w = seg_tip_widths[parent_id]
        else:
            # Root branch: compute base width from distance to center
            root_dist = info["root_dist"]
            dist_factor = max(0.3, 1.0 - root_dist / max_root_dist) ** taper_params["dist_power"]
            root_w = taper_params["base_width"] * dist_factor

        seg_root_widths[seg.id] = root_w
        seg_tip_widths[seg.id] = taper_width(1.0, root_w,
                                              taper_rate=taper_params["taper_rate"],
                                              min_width=taper_params["min_width"])

    branch_results: list[BranchResult] = []

    for seg, smooth_pts in simplified_segments:
        # Resample centerline at fine intervals for smooth width profile
        resampled = resample_centerline(smooth_pts, step=5.0)
        if len(resampled) < 2:
            resampled = smooth_pts

        # Compute taper widths from parametric model
        info = tree.get(seg.id, {"root_end": "first"})
        root_end = info["root_end"]
        root_w = seg_root_widths.get(seg.id, 10.0)

        # Ensure points go root→tip for t computation
        if root_end == "last":
            resampled = list(reversed(resampled))

        # Compute cumulative arc-length for t ∈ [0,1]
        cum = 0.0
        t_values = [0.0]
        for i in range(1, len(resampled)):
            cum += math.hypot(resampled[i][0] - resampled[i-1][0],
                              resampled[i][1] - resampled[i-1][1])
            t_values.append(cum)
        total_len = cum if cum > 0 else 1.0
        t_values = [tv / total_len for tv in t_values]

        fine_widths = [taper_width(t, root_w,
                                   taper_rate=taper_params["taper_rate"],
                                   min_width=taper_params["min_width"])
                       for t in t_values]

        # Reverse back if needed
        if root_end == "last":
            resampled = list(reversed(resampled))
            fine_widths = list(reversed(fine_widths))

        # Median width for the constant-width centerline path
        median_width = sorted(fine_widths)[len(fine_widths) // 2] if fine_widths else 10.0
        median_width = max(4.0, min(60.0, median_width))

        # Estimate color from original image (use original mask for accurate sampling)
        color = estimate_segment_color(cv2, np, image_bgr, original_mask, resampled)

        # Generate centerline SVG path
        if bezier:
            fit_points = align_dense_points_to_edit_points(seg.points, smooth_pts)
            path_d = points_to_cubic_bezier(smooth_pts, dense_points=fit_points)
        else:
            path_d = points_to_svg_path(smooth_pts)

        if not path_d:
            continue

        # Generate variable-width outline path
        outline_d, _, _ = generate_outline_path(resampled, fine_widths, min_width=4.0, width_scale=1.3)

        # Bounding box
        xs = [p[0] for p in smooth_pts]
        ys = [p[1] for p in smooth_pts]
        bbox = [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)]

        branch_results.append(BranchResult(
            id=seg.id,
            path=path_d,
            stroke=color,
            stroke_width=round(median_width, 1),
            bbox=[round(v, 1) for v in bbox],
            points=[[round(x, 1), round(y, 1)] for x, y in smooth_pts],
            width_samples=[round(w_, 1) for w_ in fine_widths],
            point_count=len(smooth_pts),
            outline_path=outline_d,
            resampled_points=[[round(x, 1), round(y, 1)] for x, y in resampled],
            resampled_widths=[round(w_, 1) for w_ in fine_widths],
        ))

    # Sort by path length (longest first for nicer SVG ordering)
    branch_results.sort(key=lambda b: -b.point_count)

    # Step 7: Generate SVGs
    print(f"Generating SVGs with {len(branch_results)} paths...")

    # 7a: Centerline SVG (constant width strokes)
    svg_path = out_dir / "editable_branches.svg"
    svg_lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">',
        '  <g id="editable-branches" fill="none" stroke-linecap="round" stroke-linejoin="round">',
    ]
    for br in branch_results:
        svg_lines.append(
            f'    <path id="{br.id}" d="{br.path}" '
            f'stroke="{br.stroke}" stroke-width="{br.stroke_width:.1f}" />'
        )
    svg_lines.append("  </g>")
    svg_lines.append("</svg>")
    svg_path.write_text("\n".join(svg_lines), encoding="utf-8")
    print(f"  Wrote: {svg_path}")

    # 7b: Variable-width outline SVG (filled shapes)
    outline_svg_path = out_dir / "editable_branches_outline.svg"
    outline_lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">',
        '  <g id="variable-width-branches" stroke="none">',
    ]
    for br in branch_results:
        if br.outline_path:
            outline_lines.append(
                f'    <path id="{br.id}_outline" d="{br.outline_path}" '
                f'fill="{br.stroke}" />'
            )
    outline_lines.append("  </g>")
    outline_lines.append("</svg>")
    outline_svg_path.write_text("\n".join(outline_lines), encoding="utf-8")
    print(f"  Wrote: {outline_svg_path}")

    # Step 8: Generate JSON
    json_path = out_dir / "editable_branches.json"
    json_data = {
        "source": str(image_path),
        "image": {"width": w, "height": h},
        "segmentCount": len(branch_results),
        "taperParams": taper_params,
        "settings": {
            "rdpEpsilon": rdp_epsilon,
            "smoothPasses": smooth_passes,
            "minSegLength": min_seg_length,
            "merge": merge,
            "bezier": bezier,
        },
        "branches": [
            {
                "id": br.id,
                "path": br.path,
                "outlinePath": br.outline_path,
                "stroke": br.stroke,
                "strokeWidth": br.stroke_width,
                "bbox": br.bbox,
                "points": br.points,
                "widthSamples": br.resampled_widths,
                "resampledPoints": br.resampled_points,
                "pointCount": br.point_count,
            }
            for br in branch_results
        ],
    }
    json_path.write_text(json.dumps(json_data, indent=2), encoding="utf-8")
    print(f"  Wrote: {json_path}")

    # Step 9: Debug overlays
    print("Generating debug overlays...")

    # 9a: Outline overlay (variable width)
    overlay_outline = image_bgr.copy()
    for br in branch_results:
        if not br.outline_path:
            continue
        color_hex = br.stroke.lstrip("#")
        r_c, g_c, b_c = int(color_hex[0:2], 16), int(color_hex[2:4], 16), int(color_hex[4:6], 16)
        pts = br.resampled_points
        widths = br.resampled_widths
        for i in range(len(pts) - 1):
            x0, y0 = int(round(pts[i][0])), int(round(pts[i][1]))
            x1, y1 = int(round(pts[i+1][0])), int(round(pts[i+1][1]))
            local_w = max(2, int((widths[i] + widths[i+1]) / 2))
            cv2.line(overlay_outline, (x0, y0), (x1, y1), (b_c, g_c, r_c), local_w)
    cv2.imwrite(str(out_dir / "branch_overlay_debug.png"), overlay_outline)
    print(f"  Wrote: {out_dir / 'branch_overlay_debug.png'}")

    # 9b: Side-by-side comparison
    # Left: outline, Right: constant-width centerline
    overlay_const = image_bgr.copy()
    for br in branch_results:
        color_hex = br.stroke.lstrip("#")
        r_c, g_c, b_c = int(color_hex[0:2], 16), int(color_hex[2:4], 16), int(color_hex[4:6], 16)
        pts = [(int(round(x)), int(round(y))) for x, y in br.points]
        for i in range(len(pts) - 1):
            cv2.line(overlay_const, pts[i], pts[i + 1], (b_c, g_c, r_c), max(2, int(br.stroke_width * 0.6)))

    comparison = np.hstack([overlay_outline, overlay_const])
    cv2.imwrite(str(out_dir / "branch_comparison.png"), comparison)
    print(f"  Wrote: {out_dir / 'branch_comparison.png'}")

    print(f"\nDone! {len(branch_results)} editable branch paths generated.")
    print(f"Output: {out_dir}")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Convert branch mask to editable SVG centerline paths."
    )
    parser.add_argument("image", type=Path, help="Source reference image.")
    parser.add_argument("--branches-mask", type=Path, default=None,
                        help="Pre-existing branch mask. Regenerates if not provided.")
    parser.add_argument("--out", type=Path, default=Path("output"),
                        help="Output directory.")
    parser.add_argument("--rdp-epsilon", type=float, default=4.0,
                        help="RDP simplification tolerance (default: 4.0).")
    parser.add_argument("--smooth-passes", type=int, default=1,
                        help="Chaikin smoothing passes (default: 1).")
    parser.add_argument("--min-seg-length", type=int, default=15,
                        help="Minimum segment length in pixels (default: 15).")
    parser.add_argument("--no-merge", action="store_true",
                        help="Disable segment merging.")
    parser.add_argument("--bezier", action="store_true",
                        help="Use cubic Bezier instead of polyline paths.")
    parser.add_argument("--prune-spur", type=int, default=15,
                        help="Remove skeleton spurs shorter than N pixels (0=off, default: 15).")
    return parser.parse_args()


def main():
    args = parse_args()
    run(
        image_path=args.image,
        mask_path=args.branches_mask,
        out_dir=args.out,
        rdp_epsilon=args.rdp_epsilon,
        smooth_passes=args.smooth_passes,
        min_seg_length=args.min_seg_length,
        merge=not args.no_merge,
        bezier=args.bezier,
        prune_spur=args.prune_spur,
    )


if __name__ == "__main__":
    main()
