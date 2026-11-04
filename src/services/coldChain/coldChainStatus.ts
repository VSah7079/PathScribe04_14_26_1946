// src/services/coldChain/coldChainStatus.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (queue entries #17 and #123): what the storage unit and container
// views show for one asset, worked out from its readings. Pure.
//   • status 'none'      no reading yet
//   • status 'ok'        the latest reading was within range
//   • status 'excursion' the latest reading was an excursion
// A reading's own isExcursion flag is used as recorded; it is never recomputed,
// so editing a condition type later does not rewrite history.
// ─────────────────────────────────────────────────────────────────────────────

import type { TelemetryReading } from './ITelemetryReadingService';

export type AssetColdChainStatus = 'none' | 'ok' | 'excursion';

export interface AssetReadingSummary {
  status: AssetColdChainStatus;
  latest?: TelemetryReading;
  readingCount: number;
  excursionCount: number;
}

export function summariseReadings(readings: readonly TelemetryReading[]): AssetReadingSummary {
  if (readings.length === 0) return { status: 'none', readingCount: 0, excursionCount: 0 };
  const latest = readings.reduce((a, b) => (b.recordedAt >= a.recordedAt ? b : a));
  return {
    status: latest.isExcursion ? 'excursion' : 'ok',
    latest,
    readingCount: readings.length,
    excursionCount: readings.filter(r => r.isExcursion).length,
  };
}

/** Readings newest first, capped for a list. */
export function recentReadings(readings: readonly TelemetryReading[], limit = 10): TelemetryReading[] {
  return [...readings].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1)).slice(0, limit);
}
