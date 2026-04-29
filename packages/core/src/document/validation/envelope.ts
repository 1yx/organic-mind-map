import type { OmmValidationIssue } from "./types";

const REQUIRED_STRINGS = ["id", "title"] as const;

export function validateEnvelope(doc: unknown): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];

  if (!doc || typeof doc !== "object") {
    issues.push({
      path: "",
      message: "Document must be an object",
      code: "envelope.missing",
    });
    return issues;
  }

  const d = doc as Record<string, unknown>;

  issues.push(...validateRequiredStrings(d));
  issues.push(...validateOrganicSeed(d));
  issues.push(...validateVersion(d));
  issues.push(...validateRequiredObject(d, "paper", "envelope.missing_paper"));
  issues.push(...validateRootMap(d));
  issues.push(
    ...validateRequiredObject(d, "layout", "envelope.missing_layout"),
  );
  issues.push(
    ...validateRequiredObject(d, "assets", "envelope.missing_assets"),
  );
  issues.push(...validateRequiredObject(d, "meta", "envelope.missing_meta"));

  return issues;
}

function validateRequiredStrings(
  d: Record<string, unknown>,
): OmmValidationIssue[] {
  const issues: OmmValidationIssue[] = [];
  for (const field of REQUIRED_STRINGS) {
    if (typeof d[field] !== "string" || (d[field] as string).length === 0) {
      issues.push({
        path: field,
        message: `"${field}" must be a non-empty string`,
        code: `envelope.missing_${field}`,
      });
    }
  }
  return issues;
}

/**
 * Validate organicSeed: if missing/empty AND layout snapshot is present,
 * silently backfill via cyrb53 content hash. Only fail when there is no
 * usable layout snapshot to rely on.
 */
function validateOrganicSeed(d: Record<string, unknown>): OmmValidationIssue[] {
  const seed = d.organicSeed;
  const hasSeed = typeof seed === "string" && seed.length > 0;
  if (hasSeed) return [];

  // Layout snapshot present → silent repair (no error)
  if (d.layout && typeof d.layout === "object" && !Array.isArray(d.layout)) {
    const backfilled = cyrb53(JSON.stringify(d.rootMap));
    (d as Record<string, unknown>).organicSeed = String(backfilled);
    return [];
  }

  // No layout snapshot → must fail
  return [
    {
      path: "organicSeed",
      message:
        '"organicSeed" must be a non-empty string when no layout snapshot is available',
      code: "envelope.missing_organicSeed",
    },
  ];
}

/** cyrb53 — fast 53-bit non-cryptographic hash (same algorithm as renderer). */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function validateVersion(d: Record<string, unknown>): OmmValidationIssue[] {
  if (d.version !== 1) {
    return [
      {
        path: "version",
        message: `Document version must be 1, got ${d.version}`,
        code: "envelope.invalid_version",
      },
    ];
  }
  return [];
}

function validateRequiredObject(
  d: Record<string, unknown>,
  field: string,
  code: string,
): OmmValidationIssue[] {
  const value = d[field];
  if (!value || typeof value !== "object") {
    return [{ path: field, message: `"${field}" must be an object`, code }];
  }
  return [];
}

function validateRootMap(d: Record<string, unknown>): OmmValidationIssue[] {
  if (Array.isArray(d.rootMap)) {
    return [
      {
        path: "rootMap",
        message: "rootMap must be a single object, not an array",
        code: "envelope.multiple_maps",
      },
    ];
  }
  return validateRequiredObject(d, "rootMap", "envelope.missing_rootMap");
}
