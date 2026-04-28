# Tasks

## 1. Contract

- [ ] 1.1 Add an optional center SVG URL field to the OrganicTree center type.
- [ ] 1.2 Validate the optional URL field type without requiring it.
- [ ] 1.3 Preserve the optional URL through successful OrganicTree validation.

## 2. CLI Fetch Boundary

- [ ] 2.1 Add controlled HTTPS source allowlist handling for center SVG URLs.
- [ ] 2.2 Add SVG fetch with timeout and response size limit.
- [ ] 2.3 Treat malformed, non-allowlisted, failed, timed-out, or oversized fetches as non-fatal fallback cases.

## 3. Sanitization

- [ ] 3.1 Implement strict SVG parse and serialize sanitization.
- [ ] 3.2 Strip or reject scripts, foreignObject, event handler attributes, external references, CSS URL references, and embedded raster data URLs.
- [ ] 3.3 Add unsafe SVG fixture tests for sanitizer rejection or stripping behavior.

## 4. PreviewPayload Integration

- [ ] 4.1 Add `centerVisual.inlineSvg` support to the PreviewPayload type.
- [ ] 4.2 Populate `centerVisual.inlineSvg` only after successful fetch and sanitization.
- [ ] 4.3 Keep existing inputs without center SVG URLs producing valid PreviewPayloads unchanged.

## 5. Renderer

- [ ] 5.1 Render `PreviewPayload.centerVisual.inlineSvg` as the center visual when present.
- [ ] 5.2 Fall back to deterministic built-in center visual selection when inline SVG is absent.
- [ ] 5.3 Accept single-color inline SVGs as valid Phase 1 center visuals.

## 6. Export

- [ ] 6.1 Ensure PNG export uses inline SVG content without external image loading.
- [ ] 6.2 Ensure browser-exported `.omm` documents remain self-contained when an inline SVG center visual is used.

## 7. Tests

- [ ] 7.1 Add tests for successful controlled SVG fetch and inline payload population.
- [ ] 7.2 Add tests for uncontrolled URL fallback.
- [ ] 7.3 Add tests for fetch failure fallback.
- [ ] 7.4 Add renderer tests for inline SVG priority over built-in fallback.
- [ ] 7.5 Add export coverage showing no external image dependency for inline SVG center visuals.

## 8. Docs

- [ ] 8.1 Document the controlled SVG source rule.
- [ ] 8.2 Document the Phase 1 single-color center SVG exception.
- [ ] 8.3 Document that arbitrary web images, bitmap generation, Base64 bitmaps, and CLI PNG export remain out of scope.
