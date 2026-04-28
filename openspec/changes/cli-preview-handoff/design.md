# cli-preview-handoff Design

## Goal

Implement a thin CLI handoff command for the MVP pipeline. The command validates OrganicTree input produced through an Agent CLI + skill workflow, applies defensive capacity checks, creates a `PreviewPayload`, and calls the local preview server module with that payload.

The browser, not the CLI, performs domain-model instantiation, node ID generation, color assignment, deterministic organic seed derivation, center visual fallback selection, DOM-based text measurement, layout, final `.omm` assembly, `.omm` download/export, and PNG export.

## Command Shape

Recommended MVP command:

```bash
omm preview input.json
```

Optional flags:

```bash
--paper a3-landscape
--port 5173
```

`--paper` defaults to `a3-landscape` unless the input contract specifies otherwise.

No `--seed` is required in the CLI handoff layer. Seed generation and deterministic domain instantiation belong to the browser app, where the final `OmmDocument` is created.

## Pipeline

```text
read input
  -> parse JSON
  -> validate OrganicTree contract
  -> apply capacity threshold checks
  -> create PreviewPayload
  -> call startPreviewServer(payload)
  -> local-preview-server owns HTTP listener, /api/document, port handling, and URL output
  -> browser derives organicSeed from OrganicTree content hash
  -> browser instantiates IDs, colors, center visual fallback, and domain model
  -> browser measures text and solves layout
  -> browser exports final OmmDocument and PNG
```

The CLI must not attempt to compute final coordinates because it lacks reliable DOM font measurement. It must also not create a partial `OmmDocument`, because valid `.omm` files require browser-computed layout snapshots.

## PreviewPayload

`PreviewPayload` is the internal handoff type returned by the CLI-backed local API. It is not a draft `.omm` and must not be validated as `OmmDocument`.

```ts
interface PreviewPayload {
  version: 1
  source: "organic-tree"
  paper: "a3-landscape" | "a4-landscape"
  tree: OrganicTree
  centerVisual?: {
    inlineSvg?: string
    source?: "ai-svg"
  }
  meta?: {
    sourceTitle?: string
    sourceSummary?: string
  }
}
```

The payload contains validated semantic input, minimal preview options, and optional sanitized inline center SVG when a later `ai-svg-center-visual` step succeeds. The browser receives it, builds its own in-memory model, derives a deterministic seed from the OrganicTree content, assigns stable node IDs, assigns colors, chooses a center visual fallback when needed, computes layout, and exports the final `OmmDocument`.

## Responsibility Boundary

CLI owns:

* file path and stdin I/O
* JSON parsing
* OrganicTree structural and quality validation
* defensive capacity checks
* building `PreviewPayload`
* calling the `06-local-preview-server` module with `PreviewPayload`
* exit codes and retry-friendly error messages

Browser owns:

* node ID generation
* organic seed derivation from OrganicTree content
* color assignment
* center visual fallback selection
* branch style assignment
* domain model instantiation
* DOM/SVG text measurement
* layout solving
* `OmmDocument` creation and export
* PNG export

`06-local-preview-server` owns:

* HTTP server creation and lifecycle
* Vite/static Web bundle mounting
* host and port binding
* port conflict handling
* `/api/document` route mounting
* console URL output
* serving the `PreviewPayload` provided by this change

## Capacity Checks

Before launching preview, the CLI must reject inputs that exceed MVP capacity. Recommended checks:

* max total nodes
* max depth
* max siblings per node
* max main branches
* max concept unit width

These checks are defensive, not a replacement for browser layout. Their purpose is to prevent clearly impossible agent output from overwhelming the renderer.

## Semantic Limits

The CLI validates; it does not perform semantic rewriting.

It may:

* trim whitespace
* normalize repeated spaces

It must not:

* remove negation
* change dates or numbers
* rewrite names
* uppercase or restyle concepts as a domain decision
* silently merge/split concepts

## Determinism

The CLI does not accept or forward `--seed`. Browser determinism must come from content, not random runtime state. The Web app should serialize the validated `OrganicTree` in a stable way and derive `organicSeed` with a lightweight synchronous non-cryptographic hash such as `cyrb53`.

Do not use `Math.random()` for organic seed generation. Do not use async browser crypto APIs such as `window.crypto.subtle` in the first render path.

The same OrganicTree content must produce the same seed across refreshes and test runs; any content change should produce a different visual signature through the hash.

## Error Handling

Exit codes:

* `0`: success
* `1`: input parse or validation error
* `2`: capacity threshold exceeded
* `3`: local preview server handoff error

Errors should be local and actionable:

```text
Invalid OrganicTree:
- branches[0].concept is empty
- branches[2].children[1].concept looks like a sentence
```

Oversized content should return regeneration-oriented feedback:

```text
Input exceeds MVP capacity:
- total nodes 126 exceeds maxNodes 45
Please regenerate a shorter concept list.
```

The message should be stable enough for Gemini CLI, Codex CLI, Claude Code, or another calling Agent CLI to catch and use as retry feedback.

## Output

The CLI output is a `PreviewPayload` handed to the local preview server module. The final `.omm` with browser-computed layout is downloaded/exported from the Web preview.

## Risks

* Letting the CLI become an `.omm` generator again.
* Reintroducing partial `OmmDocument` payloads without layout snapshots.
* Splitting ID/color/domain logic across CLI and browser.
* Accidentally moving text measurement and layout back into CLI.
* Reintroducing local server internals into this change instead of keeping them in `06-local-preview-server`.

## Decisions

* This change is named `cli-preview-handoff`, not `cli-generate-omm`.
* The CLI is deterministic only as a validation and handoff layer.
* Agent skill handles long-text compression under an outer Agent CLI workflow.
* CLI performs I/O, validation, capacity checks, `PreviewPayload` creation, and calls the local preview server module.
* `06-local-preview-server` owns HTTP server details and URL output.
* Browser performs content-hash organic seed derivation, ID generation, color assignment, center visual fallback selection, real text measurement, layout, final `.omm` save/export, and PNG export.
