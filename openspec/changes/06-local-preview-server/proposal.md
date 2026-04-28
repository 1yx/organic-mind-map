# 06-local-preview-server

## Summary

Add the local Web server module for browser-side layout and read-only preview of validated `PreviewPayload` data or `.omm` documents.

## Why

The MVP user workflow starts from an Agent CLI + skill that produces OrganicTree JSON. `cli-preview-handoff` validates capacity and passes a `PreviewPayload` to this local server module. The browser computes layout with real text measurement, shows the Organic Mind Map style, and exports the final artifacts. A local server keeps the first product loop simple and avoids cloud accounts or hosted services.

## What Changes

* Add a local preview server module callable by `cli-preview-handoff`.
* Load a validated preview payload or `.omm` file into the read-only Web preview.
* Own HTTP listener setup, `/api/document`, host/port binding, port conflict handling, and console URL output.
* Let the Web app perform browser-side measurement and layout.
* Render the document using the SVG renderer.
* Show a paper-proportional viewport that preserves A3/A4 shape.
* Provide basic local navigation for selecting or reloading a file if practical.

## Non-goals

* No cloud hosting.
* No editing UI.
* No mobile-specific Web layout.
* No authentication.

## Acceptance Criteria

* A user or calling Agent CLI can run a CLI command with valid agent data or a `.omm` path and receive a localhost URL.
* Opening the URL displays the rendered mind map.
* The preview preserves the paper ratio.
* The browser can compute layout and later export/download `.omm` based on computed geometry.
* Reloading the page keeps the document visible.

## Dependencies

* `05-readonly-svg-renderer`
