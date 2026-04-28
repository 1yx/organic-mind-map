# agent-list-contract

## Summary

Define the agent skill output contract for converting long text into a concise hierarchical list suitable for Organic Mind Map generation through Agent CLI workflows such as Gemini CLI, Codex CLI, and Claude Code.

## Why

The MVP starts with an agent skill that turns long text into a short list. The skill is invoked by an outer Agent CLI rather than by manual copy/paste. The project CLI should not parse arbitrary prose. It should consume a predictable, validation-friendly structure that already follows the product decision: one cognitive concept unit per branch.

## What Changes

* Define the accepted intermediate list format for the CLI.
* Specify rules for concept units:
  * one concept unit per item
  * preserve user meaning
  * reject sentence-like explanations as Error (not Warning)
  * use unified unit-width validation (CJK char=2, ASCII=1, max total width=25)
* Define required fields such as title, center concept, hierarchy, and optional visual hints.
* Explicitly limit nesting to 3 levels: MainBranch -> SubBranch -> LeafNode (no recursive types).
* Provide example inputs for typical long-text summaries.
* Provide validation errors for malformed hierarchy or overly verbose items.
* Define defensive capacity limits so oversized outputs can be rejected and returned to the calling Agent CLI for regeneration.

## Non-goals

* No direct LLM integration in the application.
* No `.omm` rendering.
* No automatic semantic rewriting inside the CLI beyond structural validation.
* No UI for editing list content.
* No `rawInput` field in the agent output contract — MVP does not require the agent to echo source text.

## Acceptance Criteria

* The repository documents a stable intermediate list contract with explicit 3-level nesting.
* Fixture examples show valid and invalid list inputs.
* The contract can express a title, center concept, main branches, child branches, and optional visual hints.
* Concept length validation uses unit-width (CJK=2, ASCII=1, max 25) — no language-dependent thresholds.
* Sentence-like or oversized concepts are always rejected as Error, never passed through as Warning.
* Oversized lists can fail validation with errors suitable for Agent CLI retry.
* The contract does not include `rawInput` fields.

## Dependencies

* `project-scaffold`
