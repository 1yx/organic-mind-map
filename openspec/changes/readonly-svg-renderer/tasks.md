## 1. Renderer Contract

- [x] 1.1 Define `RenderInput`, `RenderResult`, paper, diagnostic, and layout geometry types.
- [x] 1.2 Add renderer entry point for `PreviewPayload` input.
- [x] 1.3 Add renderer entry point for `.omm` document input.

## 2. Deterministic Instantiation

- [x] 2.1 Implement stable OrganicTree serialization for preview rendering.
- [x] 2.2 Derive browser-side `organicSeed` with a synchronous stable hash.
- [x] 2.3 Generate stable node IDs and main branch colors from tree order and seed.
- [x] 2.4 Generate seeded branch geometry parameters before layout solving: angle, curvature, taper, and length preference.
- [x] 2.5 Add tests proving repeated renders of the same payload are deterministic.
- [x] 2.6 Add tests proving seeded geometry is included before collision checks run.

## 3. Measurement And Layout

- [x] 3.1 Implement Canvas 2D `measureText()` text measurement adapter.
- [x] 3.2 Compute A3/A4 landscape viewBox and safe margins.
- [x] 3.3 Ensure layout measurement does not mount hidden DOM/SVG text nodes or call SVG `getBBox()` in iterative loops.
- [x] 3.4 Place center visual bounds.
- [x] 3.5 Assign first-level branch sectors around the center.
- [x] 3.6 Place child branches recursively within each parent sector.
- [x] 3.7 Compute conservative bounding boxes for text, center visual, branch shapes, and branch path envelopes.
- [x] 3.8 Implement basic bounding-box collision detection and local spacing correction.
- [x] 3.9 Detect unresolved crossings or overlaps and emit diagnostics.
- [x] 3.10 Clamp and visibly clip concept text when measured text exceeds available branch length.

## 4. SVG Rendering

- [x] 4.1 Render paper background and boundary.
- [x] 4.2 Render main and child branches as curved tapered SVG shapes.
- [x] 4.3 Render concept text along SVG branch paths.
- [x] 4.4 Avoid boxed node labels and rectangular text containers.
- [x] 4.5 Return non-empty SVG output with a stable viewBox.

## 5. Center Visual

- [x] 5.1 Render browser-loaded controlled SVG URL when `PreviewPayload.centerVisual.svgUrl` loads and passes the browser guard.
- [x] 5.2 Select deterministic built-in center visual fallback from OrganicTree content hash.
- [x] 5.3 Use fallback when SVG URL is absent, loading fails, times out, or is rejected.
- [x] 5.4 Accept single-color controlled SVGs in Phase 1 without automatic recoloring.

## 6. Diagnostics And Export Data

- [x] 6.1 Emit internal diagnostics for clipped text, missing asset fallback, layout overflow, unresolved collision, branch/text crossing, and hard layout failure.
- [x] 6.2 Expose computed layout geometry needed for browser-side `.omm` export.
- [x] 6.3 Include center bounds, branch paths, text paths, and paper bounds in the layout snapshot.

## 7. Tests And Fixtures

- [x] 7.1 Add fixture render test for a valid `PreviewPayload`.
- [x] 7.2 Add fixture render test for a valid `.omm` document.
- [x] 7.3 Add tests for distinct main branch colors and tapered curved branches.
- [x] 7.4 Add tests for path text rendering.
- [x] 7.5 Add tests for center SVG load success and deterministic fallback.
- [x] 7.6 Add tests for Canvas 2D measurement usage and absence of DOM/SVG measurement loops.
- [x] 7.7 Add tests for bounding-box collision correction and unresolved collision diagnostics.
- [x] 7.8 Add tests for text clipping diagnostics and hard layout diagnostics.
