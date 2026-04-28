# Tasks

## 1. Contract

- [x] 1.1 Add an optional center SVG URL field to the OrganicTree center type.
- [x] 1.2 Validate the optional URL field type without requiring it.
- [x] 1.3 Preserve the optional URL through successful OrganicTree validation.

## 2. CLI URL Boundary

- [x] 2.1 Add hardcoded controlled HTTPS source allowlist handling for center SVG URLs.
- [x] 2.2 Pass allowed center SVG URLs through as `PreviewPayload.centerVisual.svgUrl`.
- [x] 2.3 Omit malformed or non-allowlisted URLs without performing network fetch.
- [x] 2.4 Ensure CLI preview startup does not fetch, sanitize, cache, or inline SVG.

## 3. Browser Loading Guard

- [x] 3.1 Add browser-side asynchronous loading for allowed center SVG URLs.
- [x] 3.2 Add lightweight rejection for scripts, foreignObject, event handler attributes, external references, CSS URL references, and embedded raster data URLs.
- [x] 3.3 Add browser response timeout and response size limit.
- [x] 3.4 Add unsafe SVG fixture tests for browser guard rejection behavior.

## 4. PreviewPayload Integration

- [x] 4.1 Add `centerVisual.svgUrl` support to the PreviewPayload type.
- [x] 4.2 Populate `centerVisual.svgUrl` only after URL shape and hardcoded allowlist checks pass.
- [x] 4.3 Keep existing inputs without center SVG URLs producing valid PreviewPayloads unchanged.

## 5. Renderer

- [x] 5.1 Render successfully loaded `PreviewPayload.centerVisual.svgUrl` content as the center visual.
- [x] 5.2 Fall back to deterministic built-in center visual selection when SVG URL is absent, fails, or is rejected.
- [x] 5.3 Accept single-color controlled SVGs as valid Phase 1 center visuals.

## 6. Export

- [x] 6.1 Ensure PNG export does not draw uncontrolled external image elements.
- [x] 6.2 Ensure browser-exported `.omm` documents remain self-contained and do not depend on external URL-only center visuals.

## 7. Tests

- [x] 7.1 Add tests for allowed controlled SVG URL pass-through.
- [x] 7.2 Add tests for uncontrolled URL fallback.
- [x] 7.3 Add browser tests for SVG request failure fallback.
- [x] 7.4 Add renderer tests for successfully loaded controlled SVG priority over built-in fallback.
- [x] 7.5 Add export coverage showing no uncontrolled external image dependency for controlled SVG center visuals.

## 8. Docs

- [x] 8.1 Document the controlled SVG source rule.
- [x] 8.2 Document the Phase 1 single-color center SVG exception.
- [x] 8.3 Document that arbitrary web images, CLI SVG fetch/sanitization, bitmap generation, Base64 bitmaps, and CLI PNG export remain out of scope.
