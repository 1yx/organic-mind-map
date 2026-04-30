## ADDED Requirements

### Requirement: Phase 1 depth limit is enforced before preview
The OrganicTree validator SHALL reject input nesting deeper than three semantic levels before the CLI starts the local preview server.

#### Scenario: Three-level tree is valid
- **WHEN** an OrganicTree uses `OrganicMainBranch -> OrganicSubBranch -> OrganicLeafNode`
- **THEN** validation accepts the depth if all other contract and capacity rules pass

#### Scenario: Fourth-level child is present
- **WHEN** an OrganicTree contains a child below an `OrganicLeafNode`
- **THEN** validation fails with an error pointing to the offending `children` path

#### Scenario: CLI JSON mode receives over-depth input
- **WHEN** `omm preview --json` validates an over-depth OrganicTree
- **THEN** it exits non-zero with `agentAction: "regenerate-organic-tree"` and repair guidance to reduce or regroup depth
