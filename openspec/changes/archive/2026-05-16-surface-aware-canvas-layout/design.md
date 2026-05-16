## Context

The editor canvas in `@omm/web` currently fills whatever space remains after toolbar and sidebar are placed. It does not respect the document's `surface.aspectRatio`. The preview mode (`App.vue`) already constrains its paper-surface div to the surface aspect ratio using CSS `aspect-ratio`, but the editor (`AppShell.vue` + `CanvasViewport.vue`) does not.

The layout has two modes (already implemented):
- **Landscape**: toolbar top, sidebar left, canvas right
- **Portrait**: toolbar top, canvas top, sidebar bottom

Both modes need the canvas region to match the surface aspect ratio.

## Goals / Non-Goals

**Goals:**

- Compute toolbar, sidebar, and canvas dimensions so the canvas region always matches the document's surface aspect ratio
- In landscape: sidebar width is dynamic, toolbar height is at minimum; if sidebar would go below its minimum, sidebar stays at minimum and toolbar shrinks instead
- In portrait: bottom sidebar height is dynamic, toolbar height is at minimum; if sidebar would go below its minimum, sidebar stays at minimum and toolbar shrinks instead
- Default to `√2 ≈ 1.414` aspect ratio when no document is loaded (matches the only current preset `sqrt2-landscape`)

**Non-Goals:**

- No changes to the surface preset system itself (still only `sqrt2-landscape`)
- No changes to the backend API
- No responsive breakpoints or media queries — the `isPortrait` flag (aspect < 1) drives everything
- No zoom or pan controls for the canvas (future scope)

## Decisions

### Compute dimensions algebraically from surface aspect ratio

Given `viewportW`, `viewportH`, `surfaceAspect`, and minimums `TOOLBAR_MIN_H`, `SIDEBAR_MIN_W`/`SIDEBAR_MIN_H`:

**Landscape**: canvas must have aspect = surfaceAspect
```
canvasW = viewportW - sidebarW
canvasH = viewportH - toolbarH
canvasW / canvasH = surfaceAspect

→ sidebarW = viewportW - surfaceAspect * (viewportH - toolbarH)
```

If `sidebarW < SIDEBAR_MIN_W`, clamp `sidebarW = SIDEBAR_MIN_W` and solve for `toolbarH`:
```
toolbarH = viewportH - (viewportW - sidebarW) / surfaceAspect
```

If `toolbarH < TOOLBAR_MIN_H`, clamp both to minimums — the canvas won't perfectly match surface ratio but stays usable.

**Portrait**: same logic but sidebar is at the bottom:
```
sidebarH = viewportH - toolbarH - (viewportW / surfaceAspect)
```

Clamp `sidebarH ≥ SIDEBAR_MIN_H`, adjust `toolbarH` if needed.

Alternative considered: CSS `aspect-ratio` on a wrapper div. Rejected because Paper.js reads canvas pixel dimensions directly, so we need exact integer width/height values for the `<canvas>` element.

### Surface aspect ratio is a reactive input to `usePanelSizing`

The composable currently derives all sizing from viewport alone. It will accept an optional `surfaceAspect` parameter (defaults to √2). When the document loads, the caller updates this value reactively, and all dimensions recompute.

Alternative considered: passing surface aspect as a prop from `AppShell`. Rejected — keeping it in the composable centralizes the layout math.

## Risks / Trade-offs

- **Very small viewports may not fit** — if both toolbar and sidebar are clamped to minimums, the canvas aspect ratio won't match surface. This is acceptable as a graceful degradation.
- **Lag on surface aspect change** — when a new document loads, the layout jumps. Could be smoothed with CSS transitions but that's polish, not a requirement.
- **`use-panel-sizing.ts` becomes more complex** — the algebraic approach adds ~20 lines. Acceptable tradeoff for correctness.

## Ultrawide Centering

### Cap sidebar at maximum width

Without a cap, ultrawide viewports (e.g. 2560×1080) produce an absurdly wide sidebar because the formula solves `sidebarW = viewportW - surfaceAspect * (viewportH - toolbarH)`. At 2560×1080 with √2 surface this yields sidebarW ≈ 1101px.

Add `SIDEBAR_MAX_W = 360` (landscape) and `SIDEBAR_MAX_H = 320` (portrait). When the computed sidebar exceeds its maximum, clamp it. The remaining excess width is handled by centering.

### Horizontal centering of the entire content block

When sidebar is clamped at maximum, the content block width = `SIDEBAR_MAX_W + canvasW`. Wrap the entire layout (toolbar + sidebar + canvas) in a container with `max-width: contentBlockW` and `margin: 0 auto`. Height remains `100vh` — no vertical centering.

The `usePanelSizing` composable exports a `contentMaxWidth` computed value. `AppShell.vue` uses it to set the wrapper's max-width. `AppToolbar.vue` receives width as a prop instead of stretching to viewport.

```
Ultrawide (2560×1080, surface √2):
┌──留白──┬──────────────────────────────┬──留白──┐
│        │ Toolbar (contentMaxWidth)    │        │
│        ├──────────┬───────────────────┤        │
│        │ Sidebar  │ Canvas            │        │
│        │ (360)    │ (√2 ratio)        │        │
│        │          │                   │        │
└────────┴──────────┴───────────────────┴────────┘
         ↑ 贴顶贴底，只有水平居中
```
