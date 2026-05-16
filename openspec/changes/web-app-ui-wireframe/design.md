## Context

Phase 2's landing page is the app itself (PRD R9) — an Excalidraw-like canvas with a three-panel layout. This wireframe establishes the visual shell before backend wiring. The frontend uses Vue 3 + Vite + Paper.js per TD.md, with Tailwind CSS for app chrome only (not for canvas rendering).

Current state: `@omm/web` exists as a Vue/Vite package but has no UI shell yet. This is the first UI work.

## Goals / Non-Goals

**Goals:**
- Establish the three-panel layout: top toolbar, left content-outline-text sidebar, right Paper.js canvas
- Toolbar and sidebar have minimum sizes (toolbar min 48px height, sidebar min 240px width) and scale proportionally based on canvas area aspect ratio
- Toolbar mirrors excalidraw's `.shapes-section` tools as placeholder icon buttons
- Sidebar renders a monospace textarea for `content-outline-text` (field-less, 2-space indent per TERMS.md)
- Paper.js canvas initializes and fills remaining viewport space
- All panels respond to window resize with aspect-ratio-aware scaling

**Non-Goals:**
- No backend integration, auth, or API calls
- No actual canvas interaction (drawing, selection, pan/zoom)
- No content-outline-text parsing or validation
- No toolbar button functionality
- No persistent state or document loading

## Decisions

### Component structure

Three top-level Vue components inside a shell layout:
- `AppToolbar.vue` — top strip, min height 48px, scales with canvas aspect ratio
- `OutlineSidebar.vue` — left panel, min width 240px, dark gray background, scales with canvas aspect ratio
- `CanvasViewport.vue` — flex-grow right area with Paper.js `<canvas>`

Shell uses CSS flexbox for layout structure. Toolbar height and sidebar width are computed dynamically via a composable that reads the canvas area's aspect ratio and applies proportional scaling above the minimums. As the viewport gets wider/taller, toolbar and sidebar grow proportionally; as it shrinks, they clamp at their minimums.

**Alternative**: Fixed sizes only (48px toolbar, 240px sidebar). Rejected — on wide monitors the chrome feels too thin relative to the canvas; on tall narrow viewports it wastes space. Proportional scaling keeps the UI balanced.

**Alternative**: CSS Grid with explicit template areas. Rejected — flexbox + JS-driven sizing is simpler for this dynamic layout.

### Toolbar icon approach

Use inline SVG icons or a lightweight icon set (e.g., Lucide) for toolbar buttons. Start with all excalidraw tools (Select, Hand, Rectangle, Diamond, Ellipse, Arrow, Line, Freedraw, Text, Image, Eraser) as disabled placeholders. Visual only.

### Aspect-ratio-aware panel sizing

A `usePanelSizing()` composable computes toolbar height and sidebar width from the canvas area's aspect ratio:
- `toolbarHeight = max(48, viewportHeight * scale)` — scales with viewport height
- `sidebarWidth = max(240, viewportWidth * scale)` — scales with viewport width
- The scale factor is derived from the canvas area aspect ratio so that wider viewports get wider sidebars and taller viewports get taller toolbars, keeping the chrome proportional to the canvas content area.

This runs on mount and on window resize. The computed values are passed as CSS custom properties or inline styles to the shell layout.

### Paper.js initialization

Paper.js attaches to a `<canvas>` element in `CanvasViewport.vue`. Use `paper.setup(canvasElement)` in `onMounted`. Canvas resizes via `paper.view.viewSize` update whenever panel sizes change (triggered by the aspect-ratio-aware composable). No project content loaded — empty canvas.

### Styling boundary

Tailwind CSS for toolbar and sidebar styling (backgrounds, spacing, borders). Canvas viewport has no Tailwind — Paper.js owns all rendering inside it. This maintains the TD.md constraint: "Tailwind must not become the source of truth for OMM document rendering."

## Risks / Trade-offs

- **Paper.js bundle size**: ~280KB uncompressed. Acceptable for a canvas-heavy app; tree-shaking won't help since we use most features. → Accept as-is.
- **Toolbar icon fidelity**: Placeholder icons may not match final design. → Intentional — wireframe phase, icons will be refined later.
- **Responsive behavior**: 240px fixed sidebar may be tight on small screens. → Acceptable for desktop-first SaaS; mobile support is a later concern.
