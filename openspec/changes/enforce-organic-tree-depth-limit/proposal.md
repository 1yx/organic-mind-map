## Why

Phase 1 intentionally caps `OrganicTree` input depth at 3 levels to keep layout and Agent retry loops reliable. This change ensures the limit is enforced consistently in validation, CLI errors, fixtures, and tests.

## What Changes

- Enforce `OrganicMainBranch -> OrganicSubBranch -> OrganicLeafNode` as the maximum Phase 1 input depth.
- Return path-specific, retry-friendly errors for deeper input.
- Keep `OrganicLeafNode.children?` only as a TypeScript shape convenience; validation still rejects actual fourth-level content.
- Do not add unlimited depth rendering in this change.

## Capabilities

### New Capabilities

### Modified Capabilities
- `organic-tree-contract`: Make Phase 1 depth enforcement complete and test-backed.

## Impact

- Affects `@omm/core` validation, CLI JSON findings, invalid fixtures, and OrganicTree tests.
- No renderer layout changes beyond assuming validated depth.
