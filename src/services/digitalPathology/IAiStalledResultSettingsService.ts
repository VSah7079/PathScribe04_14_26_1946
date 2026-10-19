// src/services/digitalPathology/IAiStalledResultSettingsService.ts
// Batch 610 (#78). How long an ordered AI screening may go unanswered before it is listed as stalled.
import type { ServiceResult } from '../types';
import type { AiStalledResultSettings } from './aiStalledResultRule';

export interface IAiStalledResultSettingsService {
  get(): Promise<ServiceResult<AiStalledResultSettings>>;
  /** Protected (config:vendor-integrations:manage), the same permission as the AI vendor list. */
  update(changes: Partial<AiStalledResultSettings>): Promise<ServiceResult<AiStalledResultSettings>>;
}
