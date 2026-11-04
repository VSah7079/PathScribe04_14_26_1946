// src/services/cytology/ICytologyComplianceFeaturesService.ts
// Batch 617 (PS-514): the interface of the cytology compliance features
// settings service (the mock's own shape, written down so the API server's
// version can match it). Changes go through saveCytologyComplianceFeatures.ts
// (permission and audit).
import type { CytologyComplianceSettings } from './cytologyComplianceFeatures';

export interface CytologyComplianceFeaturesStored {
  enterprise: CytologyComplianceSettings;
  facilities: Record<string, CytologyComplianceSettings>;
}

export interface ICytologyComplianceFeaturesService {
  get(): Promise<{ ok: true; data: CytologyComplianceFeaturesStored }>;
  forFacility(facilityId: string | undefined): Promise<{ enterprise: CytologyComplianceSettings; facility: CytologyComplianceSettings | null }>;
  setEnterprise(settings: CytologyComplianceSettings): Promise<void>;
  /** null removes the facility's own settings (it follows the enterprise). */
  setFacility(facilityId: string, settings: CytologyComplianceSettings | null): Promise<void>;
}
