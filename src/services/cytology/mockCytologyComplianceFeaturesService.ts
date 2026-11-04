// src/services/cytology/mockCytologyComplianceFeaturesService.ts
// Batch 415: the enterprise and per-facility settings for the cytology
// compliance features (cytologyComplianceFeatures.ts). Changes go through
// saveCytologyComplianceFeatures.ts (permission and audit).
import type { CytologyComplianceSettings } from './cytologyComplianceFeatures';
import { storageGet, storageSet } from '../mockStorage';

const STORAGE_KEY = 'cytologyComplianceFeatures';
interface Stored { enterprise: CytologyComplianceSettings; facilities: Record<string, CytologyComplianceSettings> }
const load = () => storageGet<Stored>(STORAGE_KEY, { enterprise: {}, facilities: {} });

export const mockCytologyComplianceFeaturesService = {
  async get(): Promise<{ ok: true; data: Stored }> { return { ok: true, data: load() }; },
  async forFacility(facilityId: string | undefined): Promise<{ enterprise: CytologyComplianceSettings; facility: CytologyComplianceSettings | null }> {
    const s = load();
    return { enterprise: s.enterprise, facility: facilityId ? s.facilities[facilityId] ?? null : null };
  },
  async setEnterprise(settings: CytologyComplianceSettings) {
    const s = load(); storageSet(STORAGE_KEY, { ...s, enterprise: settings });
  },
  /** null removes the facility's own settings (it follows the enterprise). */
  async setFacility(facilityId: string, settings: CytologyComplianceSettings | null) {
    const s = load();
    const facilities = { ...s.facilities };
    if (settings) facilities[facilityId] = settings; else delete facilities[facilityId];
    storageSet(STORAGE_KEY, { ...s, facilities });
  },
};
