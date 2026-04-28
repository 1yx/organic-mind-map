## 1. Export UI

- [x] 1.1 Add Export PNG control to the read-only Web preview.
- [x] 1.2 Disable or guard the control until the preview SVG and required assets are ready.
- [x] 1.3 Show simple local export errors without adding warning-heavy product flows.

## 2. SVG Serialization

- [x] 2.1 Select the currently rendered SVG element from the preview surface.
- [x] 2.2 Clone the SVG DOM for export instead of mutating the live preview.
- [x] 2.3 Inline all visible external SVG/image assets in the clone before serialization.
- [x] 2.4 Replace export-safe controlled SVG links with inline SVG content or `data:image/svg+xml;base64,...` Data URLs.
- [x] 2.5 Use deterministic built-in fallback or a local readiness error when an external asset cannot be inlined.
- [x] 2.6 Serialize the fully inlined SVG clone with required XML namespaces.
- [x] 2.7 Ensure the serialized SVG reflects the latest rendered layout.
- [x] 2.8 Include paper background, center visual, branches, and text in the serialized output.

## 3. Canvas PNG Conversion

- [x] 3.1 Convert the serialized SVG into a Blob URL or data URL.
- [x] 3.2 Draw the SVG image into a browser canvas.
- [x] 3.3 Preserve A3/A4 landscape aspect ratio in the canvas dimensions.
- [x] 3.4 Derive canvas physical dimensions from current preview container size, `window.devicePixelRatio`, and memory safety limits.
- [x] 3.5 Avoid forcing canvas dimensions to equal the full logical SVG viewBox size.
- [x] 3.6 Reduce scale or report a local error when canvas dimensions exceed safe browser limits.
- [x] 3.7 Convert the canvas with `toBlob("image/png")` and trigger a local download.

## 4. Asset Readiness And Safety

- [x] 4.1 Ensure built-in assets and SVG shapes export without network access at export time.
- [x] 4.2 Ensure controlled center SVG export uses browser-safe rendered content or deterministic built-in fallback.
- [x] 4.3 Block or report a local readiness error when required image assets are not export-safe.
- [x] 4.4 Avoid drawing uncontrolled external image elements into the export canvas.
- [x] 4.5 Enforce system font stack usage for renderer, SVG text, and Canvas measurement.
- [x] 4.6 Reject remote or local Web Font dependencies, including `@font-face`, WOFF/WOFF2 assets, and font Base64 inlining.

## 5. Boundary Enforcement

- [x] 5.1 Keep PNG export in the Web preview code path.
- [x] 5.2 Ensure the CLI does not implement one-shot PNG export.
- [x] 5.3 Ensure the CLI does not add Puppeteer, Playwright, cloud rendering, or a bundled browser dependency for PNG export.

## 6. Tests And Fixtures

- [x] 6.1 Add unit tests for SVG serialization helpers.
- [x] 6.2 Add unit tests for export asset inlining and fallback behavior.
- [x] 6.3 Add unit tests for paper-ratio and scaled canvas dimension calculation.
- [x] 6.4 Add tests enforcing system font stack and absence of Web Font dependencies.
- [x] 6.5 Add Web preview smoke test for Export PNG control availability.
- [x] 6.6 Add export flow test using a fixture rendered preview with a controlled SVG center visual.
- [x] 6.7 Add boundary test confirming CLI one-shot PNG export is not available in Phase 1.
