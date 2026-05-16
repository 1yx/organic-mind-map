## Why

Phase 2 requires a web application shell (PRD R9). The landing page must be the functional canvas itself, not a marketing page. Before wiring any backend logic, we need a style-only wireframe that establishes the three-panel layout: top toolbar, left content-outline-text editor, and right Paper.js canvas.

## What Changes

- Add a top toolbar strip referencing excalidraw's `.shapes-section` tool icons (Select, Hand, Rectangle, Diamond, Ellipse, Arrow, Line, Freedraw, Text, Image, Eraser) — initially as placeholder buttons, to be filtered later.
- Add a 240px-wide left sidebar with dark gray background containing a content-outline-text editor area (field-less indentation-based plain text per TERMS.md).
- Add a Paper.js canvas filling the remaining right space.
- Style-only: no backend integration, no auth, no canvas interaction logic. Pure layout and visual shell.

## Capabilities

### New Capabilities
- `app-shell-layout`: Three-panel responsive layout (toolbar, sidebar, canvas) with correct sizing and styling.
- `content-outline-editor`: Left sidebar content-outline-text editing area with monospace font and proper indentation display.
- `canvas-viewport`: Paper.js canvas viewport that fills remaining space and resizes with the window.

### Modified Capabilities

_(No existing specs require modification — this is a new UI layer.)_

## Impact

- `@omm/web` package: new Vue 3 + Vite components for shell, toolbar, sidebar, and canvas.
- Dependencies: Paper.js (already planned in TD.md), no new external UI libraries for the wireframe phase.
- Does not affect existing specs or Python/backend code.
