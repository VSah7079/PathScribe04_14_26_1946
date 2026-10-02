// Batch 399 (Pete): the structured verbal report.
import { describe, it, expect } from 'vitest';
import {
  verbalReportProblems, buildVerbalReportLog, surgeonUnavailableNeeded, otherNoteAcceptable,
  recipientSuggestions, receivedByForRole, verbalReportAuditDetail,
} from './verbalReport';
import type { VerbalReportInput } from '@/types/intraop/IntraoperativeEntry';

const input = (over: Partial<VerbalReportInput> = {}): VerbalReportInput => ({
  receivedBy: 'Dr. Faulkner', recipientRole: 'operating_surgeon', readBackConfirmed: true, critical: false,
  suggestedCriticalIds: [], suggestedCriticalNames: [], note: '', ...over,
});

describe('verbal report rules (Batch 399)', () => {
  it('who, role and read-back are always required', () => {
    expect(verbalReportProblems(input())).toEqual([]);
    expect(verbalReportProblems(input({ receivedBy: '', recipientRole: '', readBackConfirmed: false }))).toEqual(['verbalReportRecipient', 'verbalReportRole', 'verbalReportReadBack']);
  });

  it('a critical result to anyone but the operating surgeon needs a reason; "Other" needs a real note', () => {
    expect(surgeonUnavailableNeeded(input({ critical: true, recipientRole: 'surgical_resident' }))).toBe(true);
    expect(surgeonUnavailableNeeded(input({ critical: true }))).toBe(false);
    expect(surgeonUnavailableNeeded(input({ critical: false, recipientRole: 'or_staff' }))).toBe(false);
    expect(verbalReportProblems(input({ critical: true, recipientRole: 'surgical_resident' }))).toEqual(['surgeonUnavailableReason']);
    for (const note of ['.', 'busy', 'was busy', '   ']) {
      expect(verbalReportProblems(input({ critical: true, recipientRole: 'or_staff', surgeonUnavailable: { reasonId: 'SU_OTHER', reasonName: 'Other', note } })), note).toEqual(['surgeonUnavailableNote']);
    }
    expect(verbalReportProblems(input({ critical: true, recipientRole: 'or_staff', surgeonUnavailable: { reasonId: 'SU_OTHER', reasonName: 'Other', note: 'Surgeon on a call with ICU' } }))).toEqual([]);
  });

  it('"Other" needs at least three real words', () => {
    expect(otherNoteAcceptable('...........')).toBe(false);
    expect(otherNoteAcceptable('Surgeon unreachable today')).toBe(true);
  });

  it('the record keeps who, role, read-back, the critical decision and the reason; the time is the clock', () => {
    const log = buildVerbalReportLog(input({
      receivedBy: ' Dr. Patel ', recipientRole: 'surgical_resident', critical: true,
      suggestedCriticalIds: ['icr-positive-margin'], suggestedCriticalNames: ['Positive or close margin'],
      surgeonUnavailable: { reasonId: 'SU_SCRUBBED', reasonName: 'Surgeon scrubbed in a critical step' },
      note: 'Called at 2:07',
    }), '2026-09-29T21:07:00.000Z');
    expect(log).toMatchObject({
      timestamp: '2026-09-29T21:07:00.000Z', receivedBy: 'Dr. Patel', recipientRole: 'surgical_resident', readBackConfirmed: true,
      critical: { flagged: true, suggestedIds: ['icr-positive-margin'] },
      surgeonUnavailable: { reasonId: 'SU_SCRUBBED' }, note: 'Called at 2:07',
    });
    expect(verbalReportAuditDetail(log)).toContain('surgeon unavailable: Surgeon scrubbed in a critical step');
  });

  it('a reason chosen, then the role changed to the operating surgeon, is not kept', () => {
    const log = buildVerbalReportLog(input({ critical: true, surgeonUnavailable: { reasonId: 'SU_SCRUBBED', reasonName: 'x' } }), 'now');
    expect(log.surgeonUnavailable).toBeUndefined();
  });

  it('the pathologist overriding the dictionary is recorded', () => {
    const log = buildVerbalReportLog(input({ critical: false, suggestedCriticalIds: ['icr-malignancy'], suggestedCriticalNames: ['Malignancy on frozen section'] }), 'now');
    expect(log.critical).toEqual({ flagged: false, suggestedIds: ['icr-malignancy'], suggestedNames: ['Malignancy on frozen section'] });
    expect(verbalReportAuditDetail(log)).toContain('critical result: no (dictionary suggested: Malignancy on frozen section)');
  });

  it('recipient suggestions: the session surgeon first, then matching directory names, no repeats', () => {
    expect(recipientSuggestions('', 'Dr. Faulkner', ['Lisa Wong', 'Dr. Faulkner', 'Omar Faulk'])).toEqual(['Dr. Faulkner', 'Lisa Wong', 'Omar Faulk']);
    expect(recipientSuggestions('Dr. faulk', 'Dr. Faulkner', ['Lisa Wong', 'Omar Faulk'])).toEqual(['Dr. Faulkner', 'Omar Faulk']);
  });

  it('picking Operating surgeon fills in the session surgeon only when nothing is typed', () => {
    expect(receivedByForRole('operating_surgeon', '', 'Dr. Faulkner')).toBe('Dr. Faulkner');
    expect(receivedByForRole('operating_surgeon', 'Dr. Owusu', 'Dr. Faulkner')).toBe('Dr. Owusu');
    expect(receivedByForRole('or_staff', '', 'Dr. Faulkner')).toBe('');
  });

  it('Batch 400: fields filled from dictation are recorded with the engine, and in the audit', () => {
    const log = buildVerbalReportLog(input({ dictation: { engine: 'ai', filledFields: ['verbalReportRecipient', 'verbalReportRole'] } }), 'now');
    expect(log.dictation).toEqual({ engine: 'ai', filledFields: ['verbalReportRecipient', 'verbalReportRole'] });
    expect(verbalReportAuditDetail(log)).toContain('filled from dictation (AI) and checked by the pathologist: verbalReportRecipient, verbalReportRole');
    expect(buildVerbalReportLog(input({ dictation: { engine: 'rules', filledFields: [] } }), 'now').dictation).toBeUndefined();
  });
});
