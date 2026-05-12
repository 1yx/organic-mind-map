# organic-tree-type-rename

## Why

The codebase still exposes core semantic input types with legacy `Agent*` and `agent list` names, while product decisions and fixtures now use `OrganicTree`. This naming split makes the upcoming `ConciseListJSON -> OrganicTree -> PreviewPayload` pipeline harder to reason about and risks reintroducing the old agent-list terminology.

## What Changes

* Rename public TypeScript contract types:
  * `AgentMindMapList` -> `OrganicTree`
  * `AgentCenter` -> `OrganicTreeCenter`
  * `MainBranch` -> `OrganicMainBranch`
  * `SubBranch` -> `OrganicSubBranch`
  * `LeafNode` -> `OrganicLeafNode`
  * `AgentListLimits` -> `OrganicTreeLimits`
* Update internal imports, annotations, tests, and comments to use the new type names.
* Rename public validation entry points that still expose legacy agent-list terminology, especially `validateAgentList` -> `validateOrganicTree`.
* Remove or migrate any remaining physical `fixtures/agent-list/` directory to `fixtures/organic-tree/` if it exists in the working tree.
* Update OpenSpec and developer documentation to describe the semantic tree contract as `OrganicTree`.
* Keep the JSON wire shape unchanged for existing fixtures and CLI preview input.

## Capabilities

### New Capabilities

* None.

### Modified Capabilities

* `organic-tree-contract`: Rename the public semantic input contract and branch type names from legacy agent-list terminology to `OrganicTree` terminology without changing the JSON structure.

## Impact

* Affects `@omm/core` public type exports, validation function exports, and downstream package imports in CLI, renderer, and tests.
* Affects docs and specs that currently mention `AgentMindMapList`, `AgentCenter`, `MainBranch`, `SubBranch`, `LeafNode`, or `AgentListLimits`.
* May require fixture directory migration if legacy `fixtures/agent-list/` still exists.
* Does not change runtime JSON fields, fixture file contents, validation rules, capacity limits, preview payload shape, renderer behavior, or `.omm` format.
