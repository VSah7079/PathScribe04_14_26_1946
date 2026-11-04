// src/services/cytology/IScreeningIntervalService.ts
// Batch 608 (#52): the per-country, per-age screening interval table (see screeningIntervals.ts).
import type { ServiceResult } from '../types';
import type { ScreeningIntervalRule } from './screeningIntervals';

export interface IScreeningIntervalService {
  get(): Promise<ServiceResult<ScreeningIntervalRule[]>>;
  /** Replaces the table. Needs config:cytology-compliance:manage; audited. */
  save(rules: ScreeningIntervalRule[]): Promise<ServiceResult<ScreeningIntervalRule[]>>;
}
