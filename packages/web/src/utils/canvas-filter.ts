/**
 * Filters internal/debug fields from OMM data before rendering on canvas.
 *
 * prediction_omm from the CV worker may contain fields like masks,
 * rawOcrEvidence, and debugInternals that should not appear in the
 * normal canvas UI. Admin users may see these through a separate toggle.
 */

/** Field names that are internal and should be hidden from normal canvas UI. */
const INTERNAL_FIELDS = ["masks", "rawOcrEvidence", "debugInternals"] as const;

export type FilterableOmm = Record<string, unknown>;

/**
 * Returns a shallow copy of the OMM object with internal fields removed.
 * Does not mutate the input.
 */
export function filterInternalFields(omm: FilterableOmm): FilterableOmm {
  const filtered: FilterableOmm = {};
  for (const [key, value] of Object.entries(omm)) {
    if ((INTERNAL_FIELDS as readonly string[]).includes(key)) {
      continue;
    }
    filtered[key] = value;
  }
  return filtered;
}

/**
 * Extracts only the internal fields for admin inspection.
 */
export function extractInternalFields(
  omm: FilterableOmm,
): Partial<Record<(typeof INTERNAL_FIELDS)[number], unknown>> {
  const result: Partial<Record<(typeof INTERNAL_FIELDS)[number], unknown>> = {};
  for (const field of INTERNAL_FIELDS) {
    if (field in omm) {
      result[field] = omm[field];
    }
  }
  return result;
}
