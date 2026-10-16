// src/services/engravers/engraverStatusCounts.ts
// Batch 560: how many engravers are in each status, for the Engraver Monitor's summary (moved out of the
// page, CLAUDE.md rule 2). An unknown status isn't counted.
import type { EngraverStatus } from '@/types/events/EngraverStatusEventPayload';

export const ENGRAVER_STATUSES: readonly EngraverStatus[] = ['online', 'engraving', 'warning', 'fault', 'offline'];

export function engraverStatusCounts(devices: readonly { status: EngraverStatus }[]): Record<EngraverStatus, number> {
  const counts = Object.fromEntries(ENGRAVER_STATUSES.map(s => [s, 0])) as Record<EngraverStatus, number>;
  for (const d of devices) if (d.status in counts) counts[d.status] += 1;
  return counts;
}
