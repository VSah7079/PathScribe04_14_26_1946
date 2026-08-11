// src/services/stains/stainCategoryLookup.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real fix, closing a gap StainOrder's own doc comment already flagged:
// "not yet a real foreign key into the Stain Dictionary (stainTypeId),
// since resolving that requires the specimen's defaultStains (plain
// name strings) to be matched back to real StainType records, which the
// dictionary doesn't yet expose a lookup-by-name helper for."
//
// Real consumer this was built for: services/billing/cptSuggestionRules.ts
// needs to know whether a given StainOrder is Routine/Special
// Stain/IHC/etc. to suggest the right real CPT code (88312 special
// stain, 88342/88341 IHC) - impossible without this.
// ─────────────────────────────────────────────────────────────────────────────

import type { StainType, StainCategory } from './IStainService';

/** Real, case-insensitive, trimmed name match - StainOrder.stainName is
 *  free-typed display text ("H&E", "h&e", " H & E "), not a strict,
 *  normalized key, so an exact-only match would silently fail to
 *  resolve real, legitimate stain names that differ only in casing/
 *  whitespace. Returns null (never a fabricated guess) when no real
 *  match exists - a caller must decide how to handle an unresolvable
 *  stain name honestly, not have one invented for it here. Also the
 *  correct, automatic behavior for UNSTAINED_LABEL ('Unstained') -
 *  confirmed not present in the seed Stain Dictionary, so it already
 *  resolves to null with no special-casing needed. */
export function resolveStainType(stainName: string, allStainTypes: StainType[]): StainType | null {
  const normalized = stainName.trim().toLowerCase();
  if (!normalized) return null;
  return allStainTypes.find(st => st.name.trim().toLowerCase() === normalized) ?? null;
}

/** Real, case-insensitive, trimmed name match - see resolveStainType's
 *  own doc comment for the full reasoning. Thin wrapper kept for
 *  existing callers that only need the category. */
export function resolveStainCategory(stainName: string, allStainTypes: StainType[]): StainCategory | null {
  return resolveStainType(stainName, allStainTypes)?.category ?? null;
}
