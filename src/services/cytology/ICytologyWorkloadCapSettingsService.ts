// src/services/cytology/ICytologyWorkloadCapSettingsService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own CLIA workload specification:
// "Individual Cap (C_user) = Default 100, or lower (e.g., 80) if
// assigned by Medical Director." Real, two-tier cascade — Enterprise
// default + a real, per-staff-member override, mirroring
// IStaffCytologyQcOverrideService.ts's own established shape exactly,
// since this is the same real kind of decision (a named individual's
// own, real, assigned limit) that setting's cascade already models.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';

export interface CytologyWorkloadCapSettingsConfig {
  dailySlideCap: number;
  /**
   * Batch 574 (Pete, Oct 15, 2026): the hour (0–23, each facility's own local time) a screening day starts,
   * for the end-of-day hours sign-off and the workload report's days. 0 = midnight; 6 puts a 10 pm–6 am night
   * shift on one date. The workload limit itself is over a rolling 24 hours and doesn't use it.
   */
  screeningDayStartHour?: number;
  /**
   * Batch 574 (review): every change of the start hour, oldest first, so past days keep the start in force at
   * the time (changing it never moves past screening to another day). Before the first entry: midnight.
   */
  screeningDayStartHistory?: ScreeningDayStartChange[];
}

export interface ScreeningDayStartChange {
  hour: number;
  /** ISO 8601: screening from this instant uses `hour`. */
  effectiveFrom: string;
}

export const DEFAULT_CYTOLOGY_WORKLOAD_CAP_SETTINGS: CytologyWorkloadCapSettingsConfig = {
  dailySlideCap: 100,
  screeningDayStartHour: 0,
};

export interface ICytologyWorkloadCapSettingsService {
  get(): Promise<ServiceResult<CytologyWorkloadCapSettingsConfig>>;
  update(patch: Partial<CytologyWorkloadCapSettingsConfig>): Promise<ServiceResult<CytologyWorkloadCapSettingsConfig>>;
  reset(): Promise<ServiceResult<CytologyWorkloadCapSettingsConfig>>;
}
