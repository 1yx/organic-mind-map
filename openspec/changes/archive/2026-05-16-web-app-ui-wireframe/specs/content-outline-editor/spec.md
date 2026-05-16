## ADDED Requirements

### Requirement: Content-outline-text editing area
The sidebar SHALL contain a text editing area for `content-outline-text` — field-less, indentation-based plain text using 2 spaces per indent level (per TERMS.md).

#### Scenario: Editor displays default content
- **WHEN** the app loads
- **THEN** the sidebar shows a textarea with monospace font, pre-populated with a sample `content-outline-text` example

#### Scenario: Editor accepts user input
- **WHEN** a user types or edits text in the sidebar editor
- **THEN** the text is displayed with monospace font preserving indentation and whitespace

### Requirement: Monospace font rendering
The content-outline-text editor SHALL use a monospace font to preserve indentation alignment.

#### Scenario: Indentation visibility
- **WHEN** the user types multi-level indented content (2 spaces per level)
- **THEN** each indentation level is visually distinct and columns align correctly due to monospace font

### Requirement: Editor fills sidebar height
The text editor SHALL fill the available vertical space of the sidebar below any header or label.

#### Scenario: Full-height editor
- **WHEN** the app loads with the sidebar at full viewport height minus toolbar
- **THEN** the textarea stretches vertically to fill the sidebar space without scrolling the sidebar itself
