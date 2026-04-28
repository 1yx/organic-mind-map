# 07-png-export Design

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
2. Serialize it with required namespaces.
3. Convert it to an image source.
4. Draw it onto a canvas at the target resolution.
5. Download a PNG.

## Target Resolution

MVP should provide one good default.

Recommended default:

* preserve paper aspect ratio
* export at 2x or 3x preview scale if practical
* keep memory usage safe for common browsers

Advanced DPI controls can be added later.

## Asset Handling

Export must work with self-contained assets:

* embedded image assets
* built-in templates
* SVG shapes
* path text

If external images are ever allowed, they must not taint canvas. MVP should avoid external image dependencies for export.

For `ai-svg-center-visual`, the browser must not draw an uncontrolled external image element directly into the export canvas. It should export a browser-safe rendered SVG result after the controlled SVG has loaded and passed lightweight checks, or export the deterministic built-in fallback when the SVG is not ready or is rejected.

## Implementation Approach

Browser-side approach:

```text
SVG element
  -> XMLSerializer
  -> Blob URL or data URL
  -> Image
  -> Canvas
  -> canvas.toBlob("image/png")
  -> download
```

The preview page should ensure fonts and images are loaded before export. If needed, disable the button until render readiness is true.

## Non-goals

* No CLI one-shot PNG export.
* No Puppeteer or Playwright in CLI.
* No PDF export.
* No batch export.
* No cloud rendering.

## Error Handling

Errors should be local:

* export failed
* image asset not ready
* canvas size too large

Do not add warning-heavy product flows; this is a utility action.

## Risks

* Browser canvas export can fail if assets are not self-contained.
* Large canvas sizes can exceed browser limits.
* Custom fonts may not match if not loaded.

## Decisions

* Export belongs to Web preview.
* CLI starts preview and validates agent input; it does not render PNG.
* Keep export simple and local for MVP.
