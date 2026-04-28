## 1. Server Module

- [x] 1.1 Define `startPreviewServer(payloadOrDocument, options)` public API.
- [x] 1.2 Accept validated `PreviewPayload` input from `cli-preview-handoff`.
- [x] 1.3 Accept valid `.omm` document input for direct preview.
- [x] 1.4 Return startup metadata including host, port, preview URL, and PID.
- [x] 1.5 Keep the server process attached to the terminal until interrupted.

## 2. HTTP Serving

- [x] 2.1 Bind to localhost by default.
- [x] 2.2 Support host and port options.
- [x] 2.3 Implement port conflict handling with actionable startup errors or approved fallback behavior.
- [x] 2.4 Serve prebuilt `@omm/web/dist` static assets in production.
- [x] 2.5 Implement `GET /api/document` returning the process-scoped preview data.
- [x] 2.6 Avoid editing, mutation, and filesystem browsing endpoints in MVP.
- [x] 2.7 Ensure production `omm preview` does not start Vite, Rollup, Webpack, or another frontend dev server.
- [x] 2.8 Exclude file watcher, WebSocket, SSE, and live reload behavior.

## 3. Web Preview Page

- [x] 3.1 Create minimal read-only Web preview page shell.
- [x] 3.2 Fetch `/api/document` on page load.
- [x] 3.3 Render local loading, success, and error states.
- [x] 3.4 Preserve A3/A4 landscape paper aspect ratio in the preview surface.
- [x] 3.5 Avoid visual editor controls, drag/drop, or node editing UI.

## 4. Renderer Integration

- [x] 4.1 Pass loaded preview data into `readonly-svg-renderer`.
- [x] 4.2 Display the returned SVG or render model in the paper-proportional surface.
- [x] 4.3 Surface renderer hard failure diagnostics as simple local errors.
- [x] 4.4 Keep renderer layout algorithms outside the server module.

## 5. CLI Handoff Integration

- [x] 5.1 Update `cli-preview-handoff` to call `startPreviewServer` with validated `PreviewPayload`.
- [x] 5.2 Ensure the CLI does not duplicate HTTP listener, route mounting, port conflict handling, or URL printing internals.
- [x] 5.3 Print `[OMM_SERVER_READY] PID:<process.pid> <URL>` from the server listen callback after successful startup.
- [x] 5.4 Ensure Agent CLI wrappers can parse the ready marker for PID and URL.

## 6. Tests And Fixtures

- [x] 6.1 Add server startup test with a valid `PreviewPayload`.
- [x] 6.2 Add `/api/document` response test.
- [x] 6.3 Add localhost default binding test.
- [x] 6.4 Add port conflict behavior test.
- [x] 6.5 Add Web preview smoke test for document fetch and paper ratio.
- [x] 6.6 Add renderer integration smoke test using a fixture payload.
- [x] 6.7 Add test that production serving uses static assets and does not invoke a frontend dev server.
- [x] 6.8 Add test for exact ready marker format including PID and URL.
- [x] 6.9 Add test or documentation check that no file watcher/live reload channel is implemented.
