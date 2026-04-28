import type { OmmValidationIssue } from "./types";
import type { MindNode } from "../types";
import { BUILTIN_ASSET_ID_SET } from "../constants";

/**
 * Validates the asset manifest and cross-references.
 *
 * Phase 1 rules:
 * - Asset source must be "builtin". Rejects "uploaded" and "generated".
 * - Asset must have a builtinId from the Phase 1 built-in asset registry.
 * - Rejects embedded Base64 data (no data field, no embeddedSvg, etc.).
 * - Validates that all asset references from center/nodes resolve to known assets.
 */

const FORBIDDEN_DATA_FIELDS = [
  "data",
  "dataBase64",
  "embeddedSvg",
  "dataUri",
] as const;

type ImageContext = {
  image: Record<string, unknown>;
  imgPath: string;
  issues: OmmValidationIssue[];
};

function checkAssetsRoot(
  assets: unknown,
  path: string,
  issues: OmmValidationIssue[],
): Record<string, unknown> | null {
  if (!assets || typeof assets !== "object") {
    issues.push({
      path,
      message: "Assets must be an object",
      code: "assets.missing",
    });
    return null;
  }
  return assets as Record<string, unknown>;
}

function checkImagesArray(
  a: Record<string, unknown>,
  path: string,
  issues: OmmValidationIssue[],
): unknown[] | null {
  if (!Array.isArray(a.images)) {
    issues.push({
      path: `${path}.images`,
      message: "assets.images must be an array",
      code: "assets.missing_images",
    });
    return null;
  }
  return a.images;
}

function validateImageObject(
  img: unknown,
  imgPath: string,
  issues: OmmValidationIssue[],
): Record<string, unknown> | null {
  if (!img || typeof img !== "object") {
    issues.push({
      path: imgPath,
      message: "Image asset must be an object",
      code: "assets.invalid_image",
    });
    return null;
  }
  return img as Record<string, unknown>;
}

function checkImageId(ctx: ImageContext, knownAssetIds: Set<string>): boolean {
  const { image, imgPath, issues } = ctx;
  if (typeof image.id !== "string" || (image.id as string).length === 0) {
    issues.push({
      path: `${imgPath}.id`,
      message: "Image asset must have a non-empty id",
      code: "assets.missing_id",
    });
    return false;
  }
  knownAssetIds.add(image.id as string);
  return true;
}

function validateSource(ctx: ImageContext): void {
  const { image, imgPath, issues } = ctx;
  if (image.source !== "builtin") {
    issues.push({
      path: `${imgPath}.source`,
      message: `Asset source "${String(image.source)}" is not supported in Phase 1. Only "builtin" is allowed.`,
      code: "assets.unsupported_source",
    });
  }
}

function validateBuiltinId(ctx: ImageContext): void {
  const { image, imgPath, issues } = ctx;
  if (
    typeof image.builtinId !== "string" ||
    (image.builtinId as string).length === 0
  ) {
    issues.push({
      path: `${imgPath}.builtinId`,
      message: "Built-in asset must have a non-empty builtinId",
      code: "assets.missing_builtinId",
    });
  } else if (
    image.source === "builtin" &&
    !BUILTIN_ASSET_ID_SET.has(image.builtinId as string)
  ) {
    issues.push({
      path: `${imgPath}.builtinId`,
      message: `Unknown built-in asset id "${image.builtinId as string}"`,
      code: "assets.unknown_builtinId",
    });
  }
}

function rejectEmbeddedData(ctx: ImageContext): void {
  const { image, imgPath, issues } = ctx;
  for (const forbidden of FORBIDDEN_DATA_FIELDS) {
    if (forbidden in image) {
      issues.push({
        path: `${imgPath}.${forbidden}`,
        message: `Embedded data field "${forbidden}" is not allowed in .omm format`,
        code: "assets.embedded_data",
      });
    }
  }
}

function checkMimeType(ctx: ImageContext): void {
  const { image, imgPath, issues } = ctx;
  if (
    typeof image.mimeType !== "string" ||
    (image.mimeType as string).length === 0
  ) {
    issues.push({
      path: `${imgPath}.mimeType`,
      message: "Image asset must have a mimeType",
      code: "assets.missing_mimeType",
    });
  }
}

function validateSingleImage(opts: {
  img: unknown;
  imgPath: string;
  issues: OmmValidationIssue[];
  knownAssetIds: Set<string>;
}): void {
  const { imgPath, issues, knownAssetIds } = opts;
  const image = validateImageObject(opts.img, imgPath, issues);
  if (!image) return;

  const ctx: ImageContext = { image, imgPath, issues };

  if (!checkImageId(ctx, knownAssetIds)) return;

  validateSource(ctx);
  validateBuiltinId(ctx);
  rejectEmbeddedData(ctx);
  checkMimeType(ctx);
}

function checkUnresolvedRefs(opts: {
  referencedAssetIds: ReadonlySet<string>;
  knownAssetIds: Set<string>;
  path: string;
  issues: OmmValidationIssue[];
}): void {
  const { referencedAssetIds, knownAssetIds, path, issues } = opts;
  for (const refId of referencedAssetIds) {
    if (!knownAssetIds.has(refId)) {
      issues.push({
        path,
        message: `Referenced asset id "${refId}" not found in asset manifest`,
        code: "assets.unresolved_ref",
      });
    }
  }
}

export function validateAssets(
  assets: unknown,
  referencedAssetIds: ReadonlySet<string>,
  path = "assets",
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  const a = checkAssetsRoot(assets, path, issues);
  if (!a) return issues;

  const images = checkImagesArray(a, path, issues);
  if (!images) return issues;

  const knownAssetIds = new Set<string>();

  for (let i = 0; i < images.length; i++) {
    validateSingleImage({
      img: images[i],
      imgPath: `${path}.images[${i}]`,
      issues,
      knownAssetIds,
    });
  }

  checkUnresolvedRefs({ referencedAssetIds, knownAssetIds, path, issues });

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
