## 1. Server Module

- [ ] 1.1 Define `startPreviewServer(payloadOrDocument, options)` public API.
- [ ] 1.2 Accept validated `PreviewPayload` input from `cli-preview-handoff`.
- [ ] 1.3 Accept valid `.omm` document input for direct preview.
- [ ] 1.4 Return startup metadata including host, port, preview URL, and PID.
- [ ] 1.5 Keep the server process attached to the terminal until interrupted.

## 2. HTTP Serving

- [ ] 2.1 Bind to localhost by default.
- [ ] 2.2 Support host and port options.
- [ ] 2.3 Implement port conflict handling with actionable startup errors or approved fallback behavior.
- [ ] 2.4 Serve prebuilt `@omm/web/dist` static assets in production.
- [ ] 2.5 Implement `GET /api/document` returning the process-scoped preview data.
- [ ] 2.6 Avoid editing, mutation, and filesystem browsing endpoints in MVP.
- [ ] 2.7 Ensure production `omm preview` does not start Vite, Rollup, Webpack, or another frontend dev server.
- [ ] 2.8 Exclude file watcher, WebSocket, SSE, and live reload behavior.

## 3. Web Preview Page

- [ ] 3.1 Create minimal read-only Web preview page shell.
- [ ] 3.2 Fetch `/api/document` on page load.
- [ ] 3.3 Render local loading, success, and error states.
- [ ] 3.4 Preserve A3/A4 landscape paper aspect ratio in the preview surface.
- [ ] 3.5 Avoid visual editor controls, drag/drop, or node editing UI.

## 4. Renderer Integration

- [ ] 4.1 Pass loaded preview data into `readonly-svg-renderer`.
- [ ] 4.2 Display the returned SVG or render model in the paper-proportional surface.
- [ ] 4.3 Surface renderer hard failure diagnostics as simple local errors.
- [ ] 4.4 Keep renderer layout algorithms outside the server module.

## 5. CLI Handoff Integration

- [ ] 5.1 Update `cli-preview-handoff` to call `startPreviewServer` with validated `PreviewPayload`.
- [ ] 5.2 Ensure the CLI does not duplicate HTTP listener, route mounting, port conflict handling, or URL printing internals.
- [ ] 5.3 Print `[OMM_SERVER_READY] PID:<process.pid> <URL>` from the server listen callback after successful startup.
- [ ] 5.4 Ensure Agent CLI wrappers can parse the ready marker for PID and URL.

## 6. Tests And Fixtures

- [ ] 6.1 Add server startup test with a valid `PreviewPayload`.
- [ ] 6.2 Add `/api/document` response test.
- [ ] 6.3 Add localhost default binding test.
- [ ] 6.4 Add port conflict behavior test.
- [ ] 6.5 Add Web preview smoke test for document fetch and paper ratio.
- [ ] 6.6 Add renderer integration smoke test using a fixture payload.
- [ ] 6.7 Add test that production serving uses static assets and does not invoke a frontend dev server.
- [ ] 6.8 Add test for exact ready marker format including PID and URL.
- [ ] 6.9 Add test or documentation check that no file watcher/live reload channel is implemented.
