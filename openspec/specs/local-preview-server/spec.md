## ADDED Requirements

### Requirement: Local preview server startup
The system SHALL provide a local preview server module callable by `cli-preview-handoff` with a validated `OrganicTree` or `.omm` document.

#### Scenario: Server starts with OrganicTree
- **WHEN** `cli-preview-handoff` calls the local preview server with a valid `OrganicTree`
- **THEN** the server starts a localhost HTTP listener, keeps the process attached, and prints a ready marker containing PID and preview URL

#### Scenario: Server starts with OMM document
- **WHEN** the local preview server is called with a valid `.omm` document
- **THEN** the server exposes that document to the Web preview without requiring a cloud service

### Requirement: Document API endpoint
The server SHALL expose the selected preview data through a local HTTP endpoint.

#### Scenario: Browser requests document data
- **WHEN** the Web preview requests `GET /api/document`
- **THEN** the server returns the process-scoped `OrganicTree` or `.omm` JSON

#### Scenario: No editing endpoints
- **WHEN** the local preview server is running in MVP mode
- **THEN** it exposes no node editing, document mutation, or filesystem browsing endpoints

### Requirement: Web preview page
The server SHALL serve a minimal read-only Web preview page from prebuilt static assets in production.

#### Scenario: Preview page opens
- **WHEN** the user opens the localhost preview URL
- **THEN** the page fetches `/api/document` and displays a read-only preview surface

#### Scenario: Production assets are served
- **WHEN** `omm preview` runs in production mode
- **THEN** the server serves precompiled `@omm/web` `dist/` assets without starting Vite, Rollup, Webpack, or another frontend dev server

#### Scenario: Document fetch fails
- **WHEN** `/api/document` fails or returns invalid local data
- **THEN** the page displays a simple local error state

### Requirement: Paper-proportional viewport
The Web preview SHALL preserve the selected A3 or A4 landscape paper ratio.

#### Scenario: A3 landscape preview
- **WHEN** the loaded document uses A3 landscape paper
- **THEN** the preview surface preserves the A3 landscape aspect ratio

#### Scenario: A4 landscape preview
- **WHEN** the loaded document uses A4 landscape paper
- **THEN** the preview surface preserves the A4 landscape aspect ratio

#### Scenario: OrganicTree preview uses default proportions
- **WHEN** the server serves an `OrganicTree` without a paper specification
- **THEN** the Web preview uses default A3 landscape proportions

### Requirement: Renderer integration boundary
The Web preview SHALL call the read-only SVG renderer for layout and rendering while keeping renderer algorithms out of the server module.

#### Scenario: Valid document is loaded
- **WHEN** `/api/document` returns valid preview data
- **THEN** the Web preview passes it to `readonly-svg-renderer` and displays the returned SVG or render model

#### Scenario: Renderer reports failure
- **WHEN** the read-only renderer reports a hard layout or render failure
- **THEN** the Web preview displays a simple local error or diagnostic state without exposing editing controls

### Requirement: Host and port handling
The local preview server SHALL own host binding, port binding, port conflict handling, and URL output.

#### Scenario: Default host and port
- **WHEN** no host or port options are provided
- **THEN** the server binds to localhost using the default preview port

#### Scenario: Requested port is unavailable
- **WHEN** the requested port is unavailable
- **THEN** the server reports an actionable local startup error or chooses an allowed fallback according to implementation policy

### Requirement: Process lifecycle marker
The local preview server SHALL block the terminal process and print a strict machine-parseable ready marker after the HTTP listener is active.

#### Scenario: Listener starts successfully
- **WHEN** the HTTP listener `listen` callback succeeds
- **THEN** stdout includes `[OMM_SERVER_READY] PID:<process.pid> <URL>`

#### Scenario: Calling agent captures readiness
- **WHEN** an Agent CLI wrapper starts `omm preview`
- **THEN** it can parse the ready marker to obtain the server PID and preview URL

#### Scenario: Server lifetime ends
- **WHEN** the user presses `Ctrl+C` or a calling agent sends `SIGTERM` or `SIGKILL` to the printed PID
- **THEN** the preview server process exits without requiring a detached background daemon

### Requirement: No file watching or live reload
The local preview server SHALL NOT implement file watching, live reload, WebSocket, or SSE refresh channels in MVP.

#### Scenario: Local file changes after startup
- **WHEN** a local source file changes outside the preview process
- **THEN** the server does not push live reload events

#### Scenario: User wants to see changed file content
- **WHEN** the user wants to preview changed local content
- **THEN** they manually refresh the browser or restart the preview command according to the implementation's data loading behavior

### Requirement: Local-only MVP security
The local preview server SHALL default to localhost-only usage and SHALL NOT require authentication in MVP.

#### Scenario: Localhost default
- **WHEN** the preview server starts with default options
- **THEN** it binds to `127.0.0.1` or an equivalent localhost interface

#### Scenario: Authentication omitted
- **WHEN** the user opens the local preview URL
- **THEN** no account, cloud login, or authentication flow is required
