// src/services/tumorBoard/tumorBoardSessionGrouping.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 494 (PS-359 follow-up — MDT Self-Service Assignment & Batching
// redesign, Pete, Oct 8): "The View: A centralized page/dashboard in
// PathScribe showing upcoming MDT dates as selectable headers, listing all
// unassigned and assigned cases for that session." Pure grouping logic for
// TumorBoardWorkspacePage.tsx's dashboard — kept out of the component and
// the hook per CLAUDE.md rule 2, same as tumorBoardWorkspaceFilters.ts.
//
// Generic over the row shape (`T extends { listing: TumorBoardListing }`)
// rather than importing useTumorBoardWorkspace.ts's own
// TumorBoardWorkspaceRow type — a hook importing from services/ is normal
// in this codebase; a service file reaching back up into hooks/ is not,
// so this stays structurally generic and directly testable with a bare
// `{ listing }` wrapper, no hook/React dependency at all.
// ─────────────────────────────────────────────────────────────────────────────

import type { TumorBoardListing, TumorBoardName } from './ITumorBoardService';
import { isTumorBoardBatchLocked } from './tumorBoardBatchLock';

export interface TumorBoardSessionGroup<T> {
  /** A stable React key for this group. */
  key: string;
  board: TumorBoardName | null;
  /** Unset for the single "Unscheduled" group (listings with no meetingDate yet). */
  meetingDate?: string;
  meetingTime?: string;
  locked: boolean;
  unassignedCount: number;
  rows: T[];
}

/** Groups a page of rows into board+date "sessions" — Pete's own fixed
 *  batches — sorted soonest-first, with every listing that has no
 *  meetingDate yet collected into one trailing "Unscheduled" group (not
 *  locked; nothing to freeze until it has a date). Within a locked/dated
 *  group, `board`/`meetingDate` are always set; `meetingTime` is read off
 *  the first row that has one (sessions are expected to share one slot,
 *  but nothing stops two rows under the same board+date from differing —
 *  real, deliberate, not reconciled here). */
export function groupTumorBoardRowsBySession<T extends { listing: TumorBoardListing }>(
  rows: readonly T[],
  cutoffHours: number,
  now: Date,
  timezone: string,
): TumorBoardSessionGroup<T>[] {
  const scheduled = new Map<string, T[]>();
  const unscheduled: T[] = [];

  for (const row of rows) {
    const { board, meetingDate } = row.listing;
    if (!meetingDate) { unscheduled.push(row); continue; }
    const key = `${board}|${meetingDate}`;
    const existing = scheduled.get(key);
    if (existing) existing.push(row); else scheduled.set(key, [row]);
  }

  const groups: TumorBoardSessionGroup<T>[] = [...scheduled.entries()]
    .map(([key, groupRows]) => {
      const [board, meetingDate] = key.split('|') as [TumorBoardName, string];
      const meetingTime = groupRows.find(r => r.listing.meetingTime)?.listing.meetingTime;
      return {
        key,
        board,
        meetingDate,
        meetingTime,
        locked: isTumorBoardBatchLocked(meetingDate, meetingTime, now, timezone, cutoffHours),
        unassignedCount: groupRows.filter(r => !r.listing.presenterUserId).length,
        rows: groupRows,
      };
    })
    .sort((a, b) => (a.meetingDate ?? '').localeCompare(b.meetingDate ?? '') || (a.board ?? '').localeCompare(b.board ?? ''));

  if (unscheduled.length > 0) {
    groups.push({
      key: 'unscheduled',
      board: null,
      locked: false,
      unassignedCount: unscheduled.filter(r => !r.listing.presenterUserId).length,
      rows: unscheduled,
    });
  }

  return groups;
}
