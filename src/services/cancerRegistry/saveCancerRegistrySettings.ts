// src/services/cancerRegistry/saveCancerRegistrySettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 422. Every change to cancer registry reporting goes through here: the
// enterprise registry with its environment (test / production, Batch 419) and
// whether the jurisdiction honours a patient's opt-out (Batch 418), and a
// facility's own registry. Each needs config:cancer-registry:manage and is
// audited. Before Batch 422 the Configuration screen saved straight to the
// stores with no permission check and no audit.
// ─────────────────────────────────────────────────────────────────────────────

import type { CancerRegistryId, CancerRegistrySettingsConfig } from './ICancerRegistrySettingsService';
import { cancerRegistryDefinition } from './cancerRegistryDefinitions';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CancerRegistrySettingsDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  updateEnterprise: (patch: Partial<CancerRegistrySettingsConfig>) => Promise<unknown>;
  getFacilityOverride: (facilityId: string) => Promise<{ ok: boolean; data?: any }>;
  createFacilityOverride: (facilityId: string, registryId: CancerRegistryId) => Promise<unknown>;
  updateFacilityOverride: (facilityId: string, registryId: CancerRegistryId) => Promise<unknown>;
  removeFacilityOverride: (facilityId: string) => Promise<unknown>;
  logAudit: (event: any) => unknown;
}

type Outcome = 'notPermitted' | 'unknownRegistry' | 'saved';
type Actor = { id: string; name: string };

const known = (id: CancerRegistryId) => id === 'none' || !!cancerRegistryDefinition(id);
const audit = (deps: CancerRegistrySettingsDeps, user: Actor, detail: string) =>
  deps.logAudit({ type: 'user', event: 'Cancer registry changed', detail, user: user.name || user.id, caseId: null, confidence: null });

/** Batch 423: the environment is not changed here; going live is approved through
 *  services/registryGoLive/, and this save keeps the stored environment. */
export async function saveEnterpriseCancerRegistry(settings: CancerRegistrySettingsConfig, user: Actor, deps: CancerRegistrySettingsDeps): Promise<Outcome> {
  if (!(await deps.enforce('config:cancer-registry:manage')).allowed) return 'notPermitted';
  if (!known(settings.registryId)) return 'unknownRegistry';
  const honoursPatientOptOut = !!settings.honoursPatientOptOut;
  await deps.updateEnterprise({ registryId: settings.registryId, honoursPatientOptOut });
  audit(deps, user, `Enterprise cancer registry set to ${settings.registryId}; patient opt-out ${honoursPatientOptOut ? 'honoured (legal exception)' : 'overridden by statute'}`);
  return 'saved';
}

/** A facility's own registry; null removes the override (the facility follows the enterprise). */
export async function saveFacilityCancerRegistry(facilityId: string, registryId: CancerRegistryId | null, user: Actor, deps: CancerRegistrySettingsDeps): Promise<Outcome> {
  if (!(await deps.enforce('config:cancer-registry:manage', { facilityId })).allowed) return 'notPermitted';
  if (registryId === null) {
    await deps.removeFacilityOverride(facilityId);
    audit(deps, user, `Facility ${facilityId} cancer registry override removed`);
    return 'saved';
  }
  if (!known(registryId)) return 'unknownRegistry';
  const existing = await deps.getFacilityOverride(facilityId);
  if (existing.ok && existing.data) await deps.updateFacilityOverride(facilityId, registryId);
  else await deps.createFacilityOverride(facilityId, registryId);
  audit(deps, user, `Facility ${facilityId} cancer registry set to ${registryId}`);
  return 'saved';
}
