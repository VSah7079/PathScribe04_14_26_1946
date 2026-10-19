// src/services/digitalPathology/aiStalledResultRule.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#78). The stalled-AI-result rule: an AI screening that was ordered
// and has had no answer for longer than the lab's timeout is "stalled". Pure.
// The lab sets the timeout (default 24 hours, as resolveAiScreeningTimeoutStatus
// always assumed); this module never changes a result's status, it only names
// the ones that need someone's attention.
// ─────────────────────────────────────────────────────────────────────────────
import type { AiScreeningResult } from '@/types/digitalPathology/AiScreeningResult';
import { resolveAiScreeningTimeoutStatus } from './resolveAiScreeningTimeoutStatus';

export const AI_STALLED_TIMEOUT_DEFAULT_HOURS = 24;
export const AI_STALLED_TIMEOUT_MIN_HOURS = 1;
export const AI_STALLED_TIMEOUT_MAX_HOURS = 720;

export interface AiStalledResultSettings { timeoutHours: number }

/** An error key for the screen, or null when the timeout is acceptable (whole hours, 1 to 720). */
export function validateAiStalledTimeoutHours(hours: number): string | null {
  return Number.isInteger(hours) && hours >= AI_STALLED_TIMEOUT_MIN_HOURS && hours <= AI_STALLED_TIMEOUT_MAX_HOURS
    ? null
    : 'timeoutHoursInvalid';
}

export interface StalledAiResult {
  result: AiScreeningResult;
  /** Whole hours since the screening was ordered, rounded down. */
  hoursWaiting: number;
}

/** Ordered results past the timeout, the longest-waiting first. */
export function resolveStalledAiResults(
  results: readonly AiScreeningResult[],
  now: Date,
  timeoutHours: number = AI_STALLED_TIMEOUT_DEFAULT_HOURS,
): StalledAiResult[] {
  return resolveAiScreeningTimeoutStatus([...results], now, timeoutHours)
    .map(result => ({ result, hoursWaiting: Math.floor((now.getTime() - new Date(result.orderedAt).getTime()) / 3_600_000) }))
    .sort((a, b) => b.hoursWaiting - a.hoursWaiting);
}
