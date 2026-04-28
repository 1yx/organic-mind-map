# png-export

## Summary

Implement PNG export from the local read-only preview.

## Why

The MVP output artifact is a PNG image. Export must reflect the same paper-proportional visual result that the user sees in the local preview.

## What Changes

* Add PNG export from the local preview.
* Preserve A3/A4 paper aspect ratio.
* Export the rendered SVG at a useful resolution for sharing.
* Inline browser-loaded external SVG/image assets into a cloned export SVG before serialization.
* Ensure embedded/self-contained assets render in the exported image.
* Provide a Web preview export control, such as an Export PNG button.
* Use system font stacks only; no Web Font or `@font-face` dependency is allowed in MVP export.

## Non-goals

* No PDF export in MVP.
* No editable export format in MVP.
* No server-side cloud rendering.
* No CLI one-shot PNG export.
* No Puppeteer, Playwright, or bundled browser dependency in the CLI just for export.
* No batch export unless trivial.

## Acceptance Criteria

* A user can export a PNG from the local Web preview.
* The PNG includes paper background, center visual, branches, text, and embedded assets.
* The exported image matches the preview layout.
* The export pipeline inlines active external assets before SVG serialization so Canvas rendering does not drop them.
* Export works without cloud services.
* The CLI remains responsible for validating input and starting preview, not browser-based PNG rendering.

## Dependencies

* `readonly-svg-renderer`
* `local-preview-server`
