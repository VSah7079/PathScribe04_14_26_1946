// src/services/tumorBoard/tumorBoardWorkspaceFilters.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 489 (Module 1 of Pete's Tumor Board / MDT Workspace spec). Pure
// filter/sort logic for the workspace page — kept out of the component per
// CLAUDE.md rule 2 ("no business logic in components"). Mirrors the light
// calculation-local-types convention used elsewhere (benchContributionCalculations.ts):
// this file only reads TumorBoardListing itself, so it imports the real type
// rather than redefining a narrower one.
// ─────────────────────────────────────────────────────────────────────────────

import type { TumorBoardListing, TumorBoardListingFilter, TumorBoardName, TumorBoardCaseStatus } from './ITumorBoardService';
import { getFacilityIsoDate } from '../../utils/facilityTime';

/** The workspace's own "Meeting Window" presets — resolved to a concrete
 *  [from, to] ISO-date range (facility-timezone-aware) before being passed
 *  to tumorBoardService.list()'s own meetingDateFrom/meetingDateTo. */
export const MEETING_WINDOWS = ['today', 'thisWeek', 'thisMonth', 'all'] as const;
export type MeetingWindow = typeof MEETING_WINDOWS[number];

export interface TumorBoardWorkspaceFilterState {
  board: TumorBoardName | 'all';
  status: TumorBoardCaseStatus | 'all';
  presenterUserId: string | 'all';
  meetingWindow: MeetingWindow;
  /** Column to sort by: meeting date (soonest first) or most recently updated. */
  sortBy: 'meetingDate' | 'updatedAt';
}

/** Pete's own spec default: Case Status defaults to 'Pending Presentation'. */
export const DEFAULT_WORKSPACE_FILTERS: TumorBoardWorkspaceFilterState = {
  board: 'all',
  status: 'Pending Presentation',
  presenterUserId: 'all',
  meetingWindow: 'all',
  sortBy: 'meetingDate',
};

/** Resolves a MeetingWindow preset into a concrete, facility-timezone-aware
 *  [from, to] ISO-date range for tumorBoardService.list()'s own filter.
 *  'all' resolves to {} (no date constraint). */
export function resolveMeetingWindow(window: MeetingWindow, now: Date, timezone: string): Pick<TumorBoardListingFilter, 'meetingDateFrom' | 'meetingDateTo'> {
  if (window === 'all') return {};
  const todayIso = getFacilityIsoDate(now, timezone);
  if (window === 'today') return { meetingDateFrom: todayIso, meetingDateTo: todayIso };

  if (window === 'thisWeek') {
    const start = new Date(now);
    // Facility-local day-of-week: compute from the already-resolved iso date's own Date object is
    // enough for a 7-day forward window — this is a "next 7 days" rolling window, not a calendar week,
    // which is the simpler, less surprising behavior for "what's coming up."
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return { meetingDateFrom: todayIso, meetingDateTo: getFacilityIsoDate(end, timezone) };
  }

  // thisMonth: next 30 days, rolling, same rolling-window reasoning as thisWeek.
  const end = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000);
  return { meetingDateFrom: todayIso, meetingDateTo: getFacilityIsoDate(end, timezone) };
}

/** Builds the service-level filter from the workspace's own UI filter state. */
export function toServiceFilter(state: TumorBoardWorkspaceFilterState, now: Date, timezone: string): TumorBoardListingFilter {
  return {
    ...(state.board !== 'all' ? { board: state.board } : {}),
    ...(state.status !== 'all' ? { status: state.status } : {}),
    ...(state.presenterUserId !== 'all' ? { presenterUserId: state.presenterUserId } : {}),
    ...resolveMeetingWindow(state.meetingWindow, now, timezone),
  };
}

/** Sorts a page of listings for display. Unscheduled (no meetingDate) listings sort last under 'meetingDate'. */
export function sortListings(listings: readonly TumorBoardListing[], sortBy: TumorBoardWorkspaceFilterState['sortBy']): TumorBoardListing[] {
  const copy = [...listings];
  if (sortBy === 'updatedAt') {
    return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return copy.sort((a, b) => {
    if (!a.meetingDate && !b.meetingDate) return b.updatedAt.localeCompare(a.updatedAt);
    if (!a.meetingDate) return 1;
    if (!b.meetingDate) return -1;
    return a.meetingDate.localeCompare(b.meetingDate);
  });
}
