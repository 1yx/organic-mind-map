## MODIFIED Requirements

### Requirement: Read-only SVG render output
The renderer SHALL render a valid `OrganicTree` or `.omm` document into a non-empty SVG scene on a bounded landscape surface.

#### Scenario: Valid OrganicTree renders
- **WHEN** the renderer receives a valid `OrganicTree`
- **THEN** it returns a non-empty SVG result using the fixed MVP `sqrt2-landscape` surface ratio

#### Scenario: Valid OMM document renders
- **WHEN** the renderer receives a valid `.omm` document
- **THEN** it returns a non-empty SVG result using the document's saved surface and layout information

### Requirement: Layout snapshot support
The renderer SHALL expose the computed geometry needed for browser-side `.omm` export.

#### Scenario: Browser creates final document
- **WHEN** the browser exports `.omm` from a rendered preview
- **THEN** the computed layout includes surface bounds, center visual bounds, branch paths, and text paths needed by the document format

## ADDED Requirements

### Requirement: MVP surface ratio
The renderer SHALL use a single fixed MVP OrganicTree preview surface ratio named `sqrt2-landscape`.

#### Scenario: OrganicTree has no surface option
- **WHEN** an OrganicTree preview is rendered without document layout
- **THEN** the renderer uses width/height approximately `1.414` and does not require A3/A4 paper metadata

#### Scenario: Future ratio preset is needed
- **WHEN** later phases add another bounded ratio such as `16:9`
- **THEN** it is introduced as a render/Web surface preset rather than as an OrganicTree semantic field
