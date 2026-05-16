## 1. Panel Sizing Composable

- [x] 1.1 Rewrite `usePanelSizing` to accept an optional reactive `surfaceAspect` parameter (default √2) and compute canvas, toolbar, and sidebar dimensions algebraically so canvas matches the surface ratio.
- [x] 1.2 Implement landscape dimension calculation: solve for `sidebarW` given `toolbarH = TOOLBAR_MIN_H` and `surfaceAspect`; clamp `sidebarW ≥ SIDEBAR_MIN_W` and adjust `toolbarH` if needed.
- [x] 1.3 Implement portrait dimension calculation: solve for `sidebarH` given `toolbarH = TOOLBAR_MIN_H` and `surfaceAspect`; clamp `sidebarH ≥ SIDEBAR_MIN_H` and adjust `toolbarH` if needed.
- [x] 1.4 Export `isPortrait` and `sidebarHeight` from the composable for use by `AppShell.vue`.

## 2. Component Integration

- [x] 2.1 Update `AppShell.vue` to pass surface aspect ratio from loaded document state to `usePanelSizing`, defaulting to √2 when no document is loaded.
- [x] 2.2 Update `CanvasViewport.vue` to use the surface-proportional canvas dimensions from the composable without additional internal scaling.

## 3. Verification

- [x] 3.1 Verify layout at 1280×800 (landscape, default √2 surface): canvas aspect matches √2, sidebar left, toolbar at minimum.
- [x] 3.2 Verify layout at 2560×1080 (ultrawide, default √2 surface): canvas aspect matches √2.
- [x] 3.3 Verify layout at 800×1280 (portrait, default √2 surface): canvas aspect matches √2, sidebar at bottom.

## 4. Ultrawide Centering

- [x] 4.1 Add `SIDEBAR_MAX_W` and `SIDEBAR_MAX_H` constants to `use-panel-sizing.ts` and clamp sidebar dimensions to their maximums after the algebraic calculation.
- [x] 4.2 Export `contentMaxWidth` from the composable: `sidebarW + canvasW` in landscape, `viewportW` in portrait (no centering needed).
- [x] 4.3 Update `AppShell.vue` to wrap the entire layout in a container with `max-width: contentMaxWidth` and `margin: 0 auto`, height 100vh.
- [x] 4.4 Update `AppToolbar.vue` to accept an explicit width prop instead of stretching to viewport width, so it matches the content block width on ultrawide screens.
- [x] 4.5 Verify ultrawide (2560×1080): content centered horizontally, toolbar width = sidebarW + canvasW, no vertical centering.
