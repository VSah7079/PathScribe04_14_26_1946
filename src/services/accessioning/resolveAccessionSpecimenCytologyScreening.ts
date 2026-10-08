// src/services/accessioning/resolveAccessionSpecimenCytologyScreening.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-212): the cytology screening record a specimen starts with at
// accessioning. The accession form's "persistent contact bleeding at
// collection" checkbox is a collection-time observation (one half of
// CytologyHighRiskFactors.abnormalExamFindings). Ticked, it is recorded on
// every cytology or FNA specimen in the batch; never on any other specimen.
//
// Batch 452 (Pete, Oct 4): the answer is three-way. The checkbox could only
// record "ticked": unticked meant "not asked", so an explicit "no" was lost
// (false and undefined were treated alike). The form now asks Yes / No /
// Not recorded; Yes and No are both stored (true / false), Not recorded
// stores nothing.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyScreeningRecord } from '@/types/case/Specimen';

/** Dictionary entry types the observation applies to (the same entry.type check accessioning uses). */
const CYTOLOGY_ENTRY_TYPES = ['Cytology', 'FNA'];

export type ContactBleedingChoice = '' | 'yes' | 'no';

/** The form's choice as the stored value: '' (not recorded) is undefined. */
export function contactBleedingFromChoice(choice: ContactBleedingChoice): boolean | undefined {
  return choice === 'yes' ? true : choice === 'no' ? false : undefined;
}

export function resolveAccessionSpecimenCytologyScreening(
  entryType: string | undefined,
  persistentContactBleedingAtCollection: boolean | undefined,
): Pick<CytologyScreeningRecord, 'persistentContactBleedingAtCollection'> | undefined {
  if (typeof persistentContactBleedingAtCollection !== 'boolean') return undefined;
  if (!entryType || !CYTOLOGY_ENTRY_TYPES.includes(entryType)) return undefined;
  return { persistentContactBleedingAtCollection };
}
