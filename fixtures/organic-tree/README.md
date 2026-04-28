# OrganicTree Fixtures

Test fixtures for the `OrganicTree` (agent list) JSON contract used by the CLI validation pipeline.

## Fixture Categories

### `valid-*`
Normal happy-path OrganicTree inputs that pass all validation layers (structural, quality, capacity).

### `stress-*`
Valid inputs that push layout capacity boundaries:
- `stress-extreme-siblings.json` — 5 main branches with dense sub-branches (45 nodes at maxNodes limit)
- `stress-unbalanced-tree.json` — strongly asymmetric branch distribution (1 heavy branch + 4 light branches)

### `poison-*`
Malicious or hostile inputs designed to expose security regressions:
- `poison-xss-protocol.json` — `javascript:` protocol in center visual URL
- `poison-text-injection.json` — script-like markup and template injection in concept text
- `poison-oversized-whitespace.json` — concepts exceeding maxConceptUnitWidth boundary

### `invalid-*`
Schema or contract rule violations:
- `invalid-deep-nesting.json` — exceeds maximum depth of 3 levels
- `invalid-malformed-children.json` — malformed children array
- `invalid-missing-center.json` — missing center object
- `invalid-oversized-capacity.json` — exceeds total node count limit
- `invalid-oversized-concept.json` — concept exceeds unit-width threshold
- `invalid-sentence-like.json` — concept looks like a sentence
- `invalid-wrong-version.json` — unsupported contract version

## Terminology

All fixtures use `OrganicTree` terminology. The legacy `agent-list` naming is not used.
