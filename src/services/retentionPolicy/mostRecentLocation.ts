// src/services/retentionPolicy/mostRecentLocation.ts
// Batch 669 (finding batch-4): ONE rule for "where was this item last seen".
// The Disposal Queue, the Disposal Report and the scan-to-dispose check all use it,
// so they can no longer disagree after a late-entered or backfilled location event.
// The rule: the entry with the latest `at` time; on a tie, the entry recorded later in the list.
import type { MaterialLocation } from '@/types/case/Material';

export function mostRecentLocation(history: readonly MaterialLocation[] | undefined): MaterialLocation | undefined {
  if (!history || history.length === 0) return undefined;
  let best: MaterialLocation | undefined;
  let bestTime = -Infinity;
  for (const entry of history) {
    const time = new Date(entry.at).getTime();
    const t = Number.isNaN(time) ? -Infinity : time;
    if (best === undefined || t >= bestTime) { best = entry; bestTime = t; }
  }
  return best;
}
