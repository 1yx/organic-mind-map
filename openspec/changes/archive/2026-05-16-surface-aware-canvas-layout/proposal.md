## Why

The editor canvas currently fills whatever space remains after toolbar and sidebar layout, ignoring the document's surface aspect ratio. This means the canvas area does not reflect the actual proportions of the generated mind map, making it impossible to see true-to-scale output and causing confusion when the surface ratio differs from the viewport ratio.

## What Changes

- Make the editor canvas area respect the `OmmDocument.surface.aspectRatio` so the editable region always matches the document's surface proportions.
- Dynamically compute toolbar height and sidebar dimensions so that the remaining canvas space has the correct surface aspect ratio.
- In landscape layout, sidebar width adjusts dynamically; in portrait layout, bottom sidebar height adjusts dynamically.
- Toolbar height and sidebar size each have minimum values; the layout always satisfies at least one of these at its minimum.
- Default surface aspect ratio is `√2` (≈ 1.414) when no document is loaded.

## Capabilities

### New Capabilities

- `surface-canvas-sizing`: Computes canvas, toolbar, and sidebar dimensions so that the canvas region matches the document's surface aspect ratio, with toolbar and sidebar minimums enforced.

### Modified Capabilities

## Impact

- `packages/web/src/composables/use-panel-sizing.ts` — rewritten to compute dimensions from surface aspect ratio instead of viewport-only heuristics
- `packages/web/src/components/AppShell.vue` — passes surface aspect ratio to panel sizing
- `packages/web/src/components/CanvasViewport.vue` — receives and uses surface-proportional canvas dimensions
