# agent-list-contract Tasks

## 1. Contract Types

- [ ] 1.1 Create the `AgentMindMapList`, `AgentCenter`, `MainBranch`, `SubBranch`, `LeafNode`, and limits TypeScript types in the core package. Use explicit 3-level nesting (no recursive `children?: AgentBranch[]`).
- [ ] 1.2 Export the agent list contract types from the core public entrypoint.
- [ ] 1.3 Add default MVP capacity limit constants: `maxDepth` fixed at 3, `maxConceptUnitWidth` fixed at 25, configurable `maxNodes`, `maxSiblingsPerNode`, `maxMainBranches`.

## 2. Validation Implementation

- [ ] 2.1 Implement structural validation for version, title, center concept, branch arrays, and required branch concepts.
- [ ] 2.2 Implement level-aware branch traversal (MainBranch -> SubBranch -> LeafNode) that preserves sibling order and reports stable path strings.
- [ ] 2.3 Implement concept-unit quality validation: reject sentence-like/explanatory concepts as Error (not Warning).
- [ ] 2.4 Implement unified unit-width validation (CJK/fullwidth=2, ASCII/halfwidth=1, max=25). Reject concepts exceeding threshold as Error.
- [ ] 2.5 Implement capacity threshold validation for total nodes, depth (max 3), siblings, and main branches.
- [ ] 2.6 Preserve optional `visualHint` and `colorHint` fields without semantic rewriting.

## 3. Error Model

- [ ] 3.1 Define path-specific validation error objects for structural and quality errors.
- [ ] 3.2 Define regeneration-oriented capacity error output for Agent CLI retry loops.
- [ ] 3.3 Ensure validation never silently rewrites, merges, splits, or semantically compresses concepts.
- [ ] 3.4 Ensure sentence-like and oversized concepts always produce Error (never Warning or silent pass-through).

## 4. Fixtures

- [ ] 4.1 Add a valid Chinese concept-unit fixture.
- [ ] 4.2 Add a valid English concept-phrase fixture.
- [ ] 4.3 Add a valid mixed CJK+ASCII concept fixture (verify unit-width calculation).
- [ ] 4.4 Add invalid fixtures for missing center concept, malformed children, sentence-like concepts, and concepts exceeding unit-width 25.
- [ ] 4.5 Add an oversized fixture that exceeds at least one MVP capacity threshold.
- [ ] 4.6 Add a fixture with nesting deeper than 3 levels (must fail validation).

## 5. Tests

- [ ] 5.1 Test that valid minimal and representative fixtures pass validation.
- [ ] 5.2 Test that unsupported contract versions fail with a `version` path error.
- [ ] 5.3 Test that malformed hierarchy errors include precise branch paths.
- [ ] 5.4 Test that sentence-like concepts fail as Error without CLI rewriting.
- [ ] 5.5 Test that concepts exceeding unit-width 25 fail as Error.
- [ ] 5.6 Test that nesting deeper than 3 levels fails with a structural error.
- [ ] 5.7 Test that oversized input fails before preview startup with retry-friendly capacity feedback.
- [ ] 5.8 Test that optional hints are preserved in validated output.

## 6. Documentation

- [ ] 6.1 Document the JSON contract shape and validation behavior near the core contract implementation.
- [ ] 6.2 Document that Markdown outline parsing and direct LLM calls are outside this change.
- [ ] 6.3 Document example Agent CLI retry feedback for oversized content.
