## MODIFIED Requirements

### Requirement: Center visual object
The system SHALL require a center visual object instead of a plain center text string.

#### Scenario: Phase 1 compliant center visual
- **WHEN** `rootMap.center` includes a supported image or visual-symbol `mode` and `complianceState: "compliant"`
- **THEN** validation accepts the center visual when referenced built-in or self-contained approved assets are valid, even if the controlled SVG source was single-color

#### Scenario: Missing center visual
- **WHEN** `rootMap.center` is missing or only represented as a plain string
- **THEN** validation fails with an error pointing to `rootMap.center`

#### Scenario: External svgUrl is used as final visual truth
- **WHEN** a browser-exported `.omm` stores only an external `svgUrl` as the center visual asset
- **THEN** validation rejects it because `.omm` must reopen with images intact without network dependency

### Requirement: Built-in asset references
The system SHALL store built-in templates and built-in visual assets by stable ID rather than embedding their binary data into every `.omm`.

#### Scenario: Built-in asset reference
- **WHEN** an image asset has `source: "builtin"` and a known `builtinId`
- **THEN** validation accepts the asset without requiring embedded `data`

#### Scenario: Unknown built-in asset reference
- **WHEN** an image asset has `source: "builtin"` and a `builtinId` that is not in the Phase 1 built-in asset registry
- **THEN** validation fails with a path-specific unknown built-in asset error

#### Scenario: Built-in asset embeds duplicated data
- **WHEN** an image asset has `source: "builtin"` and also stores unnecessary embedded payload data
- **THEN** validation rejects the asset as non-canonical for Phase 1 `.omm`

#### Scenario: Controlled SVG was loaded before export
- **WHEN** the browser exports a document after a controlled SVG was loaded and passed safety checks
- **THEN** the exported document stores an approved self-contained center visual asset or a deterministic built-in fallback rather than relying on the original external URL
