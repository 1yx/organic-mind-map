#!/usr/bin/env python3
"""Generate HTML with Paper.js pen tool + real-time outline regeneration."""

import json
import math
from pathlib import Path


def normalize_width_profile(resampled_points, width_samples):
    """Convert (points, widths) to a normalized [{t, w}] profile where t ∈ [0,1]."""
    if len(resampled_points) < 2:
        return []
    cum = 0.0
    lengths = [0.0]
    for i in range(1, len(resampled_points)):
        dx = resampled_points[i][0] - resampled_points[i - 1][0]
        dy = resampled_points[i][1] - resampled_points[i - 1][1]
        cum += math.hypot(dx, dy)
        lengths.append(cum)
    total = lengths[-1]
    if total == 0:
        return [{"t": 0.0, "w": width_samples[0]}]
    return [{"t": lengths[i] / total, "w": width_samples[i]} for i in range(len(width_samples))]


def generate_html(json_path: Path, outline_svg_path: Path, centerline_svg_path: Path,
                  image_path: Path | None, out_path: Path):
    data = json.loads(json_path.read_text(encoding="utf-8"))
    outline_svg = outline_svg_path.read_text(encoding="utf-8")
    centerline_svg = centerline_svg_path.read_text(encoding="utf-8")

    # Build per-branch metadata: color, width, normalized width profile
    branch_meta = {}
    for br in data["branches"]:
        bid = br["id"]
        rpts = br.get("resampledPoints", br["points"])
        wsamps = br.get("widthSamples", [br["strokeWidth"]] * len(rpts))
        branch_meta[bid] = {
            "stroke": br["stroke"],
            "strokeWidth": br["strokeWidth"],
            "widthProfile": normalize_width_profile(rpts, wsamps),
        }
    inline_meta = json.dumps(branch_meta)
    taper_params = json.dumps(data.get("taperParams", {
        "base_width": 30.0, "level_decay": 0.6, "dist_power": 0.5,
        "taper_rate": 0.7, "min_width": 3.0,
    }))

    img_src = ""
    if image_path and image_path.exists():
        try:
            img_src = str(image_path.resolve().relative_to(out_path.parent.resolve()))
        except ValueError:
            img_src = str(image_path.resolve())

    def esc(s):
        return s.replace("\\", "\\\\").replace("`", "\\`").replace("$", "\\$")

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Branch Editor</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.18/paper-full.min.js"></script>
<style>
  * {{ box-sizing: border-box; margin: 0; }}
  body {{ background: #1a1a2e; color: #eee; font-family: system-ui, sans-serif; overflow: hidden; }}
  .toolbar {{
    padding: 6px 14px; background: #16213e; display: flex; gap: 8px; align-items: center;
    border-bottom: 1px solid #333; height: 38px;
  }}
  .toolbar .sep {{ width: 1px; height: 22px; background: #444; }}
  .toolbar label {{ display: flex; align-items: center; gap: 4px; font-size: 12px; }}
  .toolbar input[type=range] {{ width: 70px; }}
  .toolbar button {{
    padding: 3px 10px; border: 1px solid #555; border-radius: 3px;
    background: #0f3460; color: #eee; cursor: pointer; font-size: 12px;
  }}
  .toolbar button:hover {{ background: #1a5276; }}
  .toolbar button.active {{ background: #1a5276; border-color: #4fc3f7; }}
  #canvas {{ display: block; }}
  .info {{ position: fixed; bottom: 6px; right: 14px; font-size: 11px; color: #555; }}
</style>
</head>
<body>
<div class="toolbar">
  <button id="btnSel" class="active" title="Select & edit curves">Select</button>
  <button id="btnPen" title="Add points to curve">Pen</button>
  <div class="sep"></div>
  <button id="btnHandles" class="active">Handles</button>
  <button id="btnOutline" class="active">Outline</button>
  <button id="btnSource" class="active">Source</button>
  <div class="sep"></div>
  <label title="Branch opacity">α <input type="range" id="rOpacity" min="0" max="100" value="90"> <span id="vOpacity">90%</span></label>
  <div class="sep"></div>
  <button id="btnExport" title="Export edited SVG">Export</button>
  <button id="btnReset" title="Reset all edits">Reset</button>
</div>
<canvas id="canvas"></canvas>
<div class="info" id="info"></div>
<script>
window.onload = function() {{
  const W = {data["image"]["width"]};
  const H = {data["image"]["height"]};
  const META = {inline_meta};
  const TAPER = {taper_params};
  const CX = W / 2, CY = H / 2;

  function taperWidth(t, rootDist, maxDist) {{
    const df = Math.max(0.3, 1.0 - rootDist / maxDist) ** TAPER.dist_power;
    const base = TAPER.base_width * df;
    return Math.max(TAPER.min_width, base * (1.0 - TAPER.taper_rate * t));
  }}

  // --- Canvas setup ---
  const canvas = document.getElementById('canvas');
  function fit() {{
    const d = {{ w: window.innerWidth, h: window.innerHeight - 40 }};
    canvas.width = d.w; canvas.height = d.h;
    canvas.style.width = d.w + 'px'; canvas.style.height = d.h + 'px';
    if (!paper.project) return;
    const scale = Math.min(d.w / W, d.h / H);
    paper.view.viewSize = new paper.Size(d.w, d.h);
    paper.view.matrix.reset();
    paper.view.scale(scale, new paper.Point(0, 0));
    paper.view.update();
  }}
  paper.setup(canvas);
  fit();
  window.addEventListener('resize', fit);

  // --- Outline generation (ported from Python) ---
  function computeNormals(pts) {{
    const normals = [];
    for (let i = 0; i < pts.length; i++) {{
      let dx, dy;
      if (i === 0) {{ dx = pts[1][0] - pts[0][0]; dy = pts[1][1] - pts[0][1]; }}
      else if (i === pts.length - 1) {{ dx = pts[pts.length-1][0] - pts[pts.length-2][0]; dy = pts[pts.length-1][1] - pts[pts.length-2][1]; }}
      else {{ dx = pts[i+1][0] - pts[i-1][0]; dy = pts[i+1][1] - pts[i-1][1]; }}
      const len = Math.hypot(dx, dy);
      if (len === 0) {{ normals.push([0, 1]); }}
      else {{ normals.push([-dy / len, dx / len]); }}
    }}
    return normals;
  }}

  function chaikinSmooth(pts, iter) {{
    for (let it = 0; it < iter; it++) {{
      if (pts.length <= 2) break;
      const nw = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {{
        const p0 = pts[i], p1 = pts[i+1];
        nw.push([0.75*p0[0] + 0.25*p1[0], 0.75*p0[1] + 0.25*p1[1]]);
        nw.push([0.25*p0[0] + 0.75*p1[0], 0.25*p0[1] + 0.75*p1[1]]);
      }}
      nw.push(pts[pts.length - 1]);
      pts = nw;
    }}
    return pts;
  }}

  function generateOutline(centerline, widths, widthScale) {{
    const minW = 4.0;
    const sw = widths.map(w => Math.max(minW, w * widthScale));
    const normals = computeNormals(centerline);
    let left = [], right = [];
    for (let i = 0; i < centerline.length; i++) {{
      const cx = centerline[i][0], cy = centerline[i][1];
      const nx = normals[i][0], ny = normals[i][1];
      const hw = sw[i] / 2;
      left.push([cx + nx * hw, cy + ny * hw]);
      right.push([cx - nx * hw, cy - ny * hw]);
    }}
    left = chaikinSmooth(left, 1);
    right = chaikinSmooth(right, 1);
    // Build SVG path: forward left, reverse right, close
    let d = 'M ' + left[0][0].toFixed(1) + ' ' + left[0][1].toFixed(1);
    for (let i = 1; i < left.length; i++) d += ' L ' + left[i][0].toFixed(1) + ' ' + left[i][1].toFixed(1);
    for (let i = right.length - 1; i >= 0; i--) d += ' L ' + right[i][0].toFixed(1) + ' ' + right[i][1].toFixed(1);
    d += ' Z';
    return d;
  }}

  // Flatten a Paper.js Path to a dense polyline
  function flattenPath(path, step) {{
    const pts = [];
    const len = path.length;
    if (len < 1) return pts;
    for (let off = 0; off <= len; off += step) {{
      const pt = path.getPointAt(Math.min(off, len));
      pts.push([pt.x, pt.y]);
    }}
    // Ensure last point
    const last = path.getPointAt(len);
    if (pts.length === 0 || Math.hypot(last.x - pts[pts.length-1][0], last.y - pts[pts.length-1][1]) > 0.5) {{
      pts.push([last.x, last.y]);
    }}
    return pts;
  }}

  // Interpolate width from normalized profile at parameter t ∈ [0,1]
  function interpWidth(profile, t) {{
    if (!profile || profile.length === 0) return 12;
    if (t <= profile[0].t) return profile[0].w;
    if (t >= profile[profile.length-1].t) return profile[profile.length-1].w;
    for (let i = 0; i < profile.length - 1; i++) {{
      if (t >= profile[i].t && t <= profile[i+1].t) {{
        const frac = (profile[i+1].t - profile[i].t) > 0 ? (t - profile[i].t) / (profile[i+1].t - profile[i].t) : 0;
        return profile[i].w + frac * (profile[i+1].w - profile[i].w);
      }}
    }}
    return profile[profile.length-1].w;
  }}

  // --- Layers ---
  const bgLayer = paper.project.activeLayer;
  const editLayer = new paper.Layer();

  // --- State ---
  let showHandles = true, showOutline = true, showSource = true;
  let sourceRaster = null;
  const editPaths = [];
  const outlinePaths = [];   // parallel array: outline path per edit path
  const origData = [];
  const origOutlineData = [];

  // --- Load source image ---
  bgLayer.activate();
  if ("{img_src}") {{
    sourceRaster = new paper.Raster("{img_src}");
    sourceRaster.onLoad = () => {{ sourceRaster.position = new paper.Point(W/2, H/2); sourceRaster.sendToBack(); draw(); }};
    sourceRaster.onError = () => {{ sourceRaster = null; showSource = false; draw(); }};
  }}

  // Static outline SVG is skipped — we generate outlines dynamically from width profiles

  // --- Load centerline paths as editable curves ---
  bgLayer.activate();
  const clImported = paper.project.importSVG(`{esc(centerline_svg)}`);

  function extractPaths(item) {{
    const r = [];
    if (item instanceof paper.Path) r.push(item);
    else if (item.children) for (let i = item.children.length-1; i >= 0; i--) r.push(...extractPaths(item.children[i]));
    return r;
  }}

  editLayer.activate();
  const rawPaths = extractPaths(clImported);
  for (const rp of rawPaths) {{
    rp.remove();
    editLayer.addChild(rp);
    const id = rp.name || '';
    const meta = META[id] || {{}};
    rp.strokeColor = meta.stroke || '#fff';
    rp.strokeWidth = Math.max(8, (meta.strokeWidth || 12) * 0.35);
    rp.strokeCap = 'round'; rp.strokeJoin = 'round';
    rp.fillColor = null; rp.selected = false; rp.fullySelected = false;
    editPaths.push(rp);
    origData.push(rp.pathData);
  }}
  clImported.remove();

  // --- Build per-branch outline paths from stored width profiles ---
  bgLayer.activate();
  for (let i = 0; i < editPaths.length; i++) {{
    const p = editPaths[i];
    const id = p.name || '';
    const meta = META[id] || {{}};
    const profile = meta.widthProfile || [];
    const color = meta.stroke || '#888';

    // Flatten centerline to dense points, then generate outline
    const dense = flattenPath(p, 5);
    const totalLen = dense.length > 1 ? dense.reduce((s, pt, j) =>
      j === 0 ? 0 : s + Math.hypot(pt[0]-dense[j-1][0], pt[1]-dense[j-1][1]), 0) : 1;
    let cumT = 0;
    const widths = [];
    for (let j = 0; j < dense.length; j++) {{
      const t = totalLen > 0 ? cumT / totalLen : 0;
      widths.push(interpWidth(profile, t));
      if (j < dense.length - 1) cumT += Math.hypot(dense[j+1][0]-dense[j][0], dense[j+1][1]-dense[j][1]);
    }}

    const outlineD = generateOutline(dense, widths, 1.0);
    const op = new paper.Path(outlineD);
    op.fillColor = color;
    op.strokeColor = null;
    op.name = id + '_outline';
    outlinePaths.push(op);
    origOutlineData.push(outlineD);
  }}

  console.log('Loaded ' + editPaths.length + ' editable paths with live outlines');

  // --- Regenerate outline for a specific branch ---
  const maxDist = editPaths.reduce((mx, p) => {{
    const r0 = Math.hypot(p.firstSegment.point.x - CX, p.firstSegment.point.y - CY);
    const r1 = Math.hypot(p.lastSegment.point.x - CX, p.lastSegment.point.y - CY);
    return Math.max(mx, Math.min(r0, r1));
  }}, 1);

  function regenerateOutline(idx) {{
    const p = editPaths[idx];
    const id = p.name || '';
    const meta = META[id] || {{}};
    const profile = meta.widthProfile || [];
    const dense = flattenPath(p, 5);
    const totalLen = dense.length > 1 ? dense.reduce((s, pt, j) =>
      j === 0 ? 0 : s + Math.hypot(pt[0]-dense[j-1][0], pt[1]-dense[j-1][1]), 0) : 1;
    let cumT = 0;
    const widths = [];
    for (let j = 0; j < dense.length; j++) {{
      const t = totalLen > 0 ? cumT / totalLen : 0;
      if (profile.length > 0) {{
        widths.push(interpWidth(profile, t));
      }} else {{
        // New branch: use taper model based on distance to center
        const rootDist = Math.min(
          Math.hypot(dense[0][0] - CX, dense[0][1] - CY),
          Math.hypot(dense[dense.length-1][0] - CX, dense[dense.length-1][1] - CY)
        );
        widths.push(taperWidth(t, rootDist, maxDist));
      }}
      if (j < dense.length - 1) cumT += Math.hypot(dense[j+1][0]-dense[j][0], dense[j+1][1]-dense[j][1]);
    }}
    const outlineD = generateOutline(dense, widths, 1.0);
    outlinePaths[idx].pathData = outlineD;
  }}

  // --- Drawing ---
  function draw() {{
    if (sourceRaster) {{ sourceRaster.visible = showSource; if (showSource) sourceRaster.sendToBack(); }}
    for (const op of outlinePaths) op.visible = showOutline;

    const opacity = parseInt(document.getElementById('rOpacity').value) / 100;
    editLayer.opacity = opacity;

    for (const p of editPaths) {{
      if (p.selected) p.fullySelected = showHandles;
      else p.fullySelected = false;
    }}
    document.getElementById('info').textContent = editPaths.length + ' curves | ' + W + 'x' + H;
    paper.view.update();
  }}
  draw();

  // --- Select Tool ---
  const selTool = new paper.Tool();
  let curSeg = null, curPath = null, curType = null, curIdx = -1;

  function hitEditPaths(point) {{
    for (let i = editPaths.length - 1; i >= 0; i--) {{
      const p = editPaths[i];
      for (const seg of p.segments) {{
        if (point.getDistance(seg.point) < 10) return {{ item: p, idx: i, type: 'segment', segment: seg }};
        const hi = seg.point.add(seg.handleIn), ho = seg.point.add(seg.handleOut);
        if (seg.handleIn.length > 0 && point.getDistance(hi) < 10) return {{ item: p, idx: i, type: 'handle', segment: seg, handleType: 'handleIn' }};
        if (seg.handleOut.length > 0 && point.getDistance(ho) < 10) return {{ item: p, idx: i, type: 'handle', segment: seg, handleType: 'handleOut' }};
      }}
      const closest = p.getNearestPoint(point);
      if (closest && point.getDistance(closest) < 12) {{
        const loc = p.getLocationOf(closest);
        return {{ item: p, idx: i, type: 'stroke', location: loc }};
      }}
    }}
    return null;
  }}

  selTool.onMouseDown = function(e) {{
    curSeg = null; curType = null; curPath = null; curIdx = -1;
    for (const p of editPaths) {{ p.selected = false; p.fullySelected = false; }}
    const hit = hitEditPaths(e.point);
    if (!hit) {{ draw(); return; }}
    curPath = hit.item; curIdx = hit.idx; curPath.selected = true;
    if (hit.type === 'segment') {{ curSeg = hit.segment; curType = 'point'; }}
    else if (hit.type === 'handle') {{ curSeg = hit.segment; curType = hit.handleType; }}
    else if (hit.type === 'stroke') {{
      curSeg = curPath.insert(hit.location.index + 1, e.point);
      curType = 'point';
      curPath.smooth({{ type: 'continuous' }});
    }}
    curPath.bringToFront();
    draw();
  }};

  selTool.onMouseDrag = function(e) {{
    if (!curPath) return;
    if (curSeg) {{
      if (curType === 'point') curSeg.point = curSeg.point.add(e.delta);
      else if (curType === 'handleIn') curSeg.handleIn = curSeg.handleIn.add(e.delta);
      else if (curType === 'handleOut') curSeg.handleOut = curSeg.handleOut.add(e.delta);
    }} else {{
      curPath.position = curPath.position.add(e.delta);
    }}
    // Regenerate outline for this branch
    if (curIdx >= 0) regenerateOutline(curIdx);
    paper.view.update();
  }};

  selTool.onMouseMove = function(e) {{
    canvas.style.cursor = hitEditPaths(e.point) ? 'pointer' : 'default';
  }};

  selTool.onKeyDown = function(e) {{
    if ((e.key === 'delete' || e.key === 'backspace') && curSeg && curPath && curPath.segments.length > 2) {{
      curSeg.remove(); curSeg = null;
      if (curIdx >= 0) regenerateOutline(curIdx);
      draw();
    }}
  }};

  // --- Pen Tool ---
  const penTool = new paper.Tool();
  let penTarget = null, penIdx = -1;

  penTool.onMouseDown = function(e) {{
    canvas.style.cursor = 'crosshair';
    if (penTarget) {{
      if (penTarget.segments.length > 2 && e.point.getDistance(penTarget.firstSegment.point) < 12) {{
        penTarget.closed = true; penTarget = null; draw(); return;
      }}
      penTarget.add(e.point);
      if (penIdx >= 0) regenerateOutline(penIdx);
      draw(); return;
    }}
    for (let i = 0; i < editPaths.length; i++) {{
      const p = editPaths[i];
      if (e.point.getDistance(p.lastSegment.point) < 15 || e.point.getDistance(p.firstSegment.point) < 15) {{
        penTarget = p; penIdx = i; p.selected = true;
        if (e.point.getDistance(p.firstSegment.point) < 15) p.reverse();
        draw(); return;
      }}
    }}
    penTarget = new paper.Path();
    penTarget.strokeColor = '#fff'; penTarget.strokeWidth = 6; penTarget.strokeCap = 'round';
    penTarget.add(e.point);
    editPaths.push(penTarget); origData.push('');
    // Create a placeholder outline
    const op = new paper.Path(); op.fillColor = '#fff'; op.strokeColor = null;
    outlinePaths.push(op); origOutlineData.push('');
    penIdx = editPaths.length - 1;
    draw();
  }};

  penTool.onMouseDrag = function(e) {{
    if (penTarget && penTarget.lastSegment) {{
      penTarget.lastSegment.handleOut = e.point.subtract(penTarget.lastSegment.point);
      if (penIdx >= 0) regenerateOutline(penIdx);
      paper.view.update();
    }}
  }};

  penTool.onKeyDown = function(e) {{
    if (e.key === 'escape' && penTarget) {{
      if (penTarget.segments.length < 2 && origData[editPaths.indexOf(penTarget)] === '') {{
        const idx = editPaths.indexOf(penTarget);
        editPaths.splice(idx, 1); origData.splice(idx, 1);
        outlinePaths[idx].remove(); outlinePaths.splice(idx, 1); origOutlineData.splice(idx, 1);
        penTarget.remove();
      }}
      penTarget = null; penIdx = -1;
      draw();
    }}
  }};

  selTool.activate();

  // --- Toolbar ---
  document.getElementById('btnSel').onclick = function() {{
    this.classList.add('active'); document.getElementById('btnPen').classList.remove('active');
    canvas.style.cursor = 'default'; selTool.activate();
  }};
  document.getElementById('btnPen').onclick = function() {{
    this.classList.add('active'); document.getElementById('btnSel').classList.remove('active');
    canvas.style.cursor = 'crosshair'; penTool.activate();
  }};
  document.getElementById('btnHandles').onclick = function() {{
    showHandles = !showHandles; this.classList.toggle('active'); draw();
  }};
  document.getElementById('btnOutline').onclick = function() {{
    showOutline = !showOutline; this.classList.toggle('active'); draw();
  }};
  document.getElementById('btnSource').onclick = function() {{
    showSource = !showSource; this.classList.toggle('active'); draw();
  }};
  document.getElementById('rOpacity').oninput = function() {{
    document.getElementById('vOpacity').textContent = this.value + '%'; draw();
  }};
  document.getElementById('btnExport').onclick = function() {{
    const svg = paper.project.exportSVG({{ asString: true }});
    const blob = new Blob([svg], {{ type: 'image/svg+xml' }});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'edited_branches.svg';
    a.click();
  }};
  document.getElementById('btnReset').onclick = function() {{
    for (let i = 0; i < editPaths.length; i++) {{
      if (origData[i]) editPaths[i].pathData = origData[i];
      editPaths[i].selected = false; editPaths[i].fullySelected = false;
      if (origOutlineData[i]) outlinePaths[i].pathData = origOutlineData[i];
    }}
    curSeg = null; curPath = null; penTarget = null; curIdx = -1; penIdx = -1;
    draw();
  }};
}};
</script>
</body>
</html>'''

    out_path.write_text(html, encoding="utf-8")
    print(f"Wrote: {out_path} ({len(html)} bytes)")


def main():
    base = Path(__file__).resolve().parent
    generate_html(
        json_path=base / "output" / "editable_branches.json",
        outline_svg_path=base / "output" / "editable_branches_outline.svg",
        centerline_svg_path=base / "output" / "editable_branches.svg",
        image_path=base / "reference.png",
        out_path=base / "output" / "editable_canvas.html",
    )


if __name__ == "__main__":
    main()
