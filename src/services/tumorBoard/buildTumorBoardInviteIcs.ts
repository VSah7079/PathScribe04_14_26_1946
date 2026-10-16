// src/services/tumorBoard/buildTumorBoardInviteIcs.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 493 (PS-359 follow-up; Pete, Oct 8: "can we send out an appointment
// to their calendar?"). Pure iCalendar (RFC 5545) VEVENT builder — no real
// Google/Outlook Calendar OAuth connector exists in this app (and building
// one would be its own, much larger feature), so an emailed .ics attachment
// is the deployment-neutral way to get a real "Add to Calendar" / Accept-
// Decline prompt into whatever calendar app the presenter already uses.
// METHOD:REQUEST + ORGANIZER + ATTENDEE is what makes Outlook/Gmail/Apple
// Calendar show real Accept/Decline buttons rather than just a static event.
//
// Deliberately carries no patient-identifying information (see
// notifyTumorBoardAssignment.ts's own header) — only the board name,
// meeting date/time, and the case's internal accession number.
//
// No duration field exists on TumorBoardListing, so a scheduled (timed)
// meeting defaults to DEFAULT_DURATION_MINUTES; a date-only listing (no
// meetingTime) goes out as a real all-day VALUE=DATE event instead.
// ─────────────────────────────────────────────────────────────────────────────

import { getFacilityDateTimeUtc, getFacilityMidnightUtc } from '../../utils/facilityTime';
import type { TumorBoardName } from './ITumorBoardService';

const DEFAULT_DURATION_MINUTES = 60;

export interface TumorBoardInviteInput {
  uid: string;
  board: TumorBoardName;
  /** 'YYYY-MM-DD', facility-local. */
  meetingDate: string;
  /** 'HH:mm', facility-local. Omitted → an all-day event. */
  meetingTime?: string;
  caseAccession: string;
  organizerName: string;
  organizerEmail?: string;
  attendeeName: string;
  attendeeEmail: string;
  timezone: string;
}

/** Escapes text per RFC 5545 §3.3.11 — backslash, semicolon, comma, and
 *  embedded newlines all need escaping inside an ICS text value. This
 *  module's own content is short enough that line-folding (the 75-octet
 *  rule) never comes into play. */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatIcsDateTimeUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatIcsDateOnly(year: number, month: number, day: number): string {
  return `${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

/** Builds a complete, single-event .ics calendar invite as a string. */
export function buildTumorBoardInviteIcs(input: TumorBoardInviteInput): string {
  const [y, m, d] = input.meetingDate.split('-').map(Number);
  const summary = `${input.board} Tumor Board / MDT`;
  const description = escapeIcsText(
    `You are scheduled to present a case at the ${input.board} meeting. Case reference: ${input.caseAccession}. Open PathScribe for the full case detail.`
  );

  let dtLines: string[];
  if (input.meetingTime) {
    const [hh, mm] = input.meetingTime.split(':').map(Number);
    const start = getFacilityDateTimeUtc(y, m - 1, d, hh, mm, input.timezone);
    const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60000);
    dtLines = [
      `DTSTART:${formatIcsDateTimeUtc(start)}`,
      `DTEND:${formatIcsDateTimeUtc(end)}`,
    ];
  } else {
    // All-day: ICS end date is exclusive, so a one-day event's DTEND is the
    // next calendar day — resolved facility-locally, same as the start.
    const startMidnightUtc = getFacilityMidnightUtc(y, m - 1, d, input.timezone);
    const endMidnightUtc = new Date(startMidnightUtc.getTime() + 24 * 60 * 60000);
    const endParts = new Date(endMidnightUtc.toISOString());
    dtLines = [
      `DTSTART;VALUE=DATE:${formatIcsDateOnly(y, m - 1, d)}`,
      `DTEND;VALUE=DATE:${formatIcsDateOnly(endParts.getUTCFullYear(), endParts.getUTCMonth(), endParts.getUTCDate())}`,
    ];
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PathScribe//Tumor Board//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTAMP:${formatIcsDateTimeUtc(new Date())}`,
    ...dtLines,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${description}`,
    `ORGANIZER;CN=${escapeIcsText(input.organizerName)}:MAILTO:${input.organizerEmail ?? input.attendeeEmail}`,
    `ATTENDEE;CN=${escapeIcsText(input.attendeeName)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:MAILTO:${input.attendeeEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}
