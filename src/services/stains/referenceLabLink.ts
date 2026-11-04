// src/services/stains/referenceLabLink.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 403 (Pete). A molecular/send-out test lists the reference labs approved
// to perform it, and which one is its default, so an add-on order fills the lab
// in and offers only those (utils/addOnOrderOperations.resolveSendOutLabChoices).
// Set in Configuration → Stain Dictionary.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { StainType } from './IStainService';

/** The facilities that can be picked as a reference lab: the active ones with the reference_lab role. */
export function activeReferenceLabs<F extends { roles: readonly string[]; status: string }>(facilities: readonly F[]): F[] {
  return facilities.filter(f => f.roles.includes('reference_lab') && f.status === 'Active');
}

/** The stored link for a test: nothing when no lab is ticked, and the default only if it is one of the ticked labs. */
export function normalizeReferenceLabLink(
  category: StainType['category'], labIds: readonly string[], defaultId: string | undefined,
): Pick<StainType, 'referenceLabFacilityIds' | 'defaultReferenceLabFacilityId'> {
  const ids = [...new Set(labIds.filter(Boolean))];
  if (category !== 'Molecular' || ids.length === 0) return { referenceLabFacilityIds: undefined, defaultReferenceLabFacilityId: undefined };
  return { referenceLabFacilityIds: ids, defaultReferenceLabFacilityId: defaultId && ids.includes(defaultId) ? defaultId : undefined };
}

/** Batch 467: the labs that can run a molecular test in-house — the active facilities with the performing_lab role. */
export function activePerformingLabs<F extends { roles: readonly string[]; status: string }>(facilities: readonly F[]): F[] {
  return facilities.filter(f => f.roles.includes('performing_lab') && f.status === 'Active');
}
/** Batch 467: the stored in-house labs for a test: none unless it is a molecular test with labs ticked. */
export function normalizeInHouseLabs(category: StainType['category'], ids: readonly string[]): Pick<StainType, 'inHouseFacilityIds'> {
  const unique = [...new Set(ids.filter(Boolean))];
  return { inHouseFacilityIds: category === 'Molecular' && unique.length ? unique : undefined };
}
