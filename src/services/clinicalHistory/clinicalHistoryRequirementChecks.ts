// src/services/clinicalHistory/clinicalHistoryRequirementChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 528 (PS-359): the clinical history an organisation requires at
// Accession (Field Requirements, page `clinicalHistory`). Applies only to
// cytology and FNA cases: the Clinical history card is shown for no others,
// so the caller passes `applies: false` and nothing is ever missing. Pure.
//
//   - caseEntry:     at least one case-level entry.
//   - specimenEntry: at least one entry on every specimen (perSpecimen). With
//                    one specimen the editor offers only the case as a target,
//                    so a case-level entry counts for that specimen.
//   - coded:         every entry recorded is a dictionary code, not unmapped
//                    free text. With no entries it is satisfied; require
//                    caseEntry or specimenEntry as well to insist on one.
//
// Batch 530 (Pete, Oct 11: no hard blocks at intake, the same for every
// specialty): Accession shows what is missing as a note and accessions the
// case anyway. The history can be added later (recordClinicalHistoryAfterAccession),
// and the mismatch check is deferred while there is no clinical information.
//
// What a code itself asks for (its metadata fields) is set per code in the
// Clinical History dictionary and still marks the case Deficient, not blocked
// (resolveAccessionValidation); this check is the organisation-wide one.
// ─────────────────────────────────────────────────────────────────────────────
import { missingRequiredFields, type ResolvedFieldRequirement } from '../fieldRequirements/fieldRequirementRules';
import type { RecordedClinicalHistoryEntry } from '../../types/clinicalHistory/RecordedClinicalHistoryEntry';

type Entry = Pick<RecordedClinicalHistoryEntry, 'historyCode'>;

export function clinicalHistoryValues(caseEntries: readonly Entry[], specimenEntries: readonly (readonly Entry[])[]): Record<string, unknown> {
  const all = [...caseEntries, ...specimenEntries.flat()];
  return {
    caseEntry: caseEntries.length ? 'set' : '',
    specimenEntry: specimenEntries.map(e => (e.length || (specimenEntries.length === 1 && caseEntries.length) ? 'set' : '')),
    coded: all.every(e => !!e.historyCode) ? 'set' : '',
  };
}

/** The required clinical-history fields with nothing recorded, in catalog order. */
export function missingClinicalHistory(
  requirements: readonly ResolvedFieldRequirement[],
  caseEntries: readonly Entry[],
  specimenEntries: readonly (readonly Entry[])[],
  applies: boolean,
): ResolvedFieldRequirement[] {
  if (!applies) return [];
  return missingRequiredFields(requirements, clinicalHistoryValues(caseEntries, specimenEntries));
}
