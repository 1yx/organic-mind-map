## ADDED Requirements

### Requirement: Content outline source of truth
The system SHALL treat the `content outline` as the semantic source of truth for a generated organic mind map.

#### Scenario: content-outline-text is provided
- **WHEN** a user submits `content-outline-text`
- **THEN** the system parses it into the canonical content outline without requiring explicit field names

#### Scenario: content-outline-text indentation is parsed
- **WHEN** the system parses `content-outline-text`
- **THEN** it treats the first non-empty indent-0 line as center, two-space indent level 1 as top-level branches, and deeper two-space levels as recursive subbranches

#### Scenario: content-outline-text contains comments and blank lines
- **WHEN** `content-outline-text` contains blank lines or lines starting with `#` after optional leading spaces
- **THEN** the parser ignores those lines

#### Scenario: content-outline-text contains tabs
- **WHEN** `content-outline-text` uses tab indentation
- **THEN** parsing fails with an actionable indentation error

#### Scenario: content-outline-text skips indentation level
- **WHEN** `content-outline-text` jumps over a parent indentation level
- **THEN** parsing fails with an actionable hierarchy error

#### Scenario: content-outline-text contains field syntax
- **WHEN** a user writes field syntax such as `center: ...` in `content-outline-text`
- **THEN** the parser rejects it or treats it as unsupported input for Phase 2 rather than silently interpreting key/value syntax

#### Scenario: Natural language prompt is provided
- **WHEN** a user submits natural language instead of `content-outline-text`
- **THEN** the system uses an LLM to create a canonical content outline before image generation or CV extraction begins

#### Scenario: OCR text conflicts with source outline
- **WHEN** OCR recognizes text that conflicts with the content outline
- **THEN** the content outline remains the semantic truth and OCR is treated as visual evidence only

### Requirement: Doodle visual intent
The canonical content outline SHALL carry doodle prompts or equivalent visual hints for concepts that need visual disambiguation.

#### Scenario: Concept has a doodle prompt
- **WHEN** a branch or subbranch concept includes `doodlePrompt`
- **THEN** the prompt builder uses it to guide GPT-Image-2 visual generation for that concept

#### Scenario: Concept is visually ambiguous
- **WHEN** a short or multi-meaning concept could produce an inaccurate doodle if interpreted without context
- **THEN** the LLM outline step or user editing flow should add a concrete `doodlePrompt` before image generation

#### Scenario: Doodle prompt is present
- **WHEN** the system stores `doodlePrompt` in `content_outline.json`
- **THEN** it treats the field as visual intent for generation and alignment, not as final doodle geometry or mask truth

### Requirement: Recursive branch hierarchy
The system SHALL support recursive branch hierarchy from center to top-level branches and nested subbranches.

#### Scenario: Single root line
- **WHEN** the outline contains one indent-0 line
- **THEN** that line is parsed as the map center text or center concept

#### Scenario: Main branches
- **WHEN** lines appear one indentation level below the root
- **THEN** those lines are parsed as top-level `branch` concepts

#### Scenario: Nested children
- **WHEN** lines appear two or more indentation levels below the root
- **THEN** those lines are parsed as recursive `subbranch` concepts under their nearest less-indented parent

#### Scenario: Branch references children
- **WHEN** a branch or subbranch has descendants
- **THEN** it stores descendant IDs in `children`, for example `"children": ["subbranch_001_001"]`

### Requirement: Branch and subbranch class distinction
The system SHALL distinguish top-level `branch` objects from descendant `subbranch` objects.

#### Scenario: Top-level branch object
- **WHEN** the system creates a top-level branch from the content outline
- **THEN** the object uses `class: "branch"` and owns branch-system properties such as color, thickness scale, main stroke, doodle group IDs, and direct child references

#### Scenario: Descendant subbranch object
- **WHEN** the system creates a descendant branch at any depth below a top-level branch
- **THEN** the object uses `class: "subbranch"` and inherits branch-system color and taper rules from its top-level branch unless explicitly overridden by an approved editor operation

### Requirement: Concept unit discipline
The system SHALL preserve Buzan-style concept-unit discipline in the content outline.

#### Scenario: Concise concept
- **WHEN** an outline line contains a short keyword or concept phrase
- **THEN** the system accepts it as a concept candidate

#### Scenario: Sentence-like branch text
- **WHEN** an outline line contains sentence-like prose or paragraph text
- **THEN** the system flags it for user or LLM correction instead of silently treating it as a compliant branch concept
