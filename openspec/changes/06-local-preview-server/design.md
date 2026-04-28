# 06-local-preview-server Design

## Goal

Provide the local Web server module used by `cli-preview-handoff` to preview validated `PreviewPayload` data or a `.omm` file using browser-side Canvas text measurement, collision-aware layout, and the read-only SVG renderer. In the MVP, this module is usually invoked after Gemini CLI, Codex CLI, Claude Code, or another Agent CLI has called the agent skill and `cli-preview-handoff` has validated capacity.

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

* serve the Web preview bundle
* expose the selected `PreviewPayload` or `.omm` document to the preview page
* optionally watch the file and reload on change
* avoid editing endpoints
* avoid authentication for localhost-only MVP usage
* own HTTP listener setup and shutdown
* own host and port binding
* own port conflict handling
* own console URL output

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
  -> local-preview-server starts HTTP listener
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
* Coupling preview to a single dev-server implementation.
* Duplicating startup and URL-printing logic in `cli-preview-handoff`.

## Decisions

* Preview is read-only.
* Localhost is the default and expected deployment.
* The CLI starts preview; the Web page performs export in change 07.
* `06-local-preview-server` owns server internals; `cli-preview-handoff` is only the caller.
* Browser-side layout and text measurement are the source of truth.
