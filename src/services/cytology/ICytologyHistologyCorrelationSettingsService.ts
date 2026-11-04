// src/services/cytology/ICytologyHistologyCorrelationSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452 (PS-156, Pete Oct 4 2026): how long after an abnormal Pap a
// later biopsy is looked for as a cyto-histologic correlation candidate, and
// which date that window starts from. Until now both were fixed in code: 180
// days, starting at cytology sign-out. Pete: "the clinical clock for patient
// risk starts the moment the abnormal cells are harvested from the patient",
// so a sign-out anchor shortened the window by however long the Pap waited
// in transit or in the queue, and biopsies inside the clinical window were
// missed. The default is now 180 days from collection, and both values are
// configuration:
//
//   1. enterprise default (windowDays, anchor);
//   2. a rule per regulatory region (jurisdictionRules, keyed by the
//      facility's jurisdiction code), for provincial, state or national
//      mandates that differ;
//   3. a facility override (any field), for a lab's own policy.
//
// The resolver is cytologyHistologyCorrelationWindow.ts. Changing either is
// a configuration change: config:cytology-histology-correlation:manage.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';

/** Which date the window is measured from. 'collection' is the specimen's
 *  collection date, 'receipt' when it reached the lab, 'signOut' the
 *  cytology sign-out (the old behaviour, kept as a choice). */
export type CorrelationWindowAnchor = 'collection' | 'receipt' | 'signOut';

export const CORRELATION_WINDOW_ANCHORS: readonly CorrelationWindowAnchor[] = ['collection', 'receipt', 'signOut'];

export interface CytologyHistologyCorrelationRule {
  windowDays: number;
  anchor: CorrelationWindowAnchor;
}

export interface CytologyHistologyCorrelationSettingsConfig extends CytologyHistologyCorrelationRule {
  /** A rule per jurisdiction code (types/systemConfig.ts Jurisdiction). */
  jurisdictionRules: Record<string, CytologyHistologyCorrelationRule>;
}

export const DEFAULT_CYTOLOGY_HISTOLOGY_CORRELATION_SETTINGS: CytologyHistologyCorrelationSettingsConfig = {
  windowDays: 180,
  anchor: 'collection',
  jurisdictionRules: {},
};

/** Longest window accepted (five years); anything beyond is almost
 *  certainly a typing slip. */
export const MAX_CORRELATION_WINDOW_DAYS = 1825;

export interface ICytologyHistologyCorrelationSettingsService {
  get(): Promise<ServiceResult<CytologyHistologyCorrelationSettingsConfig>>;
  update(patch: Partial<CytologyHistologyCorrelationSettingsConfig>): Promise<ServiceResult<CytologyHistologyCorrelationSettingsConfig>>;
  reset(): Promise<ServiceResult<CytologyHistologyCorrelationSettingsConfig>>;
}

export interface FacilityCytologyHistologyCorrelationOverride {
  id: string;
  facilityId: string;
  overrides: Partial<CytologyHistologyCorrelationRule>;
  createdAt: string;
  updatedAt: string;
}

export interface IFacilityCytologyHistologyCorrelationOverrideService {
  getAll(): Promise<ServiceResult<FacilityCytologyHistologyCorrelationOverride[]>>;
  getForFacility(facilityId: string): Promise<ServiceResult<FacilityCytologyHistologyCorrelationOverride | null>>;
  /** Creates the facility's override, or replaces it. */
  set(facilityId: string, overrides: Partial<CytologyHistologyCorrelationRule>): Promise<ServiceResult<FacilityCytologyHistologyCorrelationOverride>>;
  remove(facilityId: string): Promise<ServiceResult<void>>;
}
