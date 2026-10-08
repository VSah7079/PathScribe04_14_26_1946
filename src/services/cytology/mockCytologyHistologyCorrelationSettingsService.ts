// src/services/cytology/mockCytologyHistologyCorrelationSettingsService.ts
// Batch 452 (PS-156): the enterprise correlation-window settings and the
// per-facility overrides. Both refuse an invalid rule
// (validateCorrelationRule) and check their capability before any change
// (guardConfigWrites, audited).
// Batch 453: built by createCorrelationSettingsServices, so the surgical
// biopsy-to-resection window (services/quality/biopsyResectionCorrelationSettings.ts)
// is configured the same way, with its own storage and capability.
import {
  DEFAULT_CYTOLOGY_HISTOLOGY_CORRELATION_SETTINGS,
  type CytologyHistologyCorrelationSettingsConfig, type FacilityCytologyHistologyCorrelationOverride,
  type ICytologyHistologyCorrelationSettingsService, type IFacilityCytologyHistologyCorrelationOverrideService,
} from './ICytologyHistologyCorrelationSettingsService';
import { validateCorrelationRule } from './cytologyHistologyCorrelationWindow';
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const copy = (c: CytologyHistologyCorrelationSettingsConfig): CytologyHistologyCorrelationSettingsConfig =>
  ({ ...c, jurisdictionRules: Object.fromEntries(Object.entries(c.jurisdictionRules ?? {}).map(([k, v]) => [k, { ...v }])) });
const loadSettingsFrom = (SETTINGS_KEY: string) => copy({ ...DEFAULT_CYTOLOGY_HISTOLOGY_CORRELATION_SETTINGS, ...storageGet<Partial<CytologyHistologyCorrelationSettingsConfig>>(SETTINGS_KEY, {}) });
const loadOverridesFrom = (OVERRIDES_KEY: string) => storageGet<FacilityCytologyHistologyCorrelationOverride[]>(OVERRIDES_KEY, []);

/** The first problem with a settings patch, or null. */
function settingsProblem(next: CytologyHistologyCorrelationSettingsConfig): string | null {
  const own = validateCorrelationRule(next);
  if (own.length) return own[0];
  for (const rule of Object.values(next.jurisdictionRules)) {
    const problems = validateCorrelationRule(rule);
    if (problems.length) return problems[0];
  }
  return null;
}

/** The two services, unchecked; each caller wraps them with guardConfigWrites
 *  and its own capability (the capability guard test reads those calls). */
export function createCorrelationSettingsServices(opts: { settingsKey: string; overridesKey: string }): {
  settings: ICytologyHistologyCorrelationSettingsService;
  overrides: IFacilityCytologyHistologyCorrelationOverrideService;
} {
  const SETTINGS_KEY = opts.settingsKey;
  const OVERRIDES_KEY = opts.overridesKey;
  const loadSettings = () => loadSettingsFrom(SETTINGS_KEY);
  const loadOverrides = () => loadOverridesFrom(OVERRIDES_KEY);
  const settingsUnchecked: ICytologyHistologyCorrelationSettingsService = {
    async get() { return ok(loadSettings()); },
    async update(patch) {
      const next = copy({ ...loadSettings(), ...patch });
      const problem = settingsProblem(next);
      if (problem) return err(problem);
      storageSet(SETTINGS_KEY, next);
      return ok(copy(next));
    },
    async reset() {
      storageSet(SETTINGS_KEY, DEFAULT_CYTOLOGY_HISTOLOGY_CORRELATION_SETTINGS);
      return ok(copy(DEFAULT_CYTOLOGY_HISTOLOGY_CORRELATION_SETTINGS));
    },
  };

  const overridesUnchecked: IFacilityCytologyHistologyCorrelationOverrideService = {
    async getAll() { return ok(loadOverrides().map(o => ({ ...o, overrides: { ...o.overrides } }))); },
    async getForFacility(facilityId) {
      const found = loadOverrides().find(o => o.facilityId === facilityId);
      return ok(found ? { ...found, overrides: { ...found.overrides } } : null);
    },
    async set(facilityId, overrides) {
      if (!facilityId) return err('facilityRequired');
      const problems = validateCorrelationRule(overrides);
      if (problems.length) return err(problems[0]);
      const records = loadOverrides();
      const now = new Date().toISOString();
      const existing = records.find(o => o.facilityId === facilityId);
      const record: FacilityCytologyHistologyCorrelationOverride = existing
        ? { ...existing, overrides: { ...overrides }, updatedAt: now }
        : { id: `fac-corr-${facilityId}`, facilityId, overrides: { ...overrides }, createdAt: now, updatedAt: now };
      storageSet(OVERRIDES_KEY, [...records.filter(o => o.facilityId !== facilityId), record]);
      return ok({ ...record, overrides: { ...record.overrides } });
    },
    async remove(facilityId) {
      storageSet(OVERRIDES_KEY, loadOverrides().filter(o => o.facilityId !== facilityId));
      return { ok: true, data: undefined };
    },
  };

  return { settings: settingsUnchecked, overrides: overridesUnchecked };
}

const cytology = createCorrelationSettingsServices({
  settingsKey: 'cytologyHistologyCorrelationSettings',
  overridesKey: 'facilityCytologyHistologyCorrelationOverrides',
});
export const mockCytologyHistologyCorrelationSettingsService: ICytologyHistologyCorrelationSettingsService = guardConfigWrites(cytology.settings, [
  ['config:cytology-histology-correlation:manage', ['update', 'reset']],
]);
export const mockFacilityCytologyHistologyCorrelationOverrideService: IFacilityCytologyHistologyCorrelationOverrideService = guardConfigWrites(cytology.overrides, [
  ['config:cytology-histology-correlation:manage', ['set', 'remove']],
]);
