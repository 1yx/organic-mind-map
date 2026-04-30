# center-svg-url-boundary

## Why

`OrganicTree.center.svgUrl` is an optional visual hint, but current docs and code disagree about whether CLI, renderer, or Web owns URL allowlisting, network fetch, SVG safety checks, fallback, and `.omm` persistence. The MVP needs a precise boundary so CLI remains a Validator + Service Starter while browser preview stays safe.

## What Changes

* Treat `center.svgUrl` as untrusted optional visual hint, not semantic truth or final document asset.
* Keep core OrganicTree validation limited to contract shape: non-string `center.svgUrl` is invalid; string values are preserved.
* Remove CLI-side svgUrl allowlist filtering, center visual wrapping, network fetch, sanitization, caching, and inline conversion.
* Add browser-side URL gate before fetch using HTTPS plus host + path allowlist patterns.
* Keep browser fetch in Web or a browser-only adapter with 10s timeout and 64KB response limit.
* Keep pure `render({ kind: "organic-tree" })` free of network side effects.
* Safety-check loaded SVG content before render/export, and use deterministic built-in fallback on any rejection or failure.
* Do not persist external `svgUrl` as final center visual truth in `.omm` exports.

## Capabilities

### Modified Capabilities

* `organic-tree-contract`: Clarify shape-only handling for `center.svgUrl`.
* `cli-preview-handoff`: Remove CLI allowlist/filter/wrap responsibility and preserve raw OrganicTree handoff.
* `ai-svg-center-visual`: Move controlled SVG URL gate and load responsibility to Web/browser boundary.
* `readonly-svg-renderer`: Ensure render stays deterministic and network-free; loaded safe inline SVG is optional render input.
* `png-export`: Export loaded safe inline SVG or fallback without drawing uncontrolled external images.
* `omm-document-format`: Ensure `.omm` does not rely on external `svgUrl` as final center visual asset.

## Impact

* Existing CLI allowlist tests move to Web/renderer URL-gate tests.
* `centerVisual` wrapper and inline SVG path are removed from CLI preview handoff.
* Browser preview must gate before fetch, then apply SVG content safety checks after fetch.
* `.omm` export stores self-contained approved center visuals or deterministic built-in fallback.
