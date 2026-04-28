# png-export Design

## Goal

Allow users to export the currently rendered read-only Web preview as a PNG image.

## Export Boundary

PNG export happens in the Web preview, not in the CLI.

The CLI must not introduce Puppeteer, Playwright, or a bundled browser dependency just to render PNG. The browser already has the rendered SVG and assets, so export should use browser-side APIs.

## UI

Add a simple control:

```text
Export PNG
```

When clicked:

1. Read the current rendered SVG.
2. Clone the SVG DOM for export.
3. Inline active external SVG/image assets in the clone as Data URLs or inline SVG content.
4. Serialize the fully inlined clone with required namespaces.
5. Convert it to an image source.
6. Draw it onto a canvas at the target resolution.
7. Download a PNG.

## Target Resolution

MVP should provide one good default.

Recommended default:

* preserve paper aspect ratio
* derive physical canvas size from current preview container size, `window.devicePixelRatio`, and browser memory limits
* keep the scale factor adaptive instead of hardcoding 2x, 3x, or any fixed multiplier
* do not force canvas physical dimensions to equal the large logical SVG viewBox
* keep memory usage safe for common browsers

Advanced DPI controls can be added later.

## Asset Handling

Export must work with self-contained assets:

* embedded image assets
* built-in templates
* SVG shapes
* path text

If external images are ever allowed, they must not taint canvas or disappear during SVG-as-image rendering. Before `XMLSerializer`, export must operate on a cloned SVG DOM and inline every active external asset that affects the visible output.

For `ai-svg-center-visual`, the browser must not rely on an external URL still being reachable from inside the serialized SVG image. If a controlled center SVG is visible in preview, the export preprocessor must fetch the asset, verify it passed the same safety boundary, and replace the clone's external reference with inline SVG content or a `data:image/svg+xml;base64,...` Data URL before serialization. If inlining fails, export must use the deterministic built-in fallback or block with a local readiness error.

## Font Policy

MVP export must use system fonts only, such as:

```text
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Do not introduce remote or local Web Fonts, `@font-face`, Google Fonts, bundled WOFF/WOFF2 assets, or font Base64 inlining. Canvas 2D measurement, SVG `textPath`, and PNG export must share the same system font stack so preview geometry and exported text stay aligned.

## Implementation Approach

Browser-side approach:

```text
SVG element
  -> clone SVG DOM
  -> inline visible external SVG/image assets in the clone
  -> XMLSerializer
  -> Blob URL or data URL
  -> Image
  -> Canvas
  -> canvas.toBlob("image/png")
  -> download
```

The preview page should ensure visible assets are inlined or safely replaced before export. If needed, disable the button until export readiness is true.

## Non-goals

* No CLI one-shot PNG export.
* No Puppeteer or Playwright in CLI.
* No PDF export.
* No batch export.
* No cloud rendering.

## Error Handling

Errors should be local:

* export failed
* image asset not ready or cannot be inlined
* canvas size too large

Do not add warning-heavy product flows; this is a utility action.

## Risks

* Browser canvas export can fail if assets are not self-contained.
* Browser SVG-as-image rendering silently drops external resources inside the serialized SVG if they are not inlined first.
* Large canvas sizes can exceed browser limits.
* Custom fonts may not match if loaded from Web Fonts, so Web Fonts are banned for MVP rendering/export.

## Decisions

* Export belongs to Web preview.
* CLI starts preview and validates agent input; it does not render PNG.
* Export serializes a cloned, asset-inlined SVG DOM.
* MVP uses system fonts only and forbids Web Fonts.
* Canvas dimensions are based on current preview container size and a runtime-calculated safe scale factor from DPR and memory constraints, while preserving paper aspect ratio.
* Keep export simple and local for MVP.
