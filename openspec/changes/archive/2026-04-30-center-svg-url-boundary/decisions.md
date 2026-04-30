# center-svg-url-boundary Decisions

## 1. Non-string `center.svgUrl`

Decision: Core OrganicTree contract validation reports a structural error when `center.svgUrl` is present but is not a string.

Rationale: Non-string `svgUrl` is malformed input, not a visual loading failure.

## 2. String `center.svgUrl` That Is Empty, Invalid, Non-HTTPS, Too Long, Or Non-Allowlisted

Decision: CLI preview does not fail for string `center.svgUrl` values that are empty, invalid URL strings, non-HTTPS, too long, or non-allowlisted. The Web preview URL gate rejects them before fetch and uses deterministic fallback.

Rationale: `center.svgUrl` is an optional visual hint. Bad hints should not block semantic preview.

## 3. Allowlist Granularity

Decision: The controlled SVG source allowlist uses host + path pattern matching, not host-only matching.

Rationale: Host-only allowlists are too broad for shared CDNs such as `cdn.jsdelivr.net`. Path constraints keep the Phase 1 controlled-source boundary narrow.

## 4. Allowlist Placement

Decision: The allowlist predicate may live in an environment-neutral renderer utility, but it is called by Web before fetch. CLI does not import or call the allowlist.

Rationale: CLI remains a Validator + Service Starter. Web owns the preview-time network loading gate.

## 5. Fetch Loader Placement

Decision: Browser fetch side effects live in Web or a browser-only adapter, not in the pure renderer core.

Rationale: Pure rendering should remain deterministic and testable without implicit network work.

## 6. `render()` Does Not Network

Decision: `render({ kind: "organic-tree" })` must not fetch external SVG URLs. Synchronous render uses built-in fallback unless Web has already resolved safe inline SVG content and passes it through a render option or context.

Rationale: Rendering should not hide network side effects. Web controls async loading and fallback timing.

## 7. `.omm` Export Does Not Persist External `svgUrl` As Final Visual Truth

Decision: Browser-exported `.omm` documents do not save external `svgUrl` as the final center visual asset. If a controlled SVG loaded and passed safety checks, export may store a self-contained approved SVG asset. Otherwise export stores or references the deterministic built-in fallback. The original URL may be omitted in MVP or kept only as non-authoritative source metadata later.

Rationale: `.omm` files must reopen with images intact and cannot depend on external URLs for the final center visual.

## 8. User-visible Fallback Feedback

Decision: MVP does not show a prominent user-facing warning when `center.svgUrl` falls back. The renderer/Web may emit diagnostics for tests and development.

Rationale: Center SVG loading is an enhancement path. Fallback should keep preview simple and non-blocking.

## 9. Fetch Timeout And Size Limit

Decision: Controlled SVG loading uses a 10 second timeout and a 64KB maximum response size in MVP.

Rationale: These limits keep browser preview responsive and prevent oversized controlled SVG responses from becoming a layout/export risk.

## 10. Single-color SVG Phase 1 Exception

Decision: Phase 1 continues to accept safe, allowlisted single-color SVGs as compliant center visuals.

Rationale: Many controlled vector libraries provide monochrome SVGs. The strict multi-color center standard remains a later quality target, not an MVP blocker.

## 11. SVG Safety Check Algorithm

Decision: Browser-side SVG content safety checks use `DOMParser` to parse SVG XML and traverse an explicit allowlist of elements and attributes. Regex checks may be kept only as a coarse preflight or test helper, not as the primary safety algorithm.

Rationale: Regex-based SVG security checks are brittle and easy to bypass. Parsed DOM traversal makes the accepted SVG subset explicit and easier to test.
