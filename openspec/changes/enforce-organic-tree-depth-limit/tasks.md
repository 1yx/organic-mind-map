## 1. Validator

- [ ] 1.1 Implement or tighten recursive depth validation in `validateOrganicTree`.
- [ ] 1.2 Ensure over-depth findings use JSON Pointer paths and error severity.
- [ ] 1.3 Keep `OrganicLeafNode.children?` type compatibility while rejecting actual fourth-level input.

## 2. CLI Feedback

- [ ] 2.1 Map over-depth validation failures to retry-friendly CLI JSON output.
- [ ] 2.2 Include concise repair guidance for Agent regeneration.

## 3. Fixtures And Tests

- [ ] 3.1 Add valid three-level OrganicTree fixture coverage.
- [ ] 3.2 Add invalid fourth-level OrganicTree fixture coverage.
- [ ] 3.3 Run focused core and CLI validation tests.
