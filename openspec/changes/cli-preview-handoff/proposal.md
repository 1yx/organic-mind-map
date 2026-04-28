# cli-preview-handoff

## Summary

Implement the CLI command that validates agent-produced OrganicTree JSON, applies defensive capacity checks, and hands a clean `PreviewPayload` to the local browser preview flow.

## Why

The CLI is not the final `.omm` generator. The browser owns ID generation, color assignment, DOM/SVG text measurement, layout, `.omm` assembly, and PNG export. The CLI should stay thin: read input, validate it, reject oversized content early, start the local preview service, and expose a payload the browser can consume.

Naming this change `cli-preview-handoff` avoids implying that the CLI produces a complete `.omm` document. A valid `OmmDocument` requires browser-computed layout coordinates and is only produced by the Web app during export.

## What Changes

* Add a CLI command for validating OrganicTree input.
* Read structured JSON from a file path or stdin.
* Validate the OrganicTree contract.
* Enforce capacity thresholds for maximum nodes, depth, sibling count, main branch count, and concept width.
* Call the local preview server module with the validated `PreviewPayload`.
* Expose a `PreviewPayload` to the browser through the local preview flow.
* Keep ID generation, color assignment, center visual selection, layout, `.omm` assembly, and PNG export in the browser.

## Non-goals

* No interactive editing.
* No AI API calls.
* No final coordinate/layout generation in CLI.
* No `OmmDocument` generation in CLI.
* No ID generation or color assignment in CLI.
* No PNG export.
* No browser text measurement or headless browser dependency.

## Acceptance Criteria

* Running the CLI on a valid OrganicTree fixture validates the input and starts or hands off to local preview.
* The local browser preview receives a `PreviewPayload`, not a partial `OmmDocument`.
* Invalid input exits with a non-zero status and a clear validation message.
* Oversized input exits with a clear message suitable for Agent CLI regeneration.
* The browser can consume the `PreviewPayload`, instantiate its own view/domain model, compute layout, and export the final `.omm`.
* The CLI does not assign node IDs, colors, center visuals, or branch styles.

## Dependencies

* `organic-tree-contract`
* `omm-document-format`
