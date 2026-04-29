## MODIFIED Requirements

### Requirement: Self-contained asset handling
PNG export SHALL use self-contained or browser-safe rendered assets and SHALL avoid uncontrolled external image drawing.

#### Scenario: Built-in assets are used
- **WHEN** the preview contains built-in center visuals or SVG shapes
- **THEN** the PNG export includes them without requiring network access at export time

#### Scenario: External visible asset is used
- **WHEN** the preview SVG clone contains a visible external asset reference
- **THEN** the export preprocessor rejects the uncontrolled external reference and uses deterministic fallback or blocks with a local readiness error

#### Scenario: External asset cannot be inlined
- **WHEN** a visible external asset cannot be fetched, verified, or converted to an export-safe inline form
- **THEN** export uses a deterministic fallback or blocks with a local readiness error

#### Scenario: Controlled center SVG is export-safe
- **WHEN** a controlled SVG center visual has loaded and passed safety checks before export
- **THEN** export uses the already loaded safe SVG content without issuing a new uncontrolled external image draw

#### Scenario: Controlled center SVG is not export-safe
- **WHEN** a controlled SVG center visual has not loaded, failed safety checks, or is not safe for canvas export
- **THEN** export uses the deterministic built-in fallback or blocks with a local readiness error
