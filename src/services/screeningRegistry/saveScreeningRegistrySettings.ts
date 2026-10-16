// src/services/screeningRegistry/saveScreeningRegistrySettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 414. Every change to screening registry reporting goes through here:
// the enterprise registry, a facility's own registry, and a registry's code
// mappings and hold rules. Each needs config:screening-registry:manage and is
// audited (which registry a lab reports patients to is a compliance setting).
// Before Batch 414 the settings screen saved to a store sign-out never read.
// ─────────────────────────────────────────────────────────────────────────────

import type { RegistryId } from '../facilities/IRegistrySettingsService';
import type { ScreeningRegistryConfig } from './IScreeningRegistryConfigService';
import { screeningRegistryDefinition } from './screeningRegistryDefinitions';
import { stampCodeMappings, FIRST_TEMPLATE_VERSION } from '../registryGoLive/registryOverlay';
import { latestRegistryTemplateVersion, registryTemplateHistory } from '../registryGoLive/registryTemplateVersions';

export interface ScreeningRegistrySettingsDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  updateEnterprise: (registryId: RegistryId) => Promise<unknown>;
  getFacilityOverride: (facilityId: string) => Promise<{ ok: boolean; data?: any }>;
  createFacilityOverride: (facilityId: string, registryId: RegistryId) => Promise<unknown>;
  updateFacilityOverride: (facilityId: string, registryId: RegistryId) => Promise<unknown>;
  removeFacilityOverride: (facilityId: string) => Promise<unknown>;
  saveConfig: (config: ScreeningRegistryConfig) => Promise<unknown>;
  /** Batch 423: the stored configuration, whose environment a settings save keeps; Batch 424: and whose mapping stamps it compares. */
  getConfig: (registryId: ScreeningRegistryConfig['registryId']) => Promise<ScreeningRegistryConfig | undefined>;
  logAudit: (event: any) => unknown;
  now: () => Date;
}

type Outcome = 'notPermitted' | 'unknownRegistry' | 'saved';
type Actor = { id: string; name: string };

const audit = (deps: ScreeningRegistrySettingsDeps, user: Actor, event: string, detail: string) =>
  deps.logAudit({ type: 'user', event, detail, user: user.name || user.id, caseId: null, confidence: null });

const known = (id: RegistryId) => id === 'none' || !!screeningRegistryDefinition(id);

export async function saveEnterpriseScreeningRegistry(registryId: RegistryId, user: Actor, deps: ScreeningRegistrySettingsDeps): Promise<Outcome> {
  if (!(await deps.enforce('config:screening-registry:manage')).allowed) return 'notPermitted';
  if (!known(registryId)) return 'unknownRegistry';
  await deps.updateEnterprise(registryId);
  audit(deps, user, 'Screening registry changed', `Enterprise screening registry set to ${registryId}`);
  return 'saved';
}

/** A facility's own registry; null removes the override (the facility follows the enterprise). */
export async function saveFacilityScreeningRegistry(facilityId: string, registryId: RegistryId | null, user: Actor, deps: ScreeningRegistrySettingsDeps): Promise<Outcome> {
  if (!(await deps.enforce('config:screening-registry:manage', { facilityId })).allowed) return 'notPermitted';
  if (registryId === null) {
    await deps.removeFacilityOverride(facilityId);
    audit(deps, user, 'Screening registry changed', `Facility ${facilityId} screening registry override removed`);
    return 'saved';
  }
  if (!known(registryId)) return 'unknownRegistry';
  const existing = await deps.getFacilityOverride(facilityId);
  if (existing.ok && existing.data) await deps.updateFacilityOverride(facilityId, registryId);
  else await deps.createFacilityOverride(facilityId, registryId);
  audit(deps, user, 'Screening registry changed', `Facility ${facilityId} screening registry set to ${registryId}`);
  return 'saved';
}

/** A registry's code mappings and hold rules. Blank codes are dropped.
 *  Batch 424: each mapping (and the identifier hold) is stamped with the template version it was
 *  made against, so a release that changes those codes flags it (registryGoLive/registryOverlay.ts).
 *  Batch 423: the environment is not changed here. Going live is approved through
 *  services/registryGoLive/ (pre-checks, test evidence, re-confirmed credentials); this
 *  save keeps whatever environment is stored. */
export async function saveScreeningRegistryConfig(config: ScreeningRegistryConfig, user: Actor, deps: ScreeningRegistrySettingsDeps): Promise<Outcome> {
  if (!(await deps.enforce('config:screening-registry:manage')).allowed) return 'notPermitted';
  if (!screeningRegistryDefinition(config.registryId)) return 'unknownRegistry';
  const codeMappings = config.codeMappings
    .map(m => ({ ...m, code: m.code.trim(), display: m.display?.trim() || undefined }))
    .filter(m => m.code);
  const previous = await deps.getConfig(config.registryId);
  const environment = previous?.environment ?? 'test';
  // Batch 424: each mapping stamped with the template version it was made against; unchanged ones keep theirs.
  const latest = latestRegistryTemplateVersion(registryTemplateHistory('screening', config.registryId), deps.now())?.version ?? FIRST_TEMPLATE_VERSION;
  const stamped = stampCodeMappings(codeMappings, previous?.codeMappings ?? [], latest);
  const identifierHoldBaselineVersion = config.requirePatientIdentifier
    ? (previous?.requirePatientIdentifier ? previous.identifierHoldBaselineVersion ?? FIRST_TEMPLATE_VERSION : latest) : undefined;
  await deps.saveConfig({ ...config, environment, codeMappings: stamped, ...(identifierHoldBaselineVersion ? { identifierHoldBaselineVersion } : {}), updatedAt: deps.now().toISOString(), updatedBy: user.name || user.id });
  audit(deps, user, 'Screening registry configuration changed',
    `${config.registryId}: ${codeMappings.length} code mappings; hold for unmapped codes ${config.requireMappedCodes ? 'on' : 'off'}; hold for patient identifier ${config.requirePatientIdentifier ? 'on' : 'off'}`);
  return 'saved';
}
