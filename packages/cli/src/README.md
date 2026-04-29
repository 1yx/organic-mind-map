# @omm/cli

Command parsing, file I/O, capacity checks, local HTTP server startup, and preview orchestration.

## CLI Responsibility: Validator + Service Starter

The CLI has exactly two jobs:

1. **Validate** the incoming OrganicTree JSON (structural, quality, capacity).
2. **Start** the local preview HTTP server, serving the validated OrganicTree directly via `GET /api/document`.

The CLI does **not** transform the tree, build intermediate payloads, select paper sizes, filter SVG URLs, or perform domain/view instantiation. Those concerns belong to the browser (`@omm/web`).

### Validation Errors as Agent Feedback

When the CLI exits with code `1` or `2`, the structured error output is intended for the calling Agent (Gemini CLI / Codex CLI / Claude Code) to reflect on and self-correct. Errors follow a standardized `{ path, message }` structure so the Agent can parse, pinpoint, and repair specific concept nodes.

The CLI must **not** repair malformed semantic trees beyond safe whitespace normalisation (trim, collapse repeated spaces). Structural issues, overly long concepts, missing fields, and capacity violations are reported as errors for the Agent to fix.

### Standardized Error Structure

Validation errors are formatted as machine-parseable lines:

```
Invalid OrganicTree:
- branches[0].concept is empty
- branches[2].children[1].concept looks like a sentence
- branches[1].concept exceeds max length (40 > 30 characters)
```

Each error includes:
- **path**: JSON-pointer-like path to the offending node (e.g. `branches[0].concept`).
- **message**: Human-readable description of the issue.
- **suggestion** (capacity errors): Actionable repair hint (e.g. "reduce total nodes to ≤ 45").

## Usage

```bash
# Start local preview with a valid OrganicTree JSON file
omm preview input.json

# Specify port for the preview server
omm preview --port 5173 input.json

# Read from stdin
cat input.json | omm preview --

# Show help
omm help
```

## Supported Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--port <port>` | Port for the local preview server | — |
| `--host <host>` | Host to bind to | `127.0.0.1` |
| `--` | Read input from stdin instead of a file | — |

## CLI-to-Browser Handoff

The `preview` command validates the input, normalizes whitespace, and passes the validated `OrganicTree` directly to the local preview server. The browser fetches it via `GET /api/document` and handles all domain/view instantiation (node IDs, colors, organic seed, center visual, layout, paper selection, `.omm` export).

The CLI **does not** produce an `OmmDocument`, a `PreviewPayload`, or any intermediate wrapper type. The browser owns the final document model.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success — validated OrganicTree handed off to preview server |
| `1` | Input parse error or validation failure (structural or quality) |
| `2` | Capacity threshold exceeded |
| `3` | Local preview server handoff error |

### Validation Errors (exit 1)

```
Invalid OrganicTree:
- branches[0].concept is empty
- branches[2].children[1].concept looks like a sentence
```

### Capacity Errors (exit 2)

```
Input exceeds MVP capacity:
- total: total nodes 126 exceeds maxNodes 45
- branches[0].children count 9 exceeds maxSiblingsPerNode 8
Please regenerate a shorter concept list.
```

## Agent CLI Retry Behavior

When exit code `2` is returned, the outer Agent CLI (Gemini CLI / Codex CLI / Claude Code) should regenerate a shorter concept list. The error message is designed to be machine-parseable and retry-friendly.

## Architecture Boundaries

### CLI owns (this package)

- Arg parsing and file/stdin I/O
- JSON parsing
- Structural, quality, and capacity validation (using `@omm/core`)
- Whitespace normalisation (trim, collapse repeated spaces — never semantics)
- Passing validated OrganicTree to the local preview server

### Browser owns (`@omm/web`)

- Node ID generation
- Color assignment
- Organic seed derivation
- Paper selection
- Center visual selection, SVG URL filtering, and fallback
- Layout computation
- `OmmDocument` creation
- `.omm` layout snapshot export
- PNG export

### 06-local-preview-server owns

- HTTP listener setup
- `GET /api/document` route
- Port conflict handling
- Preview URL printing
- Serving the web preview bundle

## Public API

```ts
import {
  runCli,
  previewCommand,
  startPreviewServer,
} from "@omm/cli";

import type {
  PreviewOptions,
  PreviewServerOptions,
  PreviewServerResult,
} from "@omm/cli";
```
