// src/services/tumorBoard/tumorBoardBatchLock.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 494 (PS-359 follow-up — MDT Self-Service Assignment & Batching
// redesign, Pete, Oct 8): "Create Fixed Batches. Once a specific tumor
// board date's case list is 'locked' or cut off (e.g., 48-72 hours prior
// to the conference), the batch of patients becomes a fixed set... A
// system rule should lock the batch at a set interval before the meeting
// time... This freezes the patient list so the clinical team knows the
// scope of what is being discussed."
//
// A real, enforced rule (not just a display label) — mockTumorBoardService
// refuses a create()/update() that would ADD a case to, or MOVE a case
// into/within, an already-locked board+date session (board/meetingDate/
// meetingTime changes). It deliberately does NOT block presenter/status
// changes on an already-locked session — claiming a case close to the
// meeting is exactly when self-assignment is supposed to happen, and a
// locked batch must still be cancellable/presentable right up to and
// after the meeting itself.
//
// Scope decision, disclosed: the cut-off interval (cutoffHours) is ONE
// enterprise-wide number, not a per-facility override like
// tumorBoardRules/'s own auto-flag thresholds. Unlike a margin-distance
// clinical threshold, a board's meeting happens at this organisation
// regardless of which external facility referred the case in — there's no
// real sense in which "when is Thursday's Breast MDT locked" should vary
// by the referring hospital. See ITumorBoardRuleService.ts's own
// TumorBoardBatchSettings for the admin-editable value (Config → System →
// Tumor Board Rules), default 48 hours (Pete's own "e.g., 48-72 hours"
// range, lower bound).
// ─────────────────────────────────────────────────────────────────────────────

import { getFacilityDateTimeUtc } from '../../utils/facilityTime';

/** Pure: is the board+date+time session identified by (meetingDate,
 *  meetingTime) already locked, as of `now`, given this org's configured
 *  cutoffHours? A session with no meetingDate at all (still unscheduled)
 *  is never locked — there's nothing to freeze yet. A meetingTime-less
 *  (date-only) session is treated as locking relative to end-of-day
 *  (23:59 facility-local), the same "all-day" convention used everywhere
 *  else a meeting has a date but no specific time
 *  (notifyTumorBoardAssignment.ts, buildTumorBoardInviteIcs.ts). */
export function isTumorBoardBatchLocked(
  meetingDate: string | undefined,
  meetingTime: string | undefined,
  now: Date,
  timezone: string,
  cutoffHours: number,
): boolean {
  if (!meetingDate) return false;
  const [year, month, day] = meetingDate.split('-').map(Number);
  const [hour, minute] = (meetingTime ?? '23:59').split(':').map(Number);
  const meetingInstant = getFacilityDateTimeUtc(year, month - 1, day, hour, minute, timezone);
  const lockInstant = new Date(meetingInstant.getTime() - cutoffHours * 60 * 60 * 1000);
  return now.getTime() >= lockInstant.getTime();
}
