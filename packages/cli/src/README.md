# @omm/cli

Command parsing, file I/O, capacity checks, local HTTP server startup, and preview orchestration.

## Usage

```bash
# Start local preview with a valid OrganicTree JSON file
omm preview input.json

# Specify paper size (overrides input contract)
omm preview --paper a3-landscape input.json

# Specify port for the preview server (forwarded to 06-local-preview-server)
omm preview --port 5173 input.json

# Read from stdin
cat input.json | omm preview --

# Show help
omm help
```

## Supported Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--paper <size>` | Paper size: `a3-landscape` or `a4-landscape` | `a3-landscape` |
| `--port <port>` | Port for the local preview server | — |
| `--` | Read input from stdin instead of a file | — |

Paper size resolution order: CLI `--paper` flag > input JSON `paper` field > default `a3-landscape`.

## PreviewPayload — CLI-to-Browser Handoff

The `preview` command validates input and builds a `PreviewPayload` that is handed off to the local preview server for browser consumption:

```ts
interface PreviewPayload {
  version: 1;
  source: "organic-tree";
  paper: "a3-landscape" | "a4-landscape";
  tree: OrganicTree;  // from @omm/core
  centerVisual?: {
    inlineSvg?: string;
    source?: "ai-svg";
  };
  meta?: {
    sourceTitle?: string;
    sourceSummary?: string;
  };
}
```

The CLI **does not** produce an `OmmDocument`. The browser owns the final document model.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success — PreviewPayload handed off to preview server |
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
- Building `PreviewPayload`
- Handing off to the local preview server

### Browser owns (`@omm/web`)

- Node ID generation
- Color assignment
- Organic seed derivation
- Center visual selection and fallback
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
  CliExitCode,
} from "@omm/cli";

import type {
  PreviewPayload,
  PreviewOptions,
  PreviewServerOptions,
} from "@omm/cli";
```
