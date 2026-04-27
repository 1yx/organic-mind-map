import type { OmmValidationIssue } from "./types";
import type { MindNode } from "../types";

/**
 * Validates the asset manifest and cross-references.
 *
 * Phase 1 rules:
 * - Asset source must be "builtin". Rejects "uploaded" and "generated".
 * - Asset must have a builtinId string.
 * - Rejects embedded Base64 data (no data field, no embeddedSvg, etc.).
 * - Accepts any string for builtinId since the registry is not yet built.
 * - Validates that all asset references from center/nodes resolve to known assets.
 */
export function validateAssets(
  assets: unknown,
  referencedAssetIds: ReadonlySet<string>,
  path = "assets",
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if (!assets || typeof assets !== "object") {
    issues.push({ path, message: "Assets must be an object", code: "assets.missing" });
    return issues;
  }

  const a = assets as Record<string, unknown>;

  // images must be an array
  if (!Array.isArray(a.images)) {
    issues.push({ path: `${path}.images`, message: "assets.images must be an array", code: "assets.missing_images" });
    return issues;
  }

  const knownAssetIds = new Set<string>();

  for (let i = 0; i < a.images.length; i++) {
    const img = a.images[i];
    const imgPath = `${path}.images[${i}]`;

    if (!img || typeof img !== "object") {
      issues.push({ path: imgPath, message: "Image asset must be an object", code: "assets.invalid_image" });
      continue;
    }

    const image = img as Record<string, unknown>;

    // Must have an id
    if (typeof image.id !== "string" || (image.id as string).length === 0) {
      issues.push({ path: `${imgPath}.id`, message: "Image asset must have a non-empty id", code: "assets.missing_id" });
      continue;
    }
    knownAssetIds.add(image.id as string);

    // source must be "builtin"
    if (image.source !== "builtin") {
      issues.push({
        path: `${imgPath}.source`,
        message: `Asset source "${String(image.source)}" is not supported in Phase 1. Only "builtin" is allowed.`,
        code: "assets.unsupported_source",
      });
    }

    // builtinId is required when source is builtin
    if (typeof image.builtinId !== "string" || (image.builtinId as string).length === 0) {
      issues.push({
        path: `${imgPath}.builtinId`,
        message: "Built-in asset must have a non-empty builtinId",
        code: "assets.missing_builtinId",
      });
    }

    // Reject embedded data fields (Base64, embedded SVG, etc.)
    for (const forbidden of ["data", "dataBase64", "embeddedSvg", "dataUri"] as const) {
      if (forbidden in image) {
        issues.push({
          path: `${imgPath}.${forbidden}`,
          message: `Embedded data field "${forbidden}" is not allowed in .omm format`,
          code: "assets.embedded_data",
        });
      }
    }

    // mimeType should be present
    if (typeof image.mimeType !== "string" || (image.mimeType as string).length === 0) {
      issues.push({
        path: `${imgPath}.mimeType`,
        message: "Image asset must have a mimeType",
        code: "assets.missing_mimeType",
      });
    }
  }

  // Check that all referenced asset IDs resolve to known assets
  for (const refId of referencedAssetIds) {
    if (!knownAssetIds.has(refId)) {
      issues.push({
        path,
        message: `Referenced asset id "${refId}" not found in asset manifest`,
        code: "assets.unresolved_ref",
      });
    }
  }

  return issues;
}

/**
 * Collects all asset IDs referenced by nodes (recursively).
 */
export function collectNodeAssetIds(nodes: MindNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.imageRef && node.imageRef.assetId) {
      ids.push(node.imageRef.assetId);
    }
    if (node.children && node.children.length > 0) {
      ids.push(...collectNodeAssetIds(node.children));
    }
  }
  return ids;
}
