// src/services/quality/standardQaTypeRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 428: a 'standard' QA activity or supervision type is curated by
// PathScribe for what a jurisdiction mandates, so a site can't switch it off
// or turn it into a custom one. Before, only the screen enforced this (it has
// no disable control for them); the services now refuse it too. Pure.
// ─────────────────────────────────────────────────────────────────────────────

export const STANDARD_QA_TYPE_LOCKED = 'STANDARD_QA_TYPE_LOCKED';

/** Why this change to a stored type is refused, or null when it's allowed. */
export function standardQaTypeChangeRefusal(
  existing: { tabScope: 'standard' | 'custom' },
  changes: { tabScope?: 'standard' | 'custom'; active?: boolean },
): string | null {
  if (existing.tabScope !== 'standard') return null;
  if (changes.active === false) return STANDARD_QA_TYPE_LOCKED;
  if (changes.tabScope !== undefined && changes.tabScope !== 'standard') return STANDARD_QA_TYPE_LOCKED;
  return null;
}
