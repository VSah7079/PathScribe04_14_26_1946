// src/services/tumorBoardRules/mockTumorBoardRuleService.ts
// Batch 491. The enterprise baseline (fixed 4 rules, one per board) and
// each facility's own override, guarded the same way as
// quality/biopsyResectionCorrelationSettings.ts (guardConfigWrites,
// config:tumor-board-rules:manage).
import type { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import {
  DEFAULT_TUMOR_BOARD_RULES,
  DEFAULT_TUMOR_BOARD_BATCH_SETTINGS,
  type TumorBoardAutoFlagRule,
  type FacilityTumorBoardRuleOverride,
  type TumorBoardRuleChange,
  type TumorBoardBatchSettings,
  type ITumorBoardRuleService,
  type IFacilityTumorBoardRuleOverrideService,
  type ITumorBoardBatchSettingsService,
} from './ITumorBoardRuleService';

const RULES_KEY = 'tumor_board_auto_flag_rules';
const OVERRIDES_KEY = 'facility_tumor_board_rule_overrides';
// Batch 494: the batch-lock cut-off setting — see ITumorBoardRuleService.ts's
// own TumorBoardBatchSettings header comment.
const BATCH_SETTINGS_KEY = 'tumor_board_batch_settings';

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });

const loadRules = (): TumorBoardAutoFlagRule[] => {
  const stored = storageGet<TumorBoardAutoFlagRule[]>(RULES_KEY, []);
  // A rule never added/removed by an admin — only its own fields change —
  // so a stored list always starts from the fixed default set, keeping
  // any admin-edited values already saved for an id that's still there.
  return DEFAULT_TUMOR_BOARD_RULES.map(def => stored.find(r => r.id === def.id) ?? def);
};
const persistRules = (data: TumorBoardAutoFlagRule[]) => storageSet(RULES_KEY, data);
const loadOverrides = () => storageGet<FacilityTumorBoardRuleOverride[]>(OVERRIDES_KEY, []);
const persistOverrides = (data: FacilityTumorBoardRuleOverride[]) => storageSet(OVERRIDES_KEY, data);

function validate(change: TumorBoardRuleChange): string | null {
  if (change.marginThresholdMm !== undefined && !(Number.isFinite(change.marginThresholdMm) && change.marginThresholdMm > 0)) return 'marginThresholdMmInvalid';
  return null;
}

const rulesUnchecked: ITumorBoardRuleService = {
  async getAll() { return ok(loadRules()); },
  async update(id, changes) {
    const problem = validate(changes);
    if (problem) return err<TumorBoardAutoFlagRule>(problem);
    const current = loadRules();
    const idx = current.findIndex(r => r.id === id);
    if (idx === -1) return err<TumorBoardAutoFlagRule>(`Tumor Board auto-flag rule ${id} not found`);
    const updated: TumorBoardAutoFlagRule = {
      ...current[idx],
      ...(changes.marginThresholdMm !== undefined ? { marginThresholdMm: changes.marginThresholdMm } : {}),
      ...(changes.active !== undefined ? { active: changes.active } : {}),
    };
    const next = current.map(r => (r.id === id ? updated : r));
    persistRules(next);
    return ok({ ...updated });
  },
};

const overridesUnchecked: IFacilityTumorBoardRuleOverrideService = {
  async getAll() { return ok(loadOverrides().map(o => ({ ...o }))); },
  async getForFacility(facilityId) { return ok(loadOverrides().filter(o => o.facilityId === facilityId).map(o => ({ ...o }))); },
  async set(facilityId, ruleId, changes) {
    if (!facilityId) return err<FacilityTumorBoardRuleOverride>('facilityRequired');
    if (!loadRules().some(r => r.id === ruleId)) return err<FacilityTumorBoardRuleOverride>(`Tumor Board auto-flag rule ${ruleId} not found`);
    const problem = validate(changes);
    if (problem) return err<FacilityTumorBoardRuleOverride>(problem);
    const records = loadOverrides();
    const now = new Date().toISOString();
    const existing = records.find(o => o.facilityId === facilityId && o.ruleId === ruleId);
    const record: FacilityTumorBoardRuleOverride = existing
      ? { ...existing, ...changes, updatedAt: now }
      : { id: `fac-tbr-${facilityId}-${ruleId}`, facilityId, ruleId, ...changes, updatedAt: now };
    persistOverrides([...records.filter(o => !(o.facilityId === facilityId && o.ruleId === ruleId)), record]);
    return ok({ ...record });
  },
  async remove(facilityId, ruleId) {
    persistOverrides(loadOverrides().filter(o => !(o.facilityId === facilityId && o.ruleId === ruleId)));
    return { ok: true, data: undefined };
  },
};

export const mockTumorBoardRuleService: ITumorBoardRuleService = guardConfigWrites(rulesUnchecked, [
  ['config:tumor-board-rules:manage', ['update']],
]);
export const mockFacilityTumorBoardRuleOverrideService: IFacilityTumorBoardRuleOverrideService = guardConfigWrites(overridesUnchecked, [
  ['config:tumor-board-rules:manage', ['set', 'remove']],
]);

// Batch 494: the batch-lock cut-off setting (one enterprise-wide number —
// see ITumorBoardRuleService.ts's own TumorBoardBatchSettings comment for
// why this doesn't need a facility override the way the rules above do).
function loadBatchSettings(): TumorBoardBatchSettings {
  return storageGet<TumorBoardBatchSettings>(BATCH_SETTINGS_KEY, DEFAULT_TUMOR_BOARD_BATCH_SETTINGS);
}
const persistBatchSettings = (data: TumorBoardBatchSettings) => storageSet(BATCH_SETTINGS_KEY, data);

function validateBatchSettings(change: Partial<TumorBoardBatchSettings>): string | null {
  if (change.cutoffHours !== undefined && !(Number.isFinite(change.cutoffHours) && change.cutoffHours >= 0)) return 'cutoffHoursInvalid';
  return null;
}

const batchSettingsUnchecked: ITumorBoardBatchSettingsService = {
  async get() { return ok(loadBatchSettings()); },
  async update(changes) {
    const problem = validateBatchSettings(changes);
    if (problem) return err<TumorBoardBatchSettings>(problem);
    const updated: TumorBoardBatchSettings = { ...loadBatchSettings(), ...changes };
    persistBatchSettings(updated);
    return ok({ ...updated });
  },
};

export const mockTumorBoardBatchSettingsService: ITumorBoardBatchSettingsService = guardConfigWrites(batchSettingsUnchecked, [
  ['config:tumor-board-rules:manage', ['update']],
]);
