// src/services/cytology/mockCytologyWorkloadCapSettingsService.ts
import { ICytologyWorkloadCapSettingsService, CytologyWorkloadCapSettingsConfig, DEFAULT_CYTOLOGY_WORKLOAD_CAP_SETTINGS } from './ICytologyWorkloadCapSettingsService';
import { storageGet, storageSet } from '../mockStorage';
import { ServiceResult } from '../types';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { normaliseDayStartHour } from './screeningHoursRules';
import { CYTOLOGY_WORKLOAD_CAP_OUT_OF_RANGE, cytologyWorkloadCapProblem } from './cytologyWorkloadCapRules';

const STORAGE_KEY = 'cytologyWorkloadCapSettings';

const load    = () => storageGet<CytologyWorkloadCapSettingsConfig>(STORAGE_KEY, DEFAULT_CYTOLOGY_WORKLOAD_CAP_SETTINGS);
const persist = (d: CytologyWorkloadCapSettingsConfig) => storageSet(STORAGE_KEY, d);

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const delay = () => new Promise(r => setTimeout(r, 60));

/**
 * Batch 578 (carried from 576): the service with its clock passed in, so the moment a start-of-day change
 * takes effect (its `effectiveFrom` in the history) can be tested at any time, like the screening-hours
 * service (Batch 576). The app uses the instance below, on the real clock.
 */
export function createMockCytologyWorkloadCapSettingsService(clock: () => Date = () => new Date()): ICytologyWorkloadCapSettingsService {
  let MOCK_CONFIG: CytologyWorkloadCapSettingsConfig = load();
  const cytologyWorkloadCapSettingsServiceUnchecked: ICytologyWorkloadCapSettingsService = {
    async get() {
      await delay();
      return ok({ ...MOCK_CONFIG });
    },
    async update(patch) {
      await delay();
      // Batch 576: a cap is a whole number of slides from 1 to 100.
      if ('dailySlideCap' in patch && cytologyWorkloadCapProblem(patch.dailySlideCap)) return { ok: false, error: CYTOLOGY_WORKLOAD_CAP_OUT_OF_RANGE };
      // Batch 574: an hour outside 0–23 (or not a whole hour) is midnight. A change applies from now on: it is
      // added to the history, so past days keep the start that was in force (never re-dated).
      const { screeningDayStartHistory: _ignored, ...rest } = patch;
      const next: CytologyWorkloadCapSettingsConfig = { ...MOCK_CONFIG, ...rest };
      if ('screeningDayStartHour' in patch) {
        const hour = normaliseDayStartHour(patch.screeningDayStartHour);
        const before = normaliseDayStartHour(MOCK_CONFIG.screeningDayStartHour);
        next.screeningDayStartHour = hour;
        if (hour !== before) next.screeningDayStartHistory = [...(MOCK_CONFIG.screeningDayStartHistory ?? []), { hour, effectiveFrom: clock().toISOString() }];
      }
      MOCK_CONFIG = next;
      persist(MOCK_CONFIG);
      return ok({ ...MOCK_CONFIG });
    },
    async reset() {
      await delay();
      MOCK_CONFIG = { ...DEFAULT_CYTOLOGY_WORKLOAD_CAP_SETTINGS };
      persist(MOCK_CONFIG);
      return ok({ ...MOCK_CONFIG });
    },
  };

  /** Batch 428: every change needs its Configuration capability (guardConfigWrites). */
  return guardConfigWrites(cytologyWorkloadCapSettingsServiceUnchecked, [
    ['config:cytology-workload-cap:manage', ['update', 'reset']],
  ]);
}

export const mockCytologyWorkloadCapSettingsService: ICytologyWorkloadCapSettingsService = createMockCytologyWorkloadCapSettingsService();
