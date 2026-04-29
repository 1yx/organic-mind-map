## 1. OrganicTree And CLI Boundary

- [ ] 1.1 Confirm core OrganicTree validation rejects non-string `center.svgUrl` with a path-specific error.
- [ ] 1.2 Confirm core OrganicTree validation preserves string `center.svgUrl` values without URL parsing, HTTPS checks, allowlist checks, or rewriting.
- [ ] 1.3 Remove CLI imports and usage of svgUrl allowlist helpers.
- [ ] 1.4 Remove CLI `centerVisual` wrapping and pass validated OrganicTree directly through preview handoff.
- [ ] 1.5 Update CLI tests so malformed string URLs do not fail preview validation and non-string `center.svgUrl` still fails contract validation.

## 2. URL Gate

- [ ] 2.1 Add a browser-preview URL gate for `center.svgUrl` before fetch.
- [ ] 2.2 Implement host + path pattern allowlist matching for controlled SVG sources.
- [ ] 2.3 Enforce HTTPS and maximum URL length in the URL gate.
- [ ] 2.4 Add tests for allowed hosts and paths, disallowed paths on allowed hosts, non-HTTPS URLs, malformed strings, empty strings, oversized strings, and non-allowlisted hosts.

## 3. Browser SVG Loading

- [ ] 3.1 Keep browser fetch side effects in Web or a browser-only adapter rather than pure renderer entry points.
- [ ] 3.2 Enforce 10 second timeout and 64KB response limit for controlled SVG loading.
- [ ] 3.3 Replace regex-primary SVG safety checks with a `DOMParser`-based parser that traverses an explicit SVG element and attribute allowlist.
- [ ] 3.4 Reject scripts, `foreignObject`, event attributes, external references, CSS `url(...)`, raster/data image references, non-SVG content, oversized responses, and any non-allowlisted parsed node or attribute.
- [ ] 3.5 Add Web/renderer tests proving rejected URLs do not initiate fetch and rejected SVG content falls back.
- [ ] 3.6 Add SVG safety tests for non-allowlisted parsed elements, non-allowlisted attributes, namespaced attributes, and malformed XML.

## 4. Renderer Boundary

- [ ] 4.1 Ensure `render({ kind: "organic-tree", tree })` never fetches `tree.center.svgUrl`.
- [ ] 4.2 Provide a render option or context path for Web to pass already loaded safe inline SVG content.
- [ ] 4.3 Ensure fallback center visual selection remains deterministic from OrganicTree content hash.
- [ ] 4.4 Preserve Phase 1 acceptance of safe allowlisted single-color SVG center visuals.

## 5. Export Boundary

- [ ] 5.1 Update PNG export so it uses already loaded safe inline SVG content or deterministic fallback without uncontrolled external image drawing.
- [ ] 5.2 Update `.omm` export/schema so external `svgUrl` is not persisted as final center visual truth.
- [ ] 5.3 Store approved self-contained SVG asset or deterministic built-in fallback for exported `.omm` center visuals.
- [ ] 5.4 Add export tests proving `.omm` and PNG output do not depend on external center SVG URLs.

## 6. Diagnostics And UX

- [ ] 6.1 Keep center SVG fallback non-blocking and avoid prominent MVP user-facing warning UI.
- [ ] 6.2 Preserve diagnostics for tests/development when URL gate, fetch, safety, timeout, or size checks trigger fallback.

## 7. Documentation Alignment

- [ ] 7.1 Update `docs/PRD.md` and `docs/TECH_DESIGN.md` to describe `center.svgUrl` as an untrusted optional visual hint.
- [ ] 7.2 Update active OpenSpec docs to remove CLI-side allowlist wording.
- [ ] 7.3 Update comments in SVG loader and center visual modules so they no longer claim URLs were already allowlisted by CLI.
- [ ] 7.4 Keep `decisions.md` aligned with final implementation choices.

## 8. Verification

- [ ] 8.1 Run typecheck.
- [ ] 8.2 Run core OrganicTree validation tests.
- [ ] 8.3 Run CLI preview tests.
- [ ] 8.4 Run renderer and Web center visual tests.
- [ ] 8.5 Run PNG export and `.omm` document validation tests.
- [ ] 8.6 Run `openspec status --change center-svg-url-boundary --json` and confirm artifacts are complete.
