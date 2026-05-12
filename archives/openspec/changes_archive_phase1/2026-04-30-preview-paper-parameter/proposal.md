# preview-paper-parameter

## Why

MVP should validate the bounded-layout workflow without exposing A3/A4 paper presets or physical dimensions. The product still needs a fixed landscape boundary, but preview input should describe neither print paper nor layout geometry.

## What Changes

* Remove paper selection from the MVP Agent/CLI/Web preview flow.
* Keep `OrganicTree` free of `paper`, `PaperSpec`, physical size, layout, and export fields.
* Remove the `--paper` CLI option rather than replacing it with another CLI parameter.
* Use one fixed MVP surface ratio for OrganicTree preview: `sqrt2-landscape`, width/height approximately `1.414`.
* Treat future ratios, such as `16:9`, as bounded surface aspect presets rather than fixed paper sizes.
* Persist the browser-computed surface and layout snapshot in `.omm` exports without requiring A3/A4 physical dimensions.

## Capabilities

### Modified Capabilities

* `cli-preview-handoff`: Reject paper-related CLI/input fields and keep the preview command focused on OrganicTree validation plus local preview startup.
* `local-preview-server`: Serve a read-only preview using the fixed MVP bounded surface ratio rather than selected A3/A4 paper proportions.
* `readonly-svg-renderer`: Render OrganicTree previews against a fixed `sqrt2-landscape` surface and reserve named ratio presets for later phases.
* `png-export`: Preserve the current preview surface ratio instead of A3/A4 paper ratios.
* `omm-document-format`: Store a bounded surface ratio and browser-computed layout snapshot instead of MVP A3/A4 paper specs.

## Impact

* Removes active MVP reliance on `--paper`, `OrganicTree.paper`, `PreviewPayload.paper`, A3/A4 named preview presets, and `widthMm`/`heightMm` preview semantics.
* Requires docs/spec/test updates where MVP text currently says A3/A4 paper instead of fixed bounded landscape surface.
* Does not add visual editing, print setup, PDF export, or real physical paper sizing.
