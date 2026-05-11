## Context

The project already has a deterministic renderer and a standalone hand-drawn branch demo, but generated bitmap mind maps can currently only be viewed as images. The commercial path under discussion is YAML-first generation followed by image-model rendering; this prototype explores whether a generated image can be reconstructed into useful editable objects when the YAML structure is also available.

The prototype is intentionally separate from production. It uses `fixtures/handdraw/mindmap-6.yaml` as semantic structure and `fixtures/handdraw/mindmap-6.png` as a visual reference for a fixed editable sample.

## Goals / Non-Goals

**Goals:**

- Build a standalone editable SVG canvas demo for the mindmap-6 fixture.
- Treat YAML as the structure truth and the PNG as visual reference.
- Recreate the sample as editable objects: center card, colored branch curves, text labels, and lightweight doodle/icon placeholders.
- Provide basic editing: select, drag, text editing, JSON export/import, and reference overlay toggle.
- Keep the demo useful for evaluating product direction before committing to renderer/editor architecture.

**Non-Goals:**

- Do not implement automatic OCR, image segmentation, or bitmap-to-vector tracing.
- Do not attempt pixel-perfect reconstruction of the generated image.
- Do not integrate this into `@omm/web`, `@omm/renderer`, `.omm` export, or CLI.
- Do not add a full editor toolbar, undo/redo stack, collaboration, accounts, or cloud storage.
- Do not make production OrganicTree or OmmDocument schema changes.

## Decisions

### Use Standalone SVG Rather Than Production Web

The demo will live under `editable-handdraw-canvas-demo/` and can be opened directly or through a simple local server. SVG is the first implementation target because the editable objects are naturally paths, groups, text, and small vector doodles.

Alternative considered: use the production Vue Web app. Rejected because this is a product-direction spike and should not pollute the read-only MVP preview surface.

Alternative considered: use Canvas/Fabric/Konva immediately. Deferred because the first prototype needs transparent geometry and simple exportable objects more than a full editor abstraction.

### Use Fixture YAML as Structure Truth

The YAML defines title, center, branches, and children. The demo can use a small fixture-specific loader or embedded normalized data, but it should preserve the fixture content and surface malformed YAML as a fixture-quality issue rather than silently inventing content.

The current `mindmap-6.yaml` indentation should be normalized as part of the implementation so the fixture can be loaded consistently.

### Use Fixed Reconstruction Layout for the Spike

The first version should hand-map the reference composition into editable SVG objects. This avoids pretending that general image-to-canvas conversion is solved. Success is measured by whether a user can recognize the generated image composition and make simple edits.

### Keep Generated Image as Optional Reference Overlay

The PNG reference should be available as a semi-transparent background layer that can be toggled. This makes visual comparison and manual calibration possible while keeping editable SVG objects separate.

### Persist Demo State as JSON

The demo should support exporting/importing a local JSON representation of objects. This is not `.omm`; it is a prototype canvas state for evaluating editability.

## Risks / Trade-offs

- [Risk] The reconstruction may look less polished than the generated bitmap. -> Mitigation: frame the output as editable approximation and keep the reference overlay available.
- [Risk] Hand-mapped layout does not generalize. -> Mitigation: accept this for the spike; future work can replace fixed layout with assisted fitting.
- [Risk] Users may expect arbitrary image conversion. -> Mitigation: scope copy and tasks to YAML-backed fixture reconstruction only.
- [Risk] Doodle placeholders may feel weaker than generated illustrations. -> Mitigation: keep placeholders movable/editable and focus the spike on edit workflow rather than final illustration quality.
