# agent-list-contract Design

## Goal

Define the structured input contract that an agent skill produces and the CLI consumes. The contract should be concise, deterministic, easy to validate, and aligned with the product rule: one cognitive concept unit per branch.

## Contract Shape

Use JSON as the primary contract because it is easy for agents, CLIs, validation libraries, and tests to consume.

The structure is explicitly limited to 3 levels to ensure stable LLM structured output:

```ts
interface AgentMindMapList {
  version: 1
  title: string
  paper?: "a3-landscape" | "a4-landscape"
  center: AgentCenter
  branches: MainBranch[]
  meta?: {
    sourceTitle?: string
    sourceSummary?: string
  }
}

interface AgentCenter {
  concept: string
  visualHint?: string
  svgUrl?: string
}

interface MainBranch {
  concept: string
  children?: SubBranch[]
  visualHint?: string
  colorHint?: string
}

interface SubBranch {
  concept: string
  children?: LeafNode[]
  visualHint?: string
}

interface LeafNode {
  concept: string
  visualHint?: string
}
```

Why explicit 3-level types instead of recursive `children?: AgentBranch[]`: mainstream LLM structured output (Function Calling) is fragile with unbounded recursive types. Limiting to 3 explicit levels (`MainBranch -> SubBranch -> LeafNode`) dramatically reduces JSON corruption risk and aligns with the visual carrying capacity of a single A3/A4 sheet.

The contract is not a general outline format. It is a generation-ready input format for `.omm`.

When `ai-svg-center-visual` is enabled, `center.svgUrl` is optional and may point to a controlled open vector source selected by the outer agent skill. Validation preserves it when it is a string, while source allowlist handling belongs to the preview handoff/browser rendering changes.

## Agent Orchestration Role

The application does not call an AI API directly in MVP. The expected orchestration is through an outer Agent CLI such as Gemini CLI, Codex CLI, or Claude Code:

```text
Agent CLI -> agent skill
  -> produces AgentMindMapList JSON
  -> CLI validates contract and capacity
  -> valid data is passed into the local preview flow
```

If validation fails because the content is too large or too verbose, the CLI should emit an error that the calling Agent CLI can use as feedback to regenerate a smaller list.

## Concept Unit Rules

Validation enforces that each `concept` is a single semantic unit, using a unified unit-width metric:

* Each CJK character (Chinese, Japanese, Korean) or fullwidth character counts as **2 unit-width**.
* Each ASCII letter, digit, or halfwidth character counts as **1 unit-width**.
* A concept's total unit-width must not exceed **25**.
* Concepts exceeding the unit-width threshold are treated as **Error**, not Warning.
* Sentence-like punctuation patterns (e.g. "因为...所以...", "because...therefore...") are always rejected as Error.
* The agent must preserve user meaning.
* The CLI must not silently rewrite concepts.

Valid examples:

```json
{ "concept": "商业模式" }          // 8 unit-width (4 CJK × 2)
{ "concept": "BUSINESS MODEL" }   // 14 unit-width (14 ASCII × 1)
{ "concept": "AI提示词工程" }       // 12 unit-width (2 ASCII + 5 CJK × 2)
```

Rejected examples (Error, not Warning):

```json
{ "concept": "This is important because pricing affects conversion" }  // sentence
{ "concept": "我们需要先分析用户为什么会流失" }                          // sentence
{ "concept": "大语言模型提示词工程与自动化测试框架设计" }                  // exceeds 25 unit-width
```

## Validation Layers

Use two validation levels:

1. **Structural validation**
   * required fields
   * arrays where expected
   * no empty concepts
   * max depth: 3 (MainBranch -> SubBranch -> LeafNode)
   * max branch count guard
   * max total node count guard
   * max sibling count guard

2. **Quality validation**
   * sentence-like punctuation patterns → **Error** (reject and return to Agent for retry)
   * concept unit-width exceeds 25 → **Error**
   * repeated siblings
   * missing center visual hint (warning only)

Both structural and quality validation failures produce Error and reject the input for Agent CLI retry. There are no "soft" quality warnings that allow invalid content through to the rendering stage.

## Capacity Limits

The contract should define configurable MVP limits, for example:

```ts
interface AgentListLimits {
  maxNodes: number
  maxDepth: 3
  maxSiblingsPerNode: number
  maxConceptUnitWidth: 25
  maxMainBranches: number
}
```

The exact `maxNodes`, `maxSiblingsPerNode`, and `maxMainBranches` values can be tuned during implementation, but `maxDepth` is fixed at 3 and `maxConceptUnitWidth` is fixed at 25. If the input exceeds capacity, the CLI fails before starting the browser preview and returns a regeneration-oriented error.

Example:

```text
Input exceeds MVP capacity:
- total nodes 126 exceeds maxNodes 45
- branch[2].children count 18 exceeds maxSiblingsPerNode 8
Please regenerate a shorter concept list.
```

## File Formats

The MVP should support:

* `.json` as the canonical format
* optionally `.yaml` later if useful

Markdown outline parsing is explicitly not part of this contract unless a future change adds it.

## Error Reporting

Errors should point to paths:

```text
branches[2].children[0].concept: concept is empty
branches[1].concept: looks like a sentence; use a concept unit
```

This makes it easy for Agent CLIs and users to repair input.

## Risks

* Over-validating concept length and rejecting valid compound concepts.
* Under-validating and allowing prose outlines through.
* Letting the CLI become a semantic rewriting layer.
* Failing too late in the browser instead of returning actionable feedback to the calling Agent CLI.
* LLM generating deeper-than-3-level nesting despite explicit type constraints.

## Decisions

* The agent owns semantic compression.
* The CLI owns validation and conversion.
* The CLI owns defensive capacity checks and may reject oversized agent output for regeneration.
* Source structure snapshots are not stored.
* `rawInput` is not part of the agent output contract. MVP does not need the agent to echo back source text.
* Sentence-like or oversized concepts are always Error, never Warning. The front-end will never receive invalid content to render.
* Concept length is validated by unit-width (CJK=2, ASCII=1, max 25), not by language-specific character/word counts.
* Maximum nesting depth is 3 explicit levels: MainBranch -> SubBranch -> LeafNode. No recursive types in the contract.

## Decisions

* The agent owns semantic compression.
* The CLI owns validation and conversion.
* The CLI owns defensive capacity checks and may reject oversized agent output for regeneration.
* Raw input can be preserved per node, but source structure snapshots are not stored.
