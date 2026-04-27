/**
 * @omm/core - Document types, validation, assets, paper specs, seed utilities.
 *
 * Environment-neutral. No Node or browser API dependencies.
 */

// --- Agent List Contract ---
export * from "./contract/index";

// --- Document types (placeholder) ---

export interface OmmDocument {
  /** Stable document identifier */
  id: string;
  /** Paper specification (A3, A4, etc.) */
  paper: {
    width: number;
    height: number;
    orientation: "landscape" | "portrait";
  };
  /** Center visual of the map */
  centerVisual: {
    id: string;
    type: "image" | "icon-collage" | "multi-color";
    assetId?: string;
  };
  /** Ordered branches (main + sub) */
  branches: OmmBranch[];
}

export interface OmmBranch {
  id: string;
  parentId?: string;
  /** One cognitive concept keyword (uppercase for English) */
  keyword: string;
  color: string;
  children: OmmBranch[];
}

// --- Validation (placeholder) ---

export function validateOmmDocument(doc: unknown): OmmDocument {
  if (!doc || typeof doc !== "object") {
    throw new Error("Invalid OmmDocument: expected object");
  }
  return doc as OmmDocument;
}

// --- Seed utilities (placeholder) ---

export function createSeed(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
