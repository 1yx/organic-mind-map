# organic-tree-type-rename Design

## Context

The project has already standardized product and fixture terminology around `OrganicTree`, but the core TypeScript contract still exposes legacy names such as `AgentMindMapList` and `AgentListLimits`. These names came from the earlier assumption that the agent skill would directly emit the full preview input contract.

The newer direction separates the pipeline more clearly:

```text
ConciseListJSON -> CLI deterministic transform -> OrganicTree -> PreviewPayload -> Web preview
```

That makes `AgentMindMapList` misleading. The type represents the semantic OrganicTree consumed by validation, renderer seed/layout code, and preview handoff, not the raw LLM/agent output.

The exact `ConciseListJSON` shape and CLI flag behavior are intentionally defined in the separate `concise-list-json-input` change. This rename change only clears the existing OrganicTree naming debt.

## Goals / Non-Goals

**Goals:**

* Rename public TypeScript types to use `OrganicTree` terminology.
* Rename public validation entry points that still use legacy agent-list terminology.
* Remove any remaining physical `fixtures/agent-list/` directory by migrating it to `fixtures/organic-tree/`.
* Update all package imports, annotations, comments, and tests to the new type names.
* Update OpenSpec and developer docs so the public semantic contract is named `OrganicTree`.
* Keep the runtime JSON shape and all validation behavior unchanged.

**Non-Goals:**

* No `ConciseListJSON` parser, schema, examples, or CLI flag in this change.
* No fixture JSON content migration.
* No preview payload shape change.
* No renderer layout, seed, color, or export behavior change.
* No backwards compatibility aliases unless implementation finds a temporary internal alias is required for migration; the final public API should expose the new names.

## Decisions

### Rename types, not JSON fields

The wire format remains:

```json
{
  "version": 1,
  "title": "...",
  "paper": "a3-landscape",
  "center": { "concept": "..." },
  "branches": []
}
```

Only TypeScript type names and documentation terminology change. This keeps existing fixtures, CLI preview input, and `/api/document` payloads compatible.

### `OrganicTree` becomes the public semantic contract

Use this mapping everywhere:

| Old name | New name |
| --- | --- |
| `AgentMindMapList` | `OrganicTree` |
| `AgentCenter` | `OrganicTreeCenter` |
| `MainBranch` | `OrganicMainBranch` |
| `SubBranch` | `OrganicSubBranch` |
| `LeafNode` | `OrganicLeafNode` |
| `AgentListLimits` | `OrganicTreeLimits` |

The term `agent list` should not appear in new core, CLI, renderer, fixture, or OpenSpec docs except when describing legacy names being removed.

### Keep OrganicLeafNode structurally forward-compatible

`OrganicLeafNode` should include an optional `children` field for structural consistency with other branch nodes and future depth expansion. MVP validation still enforces the current 3-level depth limit, so this is a type-level forward compatibility choice, not a behavior change that allows deeper rendered maps.

### Rename validation entry points too

The rename must include public function names that expose the legacy concept, especially:

* `validateAgentList` -> `validateOrganicTree`

Lower-level function names that are already neutral, such as `validateStructural`, `validateQuality`, `validateCapacity`, `formatCapacityFeedback`, and `DEFAULT_LIMITS`, can remain stable.

This avoids a split where docs and types say `OrganicTree` while the main validation API still says `AgentList`.

### Migrate physical fixture directories when present

If a real `fixtures/agent-list/` directory exists in the implementation branch, it must be physically renamed or merged into `fixtures/organic-tree/`. Existing `fixtures/organic-tree/` content should remain the canonical location.

### Do not combine with ConciseListJSON work

`ConciseListJSON` is a separate input format and deserves its own change. This rename removes ambiguity so that change can clearly transform `ConciseListJSON` into `OrganicTree`.

## Risks / Trade-offs

* **Risk: Public type rename breaks downstream imports.** -> Mitigate by updating all in-repo imports and documenting this as a public type rename. External compatibility can be handled before package publication if needed.
* **Risk: Mechanical rename misses comments/specs.** -> Mitigate with `rg` checks for legacy names after implementation.
* **Risk: Function names still mention agent list.** -> Mitigate by including `validateAgentList -> validateOrganicTree` in this change.
* **Risk: Optional children on OrganicLeafNode is mistaken for allowing deeper MVP maps.** -> Mitigate by keeping depth validation unchanged and testing over-depth inputs.
* **Risk: Accidental runtime contract changes.** -> Mitigate with existing fixture, CLI, renderer, and typecheck tests.
