import type { OmmValidationIssue } from "./types";
import type { MindNode } from "../types";
import { BUILTIN_ASSET_ID_SET } from "../constants";

const EMBEDDED_DATA_FIELDS = [
  "data",
  "dataBase64",
  "embeddedSvg",
  "dataUri",
] as const;

export function validateAssets(
  assets: unknown,
  referencedAssetIds: ReadonlySet<string>,
  path = "assets",
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if (!assets || typeof assets !== "object") {
    issues.push({
      path,
      message: "Assets must be an object",
      code: "assets.missing",
    });
    return issues;
  }

  const a = assets as Record<string, unknown>;

  if (!Array.isArray(a.images)) {
    issues.push({
      path: `${path}.images`,
      message: "assets.images must be an array",
      code: "assets.missing_images",
    });
    return issues;
  }

  const images = a.images as unknown[];
  const knownAssetIds = new Set<string>();

  for (let i = 0; i < images.length; i++) {
    const imgPath = `${path}.images[${i}]`;
    issues.push(...validateImageAsset(images[i], imgPath, knownAssetIds));
  }

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

function validateImageAsset(
  img: unknown,
  imgPath: string,
  knownAssetIds: Set<string>,
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if (!img || typeof img !== "object") {
    issues.push({
      path: imgPath,
      message: "Image asset must be an object",
      code: "assets.invalid_image",
    });
    return issues;
  }

  const image = img as Record<string, unknown>;

  if (typeof image.id !== "string" || (image.id as string).length === 0) {
    issues.push({
      path: `${imgPath}.id`,
      message: "Image asset must have a non-empty id",
      code: "assets.missing_id",
    });
    return issues;
  }
  knownAssetIds.add(image.id as string);

  issues.push(...validateImageSource(image, imgPath));
  issues.push(...validateImageBuiltinId(image, imgPath));
  issues.push(...checkEmbeddedDataFields(image, imgPath));

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

  return issues;
}

function validateImageSource(
  image: Record<string, unknown>,
  imgPath: string,
): OmmValidationIssue[] {
  if (image.source !== "builtin") {
    return [
      {
        path: `${imgPath}.source`,
        message: `Asset source "${String(image.source)}" is not supported in Phase 1. Only "builtin" is allowed.`,
        code: "assets.unsupported_source",
      },
    ];
  }
  return [];
}

function validateImageBuiltinId(
  image: Record<string, unknown>,
  imgPath: string,
): OmmValidationIssue[] {
  if (
    typeof image.builtinId !== "string" ||
    (image.builtinId as string).length === 0
  ) {
    return [
      {
        path: `${imgPath}.builtinId`,
        message: "Built-in asset must have a non-empty builtinId",
        code: "assets.missing_builtinId",
      },
    ];
  }

  if (
    image.source === "builtin" &&
    !BUILTIN_ASSET_ID_SET.has(image.builtinId as string)
  ) {
    return [
      {
        path: `${imgPath}.builtinId`,
        message: `Unknown built-in asset id "${image.builtinId as string}"`,
        code: "assets.unknown_builtinId",
      },
    ];
  }
  return [];
}

function checkEmbeddedDataFields(
  image: Record<string, unknown>,
  imgPath: string,
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];
  for (const forbidden of EMBEDDED_DATA_FIELDS) {
    if (forbidden in image) {
      issues.push({
        path: `${imgPath}.${forbidden}`,
        message: `Embedded data field "${forbidden}" is not allowed in .omm format`,
        code: "assets.embedded_data",
      });
    }
  }
  return issues;
}

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
