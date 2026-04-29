# MVP Fixture Preview Workflow

This document describes how to use fixtures to validate the full Phase 1 MVP pipeline.

## Pipeline Overview

```
Agent CLI + skill
  -> OrganicTree (JSON)
  -> CLI validation and capacity checks
  -> PreviewPayload
  -> Browser-side layout and rendering
  -> Read-only SVG preview (OMM)
  -> .omm and PNG export from browser
```

## Quick Start: Preview a Fixture

```bash
# From the project root
pnpm dev:web

# In a separate terminal, start the preview server with a fixture
omm preview fixtures/organic-tree/valid-chinese.json
```

The CLI validates the OrganicTree, wraps it in a `PreviewPayload`, and starts a local HTTP
server. The Web preview app fetches the payload from `GET /api/document` and renders it
in the browser.

## Fixture Categories

### `fixtures/organic-tree/` — OrganicTree JSON

These represent the output of an **Agent CLI + skill** workflow. They follow the
`OrganicTree` contract (version 1) and are the primary input to the CLI.

**Valid fixtures:**

| File | Description | Use Case |
|------|-------------|----------|
| `valid-chinese.json` | Chinese concept-unit map | CJK content validation |
| `valid-english.json` | English concept-phrase map | ASCII content validation |
| `valid-mixed-cjk-ascii.json` | Mixed CJK and ASCII | Mixed-language support |
| `valid-deeper-hierarchy.json` | 22-node tree, depth 3 | Capacity and layout stress |
| `valid-center-visual-hint.json` | Center with `visualHint: "earth"` | Center visual template selection |
| `valid-unreachable-svg-url.json` | Center with broken `svgUrl` | Browser fallback resilience |

**Invalid fixtures:**

| File | Description | Expected Behavior |
|------|-------------|-------------------|
| `invalid-sentence-like.json` | Sentence-like concepts | Fails with path-specific quality errors |
| `invalid-oversized-capacity.json` | Exceeds `DEFAULT_LIMITS` | Fails with regeneration-oriented feedback |
| `invalid-oversized-concept.json` | Single concept exceeds width limit | Fails concept quality validation |
| `invalid-deep-nesting.json` | Depth exceeds 3 levels | Fails structural validation |

### `fixtures/omm/` — OmmDocument JSON

These represent saved `.omm` files with layout snapshots.

**Valid fixtures:**

| File | Description |
|------|-------------|
| `valid-minimal-a3.json` | Minimal map on A3 paper |
| `valid-a4-with-center-visual.json` | A4 map with image center visual |
| `valid-deeper-hierarchy-a3.json` | Deeper hierarchy on A3 paper |

### `fixtures/cli-preview/` — CLI Preview Handoff

These represent the CLI-to-browser handoff format (`PreviewPayload`).

| File | Description |
|------|-------------|
| `valid-handoff.json` | Complete valid handoff with paper and metadata |

## Rendering Determinism

Rendering determinism comes exclusively from the **content hash** (cyrb53) of the OrganicTree
JSON text. There is **no `--seed` CLI parameter**. The same fixture always produces identical
rendered output across runs.

```bash
# Deterministic: same input always yields same output
omm preview fixtures/organic-tree/valid-chinese.json
# Reload the page — the SVG will be identical
```

## Browser Export

The browser computes layout and provides two export options:

1. **`.omm` export** — Downloads an OmmDocument with the computed layout snapshot
2. **PNG export** — Renders the SVG to a PNG image and downloads it

Export verification is done through the Web preview UI. No Puppeteer or Playwright
dependency is added to the CLI for Phase 1.

## CLI One-Shot PNG Export

CLI one-shot PNG export (`omm export --png`) is **not available in Phase 1**. PNG export
requires browser-side layout computation and is only accessible through the Web preview.

## Phase 1 Scope

The MVP is a **read-only preview pipeline**, not a visual editor:

- No `.omm` visual editing
- No drag/drop editing
- No undo/redo
- No text editing overlays
- No WebSocket live updates
- No cloud sync or accounts

## Smoke Testing

### Automated Tests

Run the full test suite:

```bash
pnpm test
```

Fixture-specific tests:

```bash
# Core validation tests
pnpm --filter @omm/core test

# Renderer smoke tests
pnpm --filter @omm/renderer test
```

### Manual Smoke Checklist

1. Start the preview server with a fixture:

   ```bash
   omm preview fixtures/organic-tree/valid-chinese.json
   ```

2. Open the browser preview URL

3. Verify:
   - [ ] Paper boundary is visible and matches the selected paper size
   - [ ] Center visual is rendered (multi-color, non-white)
   - [ ] Branches are organic, curved, and tapered
   - [ ] Text appears on branches (not in boxes)
   - [ ] Main branches have distinct colors

4. Test the unreachable SVG URL fixture:

   ```bash
   omm preview fixtures/organic-tree/valid-unreachable-svg-url.json
   ```

5. Verify:
   - [ ] Browser shows a fallback template center visual (not a broken image or white screen)
   - [ ] No crash or error in browser console

6. Export `.omm` from the Web preview

7. Export PNG from the Web preview

## Test Coverage Summary

### Section 2: Validation Tests (`fixture-validation.test.ts`)

- Structural validation of all valid OrganicTree fixtures
- Concept quality validation (no sentence-like or width overflow)
- Capacity validation (within DEFAULT_LIMITS)
- Sentence-like error detection with path-specific errors
- Oversized input produces regeneration-oriented feedback
- OmmDocument validation

### Section 3: Preview Payload Tests (`preview-payload-fixture.test.ts`)

- Valid OrganicTree produces a renderable PreviewPayload
- Paper selection preserved in render output (different viewBoxes)
- Center visual hint propagated to renderer
- Unreachable SVG URL degrades to built-in fallback

### Section 4: Renderer Smoke Tests (`renderer-smoke-fixture.test.ts`)

- Deeper hierarchy renders to non-empty SVG
- OmmDocument renders with correct concepts
- Paper viewBox correctness (A3 vs A4)
- SVG structure contains paper, center visual, branches, text paths
- Unreachable URL fallback renders without crash
- No pixel-perfect assertions (structural checks only)
