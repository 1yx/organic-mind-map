## Why

Generated hand-drawn mind map images can look commercially compelling, but a bitmap output cannot be corrected or reused as an editable map. This change prototypes a standalone editable reconstruction path that uses `fixtures/handdraw/mindmap-6.yaml` as the structure source and `fixtures/handdraw/mindmap-6.png` as the visual reference.

## What Changes

- Add a standalone editable demo under `editable-handdraw-canvas-demo/`.
- Load the mindmap-6 YAML structure as the semantic source for the editable map.
- Reconstruct the reference image as editable SVG objects: center card, main branches, child branches, labels, and simple doodle placeholders.
- Support basic editing interactions needed to evaluate the concept: select, drag, edit text, and export/import the editable JSON state.
- Show the reference image as an optional background overlay for visual comparison.
- Do not modify the production renderer, Web preview, `.omm` export, CLI, or OrganicTree contract.

## Capabilities

### New Capabilities

- `editable-handdraw-canvas-demo`: Standalone prototype for reconstructing a generated hand-drawn mind map as editable canvas/SVG objects.

### Modified Capabilities

- None.

## Impact

- Adds demo-only files under `editable-handdraw-canvas-demo/`.
- Adds OpenSpec artifacts for the prototype capability.
- Uses existing `fixtures/handdraw/mindmap-6.yaml` and `fixtures/handdraw/mindmap-6.png` as demo inputs.
- No new production runtime dependency and no production behavior change.
