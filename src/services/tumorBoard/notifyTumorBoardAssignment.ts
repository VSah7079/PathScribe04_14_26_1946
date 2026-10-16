// src/services/tumorBoard/notifyTumorBoardAssignment.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 493 (PS-359 follow-up; Pete, Oct 8): "If I assign a future date for
// a tumor board, I'd want a message, and can we send out an appointment to
// their calendar?" Two real asks: (1) an in-app message to the presenter
// when they're assigned to present at a scheduled (future) meeting, and
// (2) a calendar invite (.ics) they can add to their own calendar — see
// buildTumorBoardInviteIcs.ts for why that's an emailed .ics rather than a
// real Google/Outlook Calendar API integration (no OAuth connector exists
// in this app; that would be its own, much larger feature).
//
// shouldNotifyTumorBoardAssignment() is the pure decision (CLAUDE.md rule
// 2) of WHEN to notify — it alone decides, and useTumorBoardWorkspace.ts
// calls the exact same function for its own "Notified" toast, so the UI
// feedback and the real send can never disagree. notifyTumorBoardAssignment()
// is the impure orchestrator mockTumorBoardService.update() calls,
// fire-and-forget, the same split already established by
// services/tumorBoardRules/runMarginRuleEvaluation.ts.
//
// Deliberately excludes any patient-identifying information from both the
// in-app message and the calendar invite — a calendar invite commonly
// syncs out to a real, uncontrolled personal/Outlook/Gmail calendar once
// accepted, entirely outside this app's own PHI boundary. Only the board
// name, meeting date/time, and the case's internal accession number (never
// the patient's name/DOB/MRN) are included; the presenter opens PathScribe
// itself for the clinical detail.
//
// Direct mock-service imports here (not the services/index.ts barrel) are
// the same convention runMarginRuleEvaluation.ts already uses for
// cross-service orchestration — CLAUDE.md rule 4's "no direct mock-service
// import" is a UI-layer rule (components/pages/hooks), not a services-to-
// services one.
// ─────────────────────────────────────────────────────────────────────────────

import type { TumorBoardListing } from './ITumorBoardService';
import { buildTumorBoardInviteIcs } from './buildTumorBoardInviteIcs';
import { getFacilityDateTimeUtc } from '../../utils/facilityTime';
import { mockUserService } from '../users/mockUserService';
import { mockMessageService } from '../messages/mockMessageService';
import { sendEmail } from '../communications/notificationService';

/** Pure: does this update need a presenter notification + calendar invite?
 *  True only when the listing, AFTER the update, has both a presenter and
 *  a meeting date in the future (facility time) — AND something about the
 *  presenter or the schedule actually changed from before, so re-saving an
 *  unrelated field (status, board) or the same date again doesn't
 *  re-notify. A missing meetingTime defaults to end-of-day (23:59) for the
 *  "is this still in the future" check only, so a same-day assignment
 *  still counts as "a future date" until that day ends. */
export function shouldNotifyTumorBoardAssignment(
  previous: TumorBoardListing | undefined,
  updated: TumorBoardListing,
  now: Date,
  timezone: string,
): boolean {
  if (!updated.presenterUserId || !updated.meetingDate) return false;
  const [y, m, d] = updated.meetingDate.split('-').map(Number);
  const [hh, mm] = (updated.meetingTime ?? '23:59').split(':').map(Number);
  const meetingInstant = getFacilityDateTimeUtc(y, m - 1, d, hh, mm, timezone);
  if (meetingInstant.getTime() <= now.getTime()) return false;

  return (
    previous?.presenterUserId !== updated.presenterUserId ||
    previous?.meetingDate !== updated.meetingDate ||
    previous?.meetingTime !== updated.meetingTime
  );
}

function formatMeetingWhenText(listing: TumorBoardListing): string {
  const [y, m, d] = listing.meetingDate!.split('-').map(Number);
  const dateLabel = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
  return listing.meetingTime ? `${dateLabel} at ${listing.meetingTime}` : dateLabel;
}

function toBase64(text: string): string {
  // Browser at runtime; Buffer in the vitest/node test environment.
  if (typeof btoa === 'function') return btoa(text);
  return Buffer.from(text, 'utf-8').toString('base64');
}

/** Impure: resolves the presenter's and organizer's real contact info and
 *  fires both the in-app message and the calendar-invite email.
 *  Fire-and-forget-safe — never throws (same contract as sendEmail()
 *  itself). Caller (mockTumorBoardService.update()) has already decided
 *  via shouldNotifyTumorBoardAssignment() that this should run. */
export async function notifyTumorBoardAssignment(
  updated: TumorBoardListing,
  byUserId: string,
  byUserName: string,
  timezone: string = 'UTC',
): Promise<void> {
  try {
    if (!updated.presenterUserId || !updated.meetingDate) return;
    const presenterRes = await mockUserService.getById(updated.presenterUserId);
    if (!presenterRes.ok) return;
    const presenter = presenterRes.data;
    const presenterName = `${presenter.firstName} ${presenter.lastName}`;

    const organizerRes = await mockUserService.getById(byUserId);
    const organizerEmail = organizerRes.ok ? organizerRes.data.email : undefined;

    const whenText = formatMeetingWhenText(updated);
    const subject = `You're presenting at ${updated.board} — ${whenText}`;
    const body = `You've been scheduled to present a case at the ${updated.board} meeting (${whenText}). Case reference: ${updated.caseAccession}. Open PathScribe for the full case detail. — Scheduled by ${byUserName}`;

    // (1) The in-app message — same system-sender convention the rest of
    // this app's seeded system notifications already use (mockMessageService's
    // own seed data: senderId 'system', senderName 'PathScribe System').
    await mockMessageService.send({
      senderId: 'system',
      senderName: 'PathScribe System',
      recipientId: presenter.id,
      recipientName: presenterName,
      subject,
      body,
      caseNumber: updated.caseAccession,
      timestamp: new Date(),
      isUrgent: false,
    });

    // (2) The calendar invite — only when the presenter has an email on
    // file; the in-app message above has already gone out regardless.
    if (presenter.email) {
      const ics = buildTumorBoardInviteIcs({
        uid: `tumorboard-${updated.id}@pathscribe`,
        board: updated.board,
        meetingDate: updated.meetingDate,
        meetingTime: updated.meetingTime,
        caseAccession: updated.caseAccession,
        organizerName: byUserName,
        organizerEmail,
        attendeeName: presenterName,
        attendeeEmail: presenter.email,
        timezone,
      });
      await sendEmail({
        to: [presenter.email],
        subject,
        bodyHtml: `<p>${body}</p>`,
        bodyText: body,
        attachments: [{
          filename: 'tumor-board-meeting.ics',
          contentType: 'text/calendar; method=REQUEST; charset=UTF-8',
          contentBase64: toBase64(ics),
        }],
        metadata: { tumorBoardListingId: updated.id, kind: 'tumor-board-assignment' },
      });
    }
  } catch (err) {
    console.error('[notifyTumorBoardAssignment] Unexpected error:', err);
  }
}
