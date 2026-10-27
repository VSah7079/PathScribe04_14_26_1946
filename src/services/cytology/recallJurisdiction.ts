// src/services/cytology/recallJurisdiction.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 631 (Pete's dev note, Oct 19, 2026). Which jurisdiction's recall rules apply to a case: the PERFORMING laboratory's, the
// lab that actually processes and reports the specimen (it is the one bound by the national programme and registry), not the
// facility that ordered it. Resolved the way the rest of the app resolves a case's performing lab (resolvePerformingLabFacilityId):
// the ordering facility's own performing-lab setting, or itself when it is a performing lab. When no performing lab can be
// found, the answer is undefined and the caller falls back to the institution-wide Jurisdiction setting. Only Australia and
// New Zealand then get the specialised recall (selfCollectedRecall.ts).
// ─────────────────────────────────────────────────────────────────────────────
import type { Jurisdiction } from '@/types/systemConfig';
import { resolvePerformingLabFacilityId, type Facility } from '../facilities/IFacilityService';

type FacilityLike = Pick<Facility, 'id' | 'roles' | 'performingLabFacilityId' | 'jurisdiction'>;

export function performingLabJurisdictionOf(
  orderingFacilityId: string | undefined | null, facilities: readonly FacilityLike[],
): Jurisdiction | undefined {
  if (!orderingFacilityId) return undefined;
  const ordering = facilities.find(f => f.id === orderingFacilityId);
  if (!ordering) return undefined;
  const performingId = resolvePerformingLabFacilityId(ordering as Facility);
  const performing = performingId ? facilities.find(f => f.id === performingId) : undefined;
  return performing?.jurisdiction;
}

/** The jurisdiction to apply: the performing lab's, else the institution-wide setting. */
export function effectiveRecallJurisdiction(performingLab: Jurisdiction | undefined, institution: Jurisdiction | string | undefined): string | undefined {
  return performingLab ?? institution;
}
