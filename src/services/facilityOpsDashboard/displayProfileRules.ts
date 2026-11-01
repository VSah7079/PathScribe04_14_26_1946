// src/services/facilityOpsDashboard/displayProfileRules.ts
// Batch 727 (Lab Workflow & Batch spec, Decision 2): the Display Profile's time X. Pure.
export const ADD_ON_AGE_LIMIT_MIN = 15;
export const ADD_ON_AGE_LIMIT_MAX = 1440;

/** Whether X is acceptable: unset (the default applies), or whole minutes from 15 to 1440. */
export function addOnAgeLimitValid(minutes: number | undefined | null): boolean {
  return minutes === undefined || minutes === null || (Number.isInteger(minutes) && minutes >= ADD_ON_AGE_LIMIT_MIN && minutes <= ADD_ON_AGE_LIMIT_MAX);
}

/** Batch 728 (spec Decision 4a): the views that show carriers, where the purpose filter applies. */
export const PURPOSE_FILTER_VIEWS = ['grossing_intake', 'embedding_microtomy', 'staining_ihc', 'sendout_reference', 'station_overview'] as const;

/** Whether the profile shows any view the purpose filter applies to. */
export const showsCarrierViews = (views: readonly string[]): boolean => views.some(v => (PURPOSE_FILTER_VIEWS as readonly string[]).includes(v));

/** The purpose list with one purpose added or removed (none chosen = every purpose). */
export function togglePurposeId(ids: readonly string[] | undefined, id: string): string[] {
  const list = ids ?? [];
  return list.includes(id) ? list.filter(x => x !== id) : [...list, id];
}

/** Batch 729 (spec §7.5): the "not scanned for longer than" time on the Stations view, in minutes. */
export const DEFAULT_STALE_SCAN_MINUTES = 240;
export const STALE_SCAN_MIN = 30;
export const STALE_SCAN_MAX = 10080;

/** Whether the time is acceptable: unset (the default applies), or whole minutes from 30 to 10080 (a week). */
export function staleScanMinutesValid(minutes: number | undefined | null): boolean {
  return minutes === undefined || minutes === null || (Number.isInteger(minutes) && minutes >= STALE_SCAN_MIN && minutes <= STALE_SCAN_MAX);
}
