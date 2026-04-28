# local-preview-server Design

## Goal

Provide the local Web server module used by `cli-preview-handoff` to preview validated `PreviewPayload` data or a `.omm` file using browser-side Canvas text measurement, collision-aware layout, and the read-only SVG renderer. In the MVP, this module is usually invoked after Gemini CLI, Codex CLI, Claude Code, or another Agent CLI has called the agent skill and `cli-preview-handoff` has validated capacity.

The production preview server is a lightweight static server. It must serve prebuilt `@omm/web` `dist/` assets and a process-scoped `/api/document` endpoint. It must not start Vite, Rollup, Webpack, or any other frontend dev server in the production CLI path.

## Command Shape

Recommended command:

```bash
omm preview path/to/input.json
```

Optional flags:

```bash
--port 5173
--host 127.0.0.1
--open false
```

Do not require a cloud service or account.

## Server Responsibilities

The local server should:

* serve the prebuilt Web preview `dist/` bundle in production
* expose the selected `PreviewPayload` or `.omm` document to the preview page
* avoid editing endpoints
* avoid authentication for localhost-only MVP usage
* own HTTP listener setup and shutdown
* own host and port binding
* own port conflict handling
* own console URL output and the ready marker

The server must not watch local files, maintain live reload channels, or open WebSocket/SSE connections for refresh. If a local file changes outside the process, MVP users can restart the preview command or manually refresh the browser when the server implementation rereads the file; the single-shot Agent payload path remains in memory.

## Web Preview Responsibilities

The Web app should:

* load the `.omm`
* or load the validated preview payload from the CLI
* validate local data shape or display a local error
* measure layout-time text width using browser Canvas 2D
* solve layout in the browser
* render the SVG preview
* preserve A3/A4 paper aspect ratio
* provide final `.omm` download/export once browser layout has been computed
* provide a PNG export control once change 07 lands

No editing controls should appear in MVP.

## Data Flow

```text
omm preview input.json
  -> CLI validates path
  -> CLI validates contract and capacity
  -> oversized content returns retry feedback to the calling Agent CLI
  -> cli-preview-handoff calls startPreviewServer(payload)
  -> local-preview-server starts HTTP listener and blocks the process
  -> stdout prints [OMM_SERVER_READY] PID:<process.pid> <URL>
  -> browser loads preview app
  -> preview fetches payload/document JSON
  -> browser measures text with Canvas 2D and computes collision-aware layout
  -> renderer returns SVG
  -> page displays paper-proportional preview
```

## File Serving

The simplest approach is an endpoint like:

```text
GET /api/document
```

It returns the selected preview payload or `.omm` JSON. The server is process-scoped to that file.

`cli-preview-handoff` should call this module with an already validated `PreviewPayload`; it should not duplicate HTTP listener, route mounting, port conflict, or URL printing logic.

## Static Asset Serving

Production mode must only serve precompiled Web assets from `@omm/web/dist` or an equivalent packaged static directory. The production CLI must not bundle or start Vite dev server middleware.

Development mode can use normal frontend tooling while developing the Web app, but that path must stay outside the production `omm preview` runtime contract.

## Process Lifecycle

`omm preview` should behave like a local Web server command: once the HTTP listener is active, the Node process remains attached to the terminal until the user or calling agent terminates it with `Ctrl+C`, `SIGTERM`, or `SIGKILL`. Do not detach or fork an orphan background daemon in MVP.

The server must print a strict machine-parseable ready marker from the `listen` success callback:

```text
[OMM_SERVER_READY] PID:<process.pid> <URL>
```

Example:

```text
[OMM_SERVER_READY] PID:12345 http://127.0.0.1:5173
```

This marker lets Agent CLI wrappers detect startup completion, capture the preview URL, and terminate the process cleanly later using the PID.

## Security

MVP defaults should bind to localhost:

```text
127.0.0.1
```

The server should not expose arbitrary filesystem browsing. If file selection is added later, it needs explicit scope controls.

## Error States

Preview should handle:

* file not found
* invalid agent payload or `.omm`
* capacity threshold failure before preview startup
* missing embedded asset
* renderer failure

Errors can be simple local developer-facing messages.

## Risks

* Accidentally building an editor UI.
* Exposing too much filesystem access through the local server.
* Accidentally shipping Vite or another frontend dev server in the production CLI path.
* Adding watch/live-reload complexity before it is needed.
* Duplicating startup and URL-printing logic in `cli-preview-handoff`.
* Detaching the server and leaving orphan processes behind.

## Decisions

* Preview is read-only.
* Localhost is the default and expected deployment.
* Production `omm preview` serves prebuilt static assets only.
* No file watcher or live reload is included.
* The process blocks the terminal and prints `[OMM_SERVER_READY] PID:<process.pid> <URL>` after the listener starts.
* The CLI starts preview; the Web page performs export in change 07.
* `local-preview-server` owns server internals; `cli-preview-handoff` is only the caller.
* Browser-side layout and text measurement are the source of truth.
