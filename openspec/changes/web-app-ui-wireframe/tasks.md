## 1. Project Setup

- [x] 1.1 Install Paper.js dependency in `@omm/web` (`pnpm add paper`)
- [x] 1.2 Verify Tailwind CSS is configured for `@omm/web` app chrome styling

## 2. Shell Layout

- [x] 2.1 Create `usePanelSizing()` composable that computes toolbar height (min 48px) and sidebar width (min 240px) proportional to canvas area aspect ratio, recalculating on window resize
- [x] 2.2 Create `AppShell.vue` with flexbox column layout consuming the composable's values as dynamic toolbar height and sidebar width
- [x] 2.3 Add panel borders/dividers between toolbar, sidebar, and canvas

## 3. Toolbar

- [x] 3.1 Create `AppToolbar.vue` with horizontal icon button row, height driven by composable
- [x] 3.2 Add placeholder SVG icon buttons for: Select, Hand, Rectangle, Diamond, Ellipse, Arrow, Line, Freedraw, Text, Image, Eraser

## 4. Sidebar

- [x] 4.1 Create `OutlineSidebar.vue` with dark gray (#1e1e1e) background, width driven by composable (min 240px)
- [x] 4.2 Add full-height monospace textarea with sample `content-outline-text` content

## 5. Canvas Viewport

- [x] 5.1 Create `CanvasViewport.vue` with Paper.js `<canvas>` element
- [x] 5.2 Initialize Paper.js in `onMounted` with `paper.setup(canvas)`
- [x] 5.3 Handle panel size changes (from composable) and window resize to update `paper.view.viewSize`

## 6. Integration

- [x] 6.1 Wire AppShell, AppToolbar, OutlineSidebar, CanvasViewport into the app entry point
- [ ] 6.2 Verify layout renders correctly at 1280x800, ultrawide (2560x1080), and portrait (800x1280), confirming proportional scaling above minimums
