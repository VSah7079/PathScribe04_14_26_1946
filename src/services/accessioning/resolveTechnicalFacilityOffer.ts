// src/services/accessioning/resolveTechnicalFacilityOffer.ts
// Batch 618 (PS-336): at accessioning, a case that is read here but whose technical
// work (processing, cutting, staining) was done by another lab records that lab on the
// order as `technicalComponentFacilityId`. This decides when the picker is offered,
// which labs it lists, and what is saved. No picker is shown for an ordinary case,
// so an ordinary accession takes no extra click.

import type { Facility } from '../facilities/IFacilityService';
import { resolvePerformingLabFacilityId } from '../facilities/IFacilityService';

export type AccessionIntakeType = 'standard' | 'downtime' | 'outside';

/** Offered for a consultation (a department whose name says so) and for outside-material intake. */
export function shouldOfferTechnicalFacility(input: { intakeType: AccessionIntakeType; departmentName?: string }): boolean {
  if (input.intakeType === 'outside') return true;
  return /consult/i.test(input.departmentName ?? '');
}

/** Performing labs only: active, not an enterprise parent, with the performing-lab role. */
export function technicalFacilityChoices(facilities: Facility[]): Facility[] {
  return facilities.filter(f => !f.isEnterprise && f.status === 'Active' && (f.roles ?? []).includes('performing_lab'));
}

/** The value saved on the order: empty, unknown, or the same lab that reports the case means "no second facility". */
export function technicalFacilityForOrder(
  selectedId: string,
  orderingFacility: Facility | undefined,
  facilities: Facility[],
): string | undefined {
  if (!selectedId) return undefined;
  const selected = technicalFacilityChoices(facilities).find(f => f.id === selectedId);
  if (!selected) return undefined;
  if (orderingFacility && resolvePerformingLabFacilityId(selected) === resolvePerformingLabFacilityId(orderingFacility)) return undefined;
  return selected.id;
}
