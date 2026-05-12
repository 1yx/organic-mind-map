## 1. Fixture Preparation

- [x] 1.1 Normalize `fixtures/handdraw/mindmap-6.yaml` so it parses as valid YAML.
- [x] 1.2 Add a standalone demo directory under `editable-handdraw-canvas-demo/`.
- [x] 1.3 Create fixture-backed demo data that preserves title, center, six main branches, and child labels.

## 2. Editable Canvas Surface

- [x] 2.1 Render the mindmap-6 reconstruction as SVG objects with a center card, branch paths, labels, and doodle placeholders.
- [x] 2.2 Add a reference PNG overlay using `fixtures/handdraw/mindmap-6.png` with a visibility toggle.
- [x] 2.3 Style the reconstruction with hand-drawn colors, rough outlines, and branch geometry approximating the reference image.

## 3. Editing Interactions

- [x] 3.1 Implement object selection with a visible selected state.
- [x] 3.2 Implement dragging for editable object groups.
- [x] 3.3 Implement selected-label text editing.
- [x] 3.4 Implement demo-local JSON export and import.

## 4. Verification

- [x] 4.1 Add a browser verification script that checks visible editable center, branch, label, and doodle objects.
- [x] 4.2 Capture a screenshot under `.tmp/`.
- [x] 4.3 Run the demo verification script.
- [x] 4.4 Run `pnpm -w run lint`.
- [x] 4.5 Run `openspec validate prototype-editable-handdraw-canvas --strict`.
