# local-preview-server

## Summary

Add the local Web server module for browser-side layout and read-only preview of validated `PreviewPayload` data or `.omm` documents.

## Why

The MVP user workflow starts from an Agent CLI + skill that produces OrganicTree JSON. `cli-preview-handoff` validates capacity and passes a `PreviewPayload` to this local server module. The browser computes layout with Canvas text measurement, shows the Organic Mind Map style, and exports the final artifacts. A local static server keeps the first product loop simple and avoids cloud accounts, hosted services, and production-time frontend build tooling.

## What Changes

* Add a local preview server module callable by `cli-preview-handoff`.
* Load a validated preview payload or `.omm` file into the read-only Web preview.
* Own HTTP listener setup, `/api/document`, host/port binding, port conflict handling, process lifetime, and console URL output.
* In production, serve only the prebuilt `@omm/web` static `dist/` assets; do not start Vite, Rollup, Webpack, or any frontend dev server.
* Let the Web app perform browser-side measurement and layout.
* Render the document using the SVG renderer.
* Show a paper-proportional viewport that preserves A3/A4 shape.
* Keep the server single-shot and in-memory; do not watch files or implement live reload.
* Print a strict ready marker containing PID and URL after the HTTP listener is active.

## Non-goals

* No cloud hosting.
* No editing UI.
* No mobile-specific Web layout.
* No authentication.
* No production frontend dev server.
* No file watching, live reload, WebSocket, or SSE channel for refresh.
* No detached background daemon or orphan server process.

## Acceptance Criteria

* A user or calling Agent CLI can run a CLI command with valid agent data or a `.omm` path and receive a localhost URL.
* The server process remains attached to the terminal until interrupted.
* After successful startup, stdout includes `[OMM_SERVER_READY] PID:<process.pid> <URL>`.
* Opening the URL displays the rendered mind map.
* The preview preserves the paper ratio.
* The browser can compute layout and later export/download `.omm` based on computed geometry.
* Browser refresh manually reloads the current in-memory document through `/api/document`.

## Dependencies

* `readonly-svg-renderer`
