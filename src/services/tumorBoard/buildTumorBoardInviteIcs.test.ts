// src/services/tumorBoard/buildTumorBoardInviteIcs.test.ts
import { describe, it, expect } from 'vitest';
import { buildTumorBoardInviteIcs } from './buildTumorBoardInviteIcs';

function baseInput(overrides: Partial<Parameters<typeof buildTumorBoardInviteIcs>[0]> = {}) {
  return {
    uid: 'tumorboard-tbl-1@pathscribe',
    board: 'Breast MDT' as const,
    meetingDate: '2026-11-10',
    caseAccession: 'S26-1000',
    organizerName: 'Dr A',
    organizerEmail: 'dr.a@example.com',
    attendeeName: 'Dr B',
    attendeeEmail: 'dr.b@example.com',
    timezone: 'America/Phoenix',
    ...overrides,
  };
}

describe('buildTumorBoardInviteIcs', () => {
  it('builds a valid VCALENDAR/VEVENT shell with METHOD:REQUEST (needed for real Accept/Decline buttons)', () => {
    const ics = buildTumorBoardInviteIcs(baseInput());
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('METHOD:REQUEST');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('UID:tumorboard-tbl-1@pathscribe');
  });

  it('includes the board name and case accession, never a patient identifier', () => {
    const ics = buildTumorBoardInviteIcs(baseInput());
    expect(ics).toContain('Breast MDT');
    expect(ics).toContain('S26-1000');
    // Nothing here could plausibly contain a patient name/DOB/MRN since
    // the function is never given one — this just documents the intent.
    expect(ics).not.toMatch(/MRN|DOB/i);
  });

  it('resolves a timed meeting to a real UTC DTSTART/DTEND, facility-local (not UTC-literal)', () => {
    const ics = buildTumorBoardInviteIcs(baseInput({ meetingTime: '09:00' }));
    // America/Phoenix is UTC-7 year-round (no DST) — 09:00 local is 16:00 UTC.
    expect(ics).toContain('DTSTART:20261110T160000Z');
    expect(ics).toContain('DTEND:20261110T170000Z'); // default 60-minute duration
  });

  it('falls back to a real all-day VALUE=DATE event when no meeting time is set', () => {
    const ics = buildTumorBoardInviteIcs(baseInput());
    expect(ics).toContain('DTSTART;VALUE=DATE:20261110');
    expect(ics).toContain('DTEND;VALUE=DATE:20261111'); // ICS all-day end is exclusive
    expect(ics).not.toMatch(/DTSTART:\d{8}T/);
  });

  it('sets ORGANIZER to the assigning user and ATTENDEE to the presenter', () => {
    const ics = buildTumorBoardInviteIcs(baseInput({ meetingTime: '09:00' }));
    expect(ics).toContain('ORGANIZER;CN=Dr A:MAILTO:dr.a@example.com');
    expect(ics).toContain('ATTENDEE;CN=Dr B;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:MAILTO:dr.b@example.com');
  });

  it('falls back the organizer MAILTO to the attendee email when no organizer email is known', () => {
    const ics = buildTumorBoardInviteIcs(baseInput({ organizerEmail: undefined }));
    expect(ics).toContain('ORGANIZER;CN=Dr A:MAILTO:dr.b@example.com');
  });

  it('escapes RFC 5545 special characters in free text', () => {
    const ics = buildTumorBoardInviteIcs(baseInput({ organizerName: 'Dr A; Jr, M.D.' }));
    expect(ics).toContain('ORGANIZER;CN=Dr A\\; Jr\\, M.D.:MAILTO:dr.a@example.com');
  });
});
