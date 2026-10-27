// src/services/cytology/reactiveChangesPolicy.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 626 (PS-163). Whether a negative GYN case whose only finding is "reactive cellular changes"
// (inflammation, radiation, IUD) may be signed out by a cytotechnologist is a lab SOP choice: many labs
// let the cytotechnologist sign it out, some send it to a pathologist. The answer is already carried per
// category (`requiresPathologistReview`, copied onto each review when it is recorded, and read by
// resolveCytologySignOutGate). This file is the one-switch view of those categories for the lab setting:
// what the switch currently says, and the changes to make when an admin flips it.
//
//   • Shipped default: off (a cytotechnologist may sign out), as before.
//   • Applies to reviews recorded after the change; a review already recorded keeps the answer it had.
//   • Only the reactive-change categories move. Every other category, and every other sign-out check
//     (non-GYN, unsatisfactory adequacy, QC flag), is untouched.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyCategoryEntry } from './ICytologyCategoryService';

export type ReactiveChangesSetting = 'cytotechnologist' | 'pathologist' | 'mixed' | 'none';

export const isReactiveChangesCategory = (entry: Pick<CytologyCategoryEntry, 'id' | 'section'>): boolean =>
  entry.section === 'interpretation_result' && entry.id.startsWith('cyto-nonneo-reactive-');

/** What the lab's categories currently say. 'mixed' = someone edited one category on its own. */
export function reactiveChangesSetting(entries: readonly Pick<CytologyCategoryEntry, 'id' | 'section' | 'requiresPathologistReview'>[]): ReactiveChangesSetting {
  const reactive = entries.filter(isReactiveChangesCategory);
  if (reactive.length === 0) return 'none';
  const needing = reactive.filter(e => e.requiresPathologistReview).length;
  if (needing === 0) return 'cytotechnologist';
  return needing === reactive.length ? 'pathologist' : 'mixed';
}

/** The category changes that make every reactive-change category say `requirePathologist`. */
export function reactiveChangesUpdates(
  entries: readonly Pick<CytologyCategoryEntry, 'id' | 'section' | 'requiresPathologistReview'>[],
  requirePathologist: boolean,
): { id: string; changes: { requiresPathologistReview: boolean } }[] {
  return entries
    .filter(isReactiveChangesCategory)
    .filter(e => e.requiresPathologistReview !== requirePathologist)
    .map(e => ({ id: e.id, changes: { requiresPathologistReview: requirePathologist } }));
}
