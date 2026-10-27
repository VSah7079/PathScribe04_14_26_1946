// src/services/cytology/selfCollectedRecallFulfilment.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 631. A self-collected case sits under Recall needed until the patient comes back. When the clinician-collected cervical
// sample (or, for an Invalid result, a repeat collection) arrives as a LATER case for the same patient, the recall is done and
// the earlier case leaves the tile. Worked out each time the worklist loads, so nothing is stored that could go stale.
//
// Matching is by patient and by the later case's creation time only. The register will supply its own identifiers; until then a
// clinician sample sent for a different reason would also close the recall. That is stated in docs/architecture/HPV_RESULT_INBOUND.md.
// ─────────────────────────────────────────────────────────────────────────────
import type { SpecimenEntry } from '../specimenDictionary/specimenTypes';
import type { RecallKind } from './selfCollectedRecall';

interface CaseLike {
  id: string;
  createdAt?: string;
  patient?: { id?: string; mrn?: string } | null;
  specimens?: readonly { specimenDictionaryEntryId?: string }[] | null;
}
type EntryLike = Pick<SpecimenEntry, 'id' | 'specimenCategory' | 'isSelfCollected'>;

function samePatient(a: CaseLike, b: CaseLike): boolean {
  if (a.patient?.id && b.patient?.id) return a.patient.id === b.patient.id;
  return !!a.patient?.mrn && a.patient.mrn === b.patient?.mrn;
}

export function recallIsFulfilled(recallCase: CaseLike, kind: RecallKind, allCases: readonly CaseLike[], dictionary: readonly EntryLike[]): boolean {
  const since = Date.parse(recallCase.createdAt ?? '');
  if (Number.isNaN(since)) return false;
  const byId = new Map(dictionary.map(e => [e.id, e]));
  return allCases.some(other => {
    if (other.id === recallCase.id || !samePatient(recallCase, other)) return false;
    const at = Date.parse(other.createdAt ?? '');
    if (Number.isNaN(at) || at <= since) return false;
    return (other.specimens ?? []).some(sp => {
      const entry = sp.specimenDictionaryEntryId ? byId.get(sp.specimenDictionaryEntryId) : undefined;
      if (!entry || entry.specimenCategory !== 'GYN_CYTOLOGY') return false;
      return kind === 'clinician_lbc' ? entry.isSelfCollected !== true : true;
    });
  });
}
