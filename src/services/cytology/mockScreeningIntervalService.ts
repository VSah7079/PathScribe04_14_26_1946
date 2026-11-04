// src/services/cytology/mockScreeningIntervalService.ts
// Batch 608 (#52): the demo's screening interval table, kept in browser storage.
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import type { IScreeningIntervalService } from './IScreeningIntervalService';
import { DEFAULT_SCREENING_INTERVALS, type ScreeningIntervalRule } from './screeningIntervals';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { mockAuditService } from '../auditlog/mockAuditService';

const KEY = 'cytology_screening_intervals_v1';
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

/** A rule is usable when its age band and interval make sense. */
function validRule(r: ScreeningIntervalRule): boolean {
  return !!r.countryCode.trim() && Number.isFinite(r.minAge) && Number.isFinite(r.maxAge) && r.minAge >= 0 && r.maxAge >= r.minAge
    && Number.isFinite(r.intervalMonths) && r.intervalMonths > 0;
}

const unchecked: IScreeningIntervalService = {
  async get() {
    return ok(storageGet<ScreeningIntervalRule[]>(KEY, DEFAULT_SCREENING_INTERVALS).map(r => ({ ...r })));
  },
  async save(rules) {
    if (!rules.every(validRule)) return { ok: false, error: 'invalidRule' };
    storageSet(KEY, rules);
    await mockAuditService.logEvent({
      type: 'system', event: 'Screening Intervals Updated', detail: `Screening interval table saved (${rules.length} rules).`,
      user: 'system', caseId: null, confidence: null,
    }).catch(() => {});
    return ok(rules.map(r => ({ ...r })));
  },
};

export const mockScreeningIntervalService: IScreeningIntervalService = guardConfigWrites(unchecked, [
  ['config:cytology-compliance:manage', ['save']],
]);
