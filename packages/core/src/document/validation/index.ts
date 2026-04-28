/**
 * Phase 1 .omm Document Validation — main orchestrator.
 *
 * Runs all validation passes in order:
 *   1. envelope   — required top-level fields, version check, organicSeed
 *   2. paper      — supported kind, canonical dimensions
 *   3. tree       — node IDs, concepts, no stale topology fields
 *   4. center visual — mode, titleText, compliance rules
 *   5. assets     — built-in only, no embedded data, cross-references
 *   6. layout     — snapshot structure, geometry, node ID references
 *   7. excluded state — no editor/render/Plus/source fields
 *
 * Validation is pure: no side effects, no mutation of the input document.
 * Returns an OmmValidationResult with `valid: true` when all passes succeed.
 */

import type { OmmValidationResult } from "./types";
import { validateEnvelope } from "./envelope";
import { validatePaper } from "./paper";
import { validateTree } from "./tree";
import { validateLayout } from "./layout";
import { validateCenterVisual, collectCenterAssetIds } from "./center-visual";
import { validateAssets, collectNodeAssetIds } from "./assets";
import { checkExcludedState } from "./excluded-state";

/**
 * Validates a full .omm document against all Phase 1 rules.
 *
 * @param data - The raw document data (typically parsed JSON).
 * @returns An OmmValidationResult indicating validity and any errors.
 */
export function validateOmmDocument(data: unknown): OmmValidationResult {
  const allErrors: OmmValidationResult["errors"] = [];

  // 1. Envelope validation
  const envelopeErrors = validateEnvelope(data);
  allErrors.push(...envelopeErrors);

  // Early exit if envelope is fundamentally broken
  if (envelopeErrors.length > 0) {
    const hasCritical = envelopeErrors.some(
      (e) =>
        e.code === "envelope.missing" ||
        e.code === "envelope.missing_rootMap" ||
        e.code === "envelope.missing_layout" ||
        e.code === "envelope.missing_assets",
    );
    if (hasCritical) {
      return { valid: false, errors: allErrors, data };
    }
  }

  const doc = data as Record<string, unknown>;

  // 2. Paper validation
  const paperErrors = validatePaper(doc.paper, "paper");
  allErrors.push(...paperErrors);

  // 3. Tree validation (also collects node IDs for layout checking)
  const { issues: treeErrors, nodeIds } = validateTree(doc.rootMap);
  allErrors.push(...treeErrors);

  // 4. Center visual validation
  const rootMap = doc.rootMap as Record<string, unknown> | undefined;
  const centerVisualErrors = validateCenterVisual(
    rootMap?.center,
    "rootMap.center",
  );
  allErrors.push(...centerVisualErrors);

  // 5. Asset validation (collect all referenced asset IDs)
  const centerAssetIds = collectCenterAssetIds(rootMap?.center);
  const treeChildren = rootMap?.children;
  const nodeAssetIds = Array.isArray(treeChildren)
    ? collectNodeAssetIds(treeChildren as import("../types").MindNode[])
    : [];
  const allReferencedAssetIds = new Set([...centerAssetIds, ...nodeAssetIds]);
  const assetErrors = validateAssets(
    doc.assets,
    allReferencedAssetIds,
    "assets",
  );
  allErrors.push(...assetErrors);

  // 6. Layout validation (requires node IDs from tree)
  const layoutErrors = validateLayout(doc.layout, nodeIds, "layout");
  allErrors.push(...layoutErrors);

  // 7. Excluded state checks
  const excludedErrors = checkExcludedState(doc);
  allErrors.push(...excludedErrors);

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    data,
  };
}
