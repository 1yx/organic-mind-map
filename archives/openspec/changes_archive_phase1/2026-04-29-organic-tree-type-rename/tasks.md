## 1. Core Public Types

- [x] 1.1 Rename `AgentMindMapList` to `OrganicTree` in `packages/core/src/contract/types.ts`.
- [x] 1.2 Rename `AgentCenter` to `OrganicTreeCenter`.
- [x] 1.3 Rename `MainBranch` to `OrganicMainBranch`.
- [x] 1.4 Rename `SubBranch` to `OrganicSubBranch`.
- [x] 1.5 Rename `LeafNode` to `OrganicLeafNode`.
- [x] 1.6 Rename `AgentListLimits` to `OrganicTreeLimits`.
- [x] 1.7 Add optional `children` to `OrganicLeafNode` while keeping MVP depth validation unchanged.
- [x] 1.8 Update `ValidationResult`, `CapacityResult`, `DEFAULT_LIMITS`, and core public exports to use the renamed types.

## 2. Core Validation Modules

- [x] 2.1 Update structural validation comments, helper names, and error messages that mention legacy type names.
- [x] 2.2 Update quality validation type annotations and comments.
- [x] 2.3 Update capacity validation type annotations and comments.
- [x] 2.4 Rename `validateAgentList` to `validateOrganicTree` in public exports and all in-repo call sites.
- [x] 2.5 Update contract index exports and helper traversal types.
- [x] 2.6 Verify runtime validation behavior and JSON field names are unchanged.
- [x] 2.7 Verify over-depth input still fails even though `OrganicLeafNode` has optional `children`.

## 3. Downstream Package Updates

- [x] 3.1 Update CLI imports, `PreviewPayload` type references, preview command annotations, and README snippets.
- [x] 3.2 Update renderer imports, render/layout/seed/center-visual annotations, and comments.
- [x] 3.3 Update Web package references if any import old core type names.
- [x] 3.4 Update all in-repo tests to import and assert against `OrganicTree` terminology.

## 4. Documentation And Specs

- [x] 4.1 Update `docs/MVP_FIXTURE_PREVIEW.md` to remove `AgentMindMapList` and legacy agent-list phrasing.
- [x] 4.2 Update `AGENTS.md` testing guidance to say OrganicTree contract validation.
- [x] 4.3 Update active OpenSpec specs and change docs to use `OrganicTree` type terminology.
- [x] 4.4 Migrate any remaining physical `fixtures/agent-list/` directory to `fixtures/organic-tree/`.
- [x] 4.5 Run a repository search to confirm old public type names and `fixtures/agent-list/` references are removed outside archived historical decisions and this change's migration notes.

## 5. Verification

- [x] 5.1 Run typecheck.
- [x] 5.2 Run core contract tests.
- [x] 5.3 Run CLI preview tests.
- [x] 5.4 Run renderer tests.
- [x] 5.5 Run `openspec status --change organic-tree-type-rename` and confirm all artifacts are complete.
