/**
 * formatLabel.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Small, shared display-formatting helpers.
 *
 * Why this exists:
 *   CSS text-transform: capitalize only works when the underlying value is
 *   already lowercase - it can uppercase a first letter, but it cannot also
 *   lowercase the rest of an already-uppercase string in the same property.
 *   Several places in this codebase store internal category/type values as
 *   ALL-CAPS strings (e.g. action registry categories: 'SYNOPTIC', 'SYSTEM').
 *   Those need a real JS-level transform for display, not CSS alone.
 *
 *   Use this for that specific case. If a value is already lowercase,
 *   prefer the CSS text-transform: capitalize approach on the shared button
 *   classes instead (ps-tat-filter-btn, ps-idf-lis-btn, tmpl-filter-btn,
 *   ps-conf-category-btn, ps-plib__filter-btn all already do this) - no JS
 *   needed for that case.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Converts a single all-caps or all-lowercase word to Title Case for display.
 * Does not touch the original value - use only for what's rendered, never
 * for the value used in comparisons/filtering logic, since those often rely
 * on matching the original casing exactly.
 *
 * Intended for single-word enum-style values (e.g. 'SYNOPTIC' -> 'Synoptic').
 * For genuinely multi-word labels, prefer a real label map instead (see
 * TAT_TYPE_LABELS in TATConfigSection.tsx or TYPE_CONFIG in PartLibraryTab.tsx
 * for examples of that pattern).
 */
export function toTitleCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
