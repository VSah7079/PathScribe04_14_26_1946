// src/services/cytology/IFacilityCytologyWorkloadCapOverrideService.ts
// Real Tier 2 (facility-level override) — same real shape as
// IFacilityCytologyQcOverrideService.ts (PS-157). Real, per direct
// guidance: "make it universal but configurable at the enterprise,
// facility and staff level" — a facility can set its own default cap,
// which a named individual's own Staff override can still further
// refine. Batch 576: a cap is 1–100 whole slides (CLIA 42 CFR
// 493.1274(d)(2) allows at most 100), so an override can only lower it.
import type { ServiceResult } from '../types';
import type { CytologyWorkloadCapSettingsConfig } from './ICytologyWorkloadCapSettingsService';

export interface FacilityCytologyWorkloadCapOverride {
  id: string;
  facilityId: string;
  overrides: Partial<CytologyWorkloadCapSettingsConfig>;
  createdAt: string;
  updatedAt: string;
}

export interface IFacilityCytologyWorkloadCapOverrideService {
  getForFacility(facilityId: string): Promise<ServiceResult<FacilityCytologyWorkloadCapOverride | null>>;
  /** Batch 574: every facility's override (the worklist counter takes the strictest when no case is open). */
  getAll(): Promise<ServiceResult<FacilityCytologyWorkloadCapOverride[]>>;
  create(facilityId: string, overrides: CytologyWorkloadCapSettingsConfig): Promise<ServiceResult<FacilityCytologyWorkloadCapOverride>>;
  update(facilityId: string, changes: Partial<CytologyWorkloadCapSettingsConfig>): Promise<ServiceResult<FacilityCytologyWorkloadCapOverride>>;
  remove(facilityId: string): Promise<ServiceResult<void>>;
}
