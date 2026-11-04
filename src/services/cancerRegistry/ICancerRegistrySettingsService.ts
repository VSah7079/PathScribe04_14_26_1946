// src/services/cancerRegistry/ICancerRegistrySettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the RFP-APLIS-2026-GLOBAL Broader Cancer Registry Exports
// gap — same real, established two-tier cascade shape as
// services/facilities/IRegistrySettingsService.ts (the screening-
// registry settings), genuinely a sibling, not an extension: that
// file's own header explicitly defers "general cancer registries
// (SEER/NPCR, NCRI, GEKID, INCa, BCR, NZCR) — a real, distinct class
// from the screening-programme registries above" — this is that real,
// distinct class, finally built. A facility's own registry
// obligation is a real, facility-level fact, same reasoning as the
// screening-registry settings.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { CancerRegistryDefinitionId } from './cancerRegistryDefinitions';

/** Real, named central cancer registries this gap asks for, per
 *  jurisdiction. 'none' is the real, correct default for a facility
 *  with no centralized cancer-registry reporting obligation captured
 *  here yet. */
/* Batch 422: the list is cancerRegistryDefinitions.ts (13 registries, five added: NCRI Ireland,
 * PHS Scotland, NICR Northern Ireland, NKR Netherlands, BCR Belgium). */
export type CancerRegistryId = 'none' | CancerRegistryDefinitionId;

export interface CancerRegistrySettingsConfig {
  registryId: CancerRegistryId;
  /** Batch 418 (SRS v2.1 FR-008.1): cancer registry reporting is statutory and ignores a patient's
   *  opt-out, unless the lab's jurisdiction grants one; then this is true and an opted-out
   *  patient's report is excluded. Default false. No Configuration screen for it yet. */
  honoursPatientOptOut?: boolean;
  /** Batch 419 (SRS v2.1 FR-008.8): the registry's test or live system. Batch 424: no longer read; the
   *  instance decides (services/deployment/), and each registry's go-live is its own record, so one
   *  cancer registry going live no longer switches the others. Kept so stored settings still load. */
  environment?: 'test' | 'production';
}

export const DEFAULT_CANCER_REGISTRY_SETTINGS: CancerRegistrySettingsConfig = {
  registryId: 'none',
};

export interface ICancerRegistrySettingsService {
  get(): Promise<ServiceResult<CancerRegistrySettingsConfig>>;
  update(patch: Partial<CancerRegistrySettingsConfig>): Promise<ServiceResult<CancerRegistrySettingsConfig>>;
  reset(): Promise<ServiceResult<CancerRegistrySettingsConfig>>;
}
