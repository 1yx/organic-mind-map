## ADDED Requirements

### Requirement: Content outline source of truth
The system SHALL treat the `content outline` as the semantic source of truth for a generated organic mind map.

#### Scenario: YAML outline is provided
- **WHEN** a user submits a simple indentation-based YAML outline
- **THEN** the system parses it into the canonical content outline without requiring explicit field names

#### Scenario: Natural language prompt is provided
- **WHEN** a user submits natural language instead of YAML
- **THEN** the system uses an LLM to create a canonical content outline before image generation or CV extraction begins

#### Scenario: OCR text conflicts with source outline
- **WHEN** OCR recognizes text that conflicts with the content outline
- **THEN** the content outline remains the semantic truth and OCR is treated as visual evidence only

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

