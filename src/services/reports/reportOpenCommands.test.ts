import { describe, it, expect } from 'vitest';
import { resolveReportOpenCommand, specimenIdAtIndex } from './reportOpenCommands';

const ok = { modalOpen: false, caseLoaded: true };

describe('resolveReportOpenCommand', () => {
  it('maps the three open commands', () => {
    expect(resolveReportOpenCommand('VOICE_CASE_COMMENT', ok)).toBe('caseComment');
    expect(resolveReportOpenCommand('VOICE_SPECIMEN_COMMENT', ok)).toBe('specimenComment');
    expect(resolveReportOpenCommand('VOICE_ADD_SYNOPTIC', ok)).toBe('addSynoptic');
  });
  it('ignores other commands, a window already open, and a case not loaded', () => {
    expect(resolveReportOpenCommand('SIGN_OUT', ok)).toBeNull();
    expect(resolveReportOpenCommand('VOICE_CASE_COMMENT', { ...ok, modalOpen: true })).toBeNull();
    expect(resolveReportOpenCommand('VOICE_CASE_COMMENT', { ...ok, caseLoaded: false })).toBeNull();
  });
});

describe('specimenIdAtIndex', () => {
  const ids = ['s1', 's2', 's3'];
  it('picks the specimen at the spoken position', () => {
    expect(specimenIdAtIndex(ids, 0)).toBe('s1');
    expect(specimenIdAtIndex(ids, 2)).toBe('s3');
  });
  it('picks nothing for a position that is not there', () => {
    expect(specimenIdAtIndex(ids, 3)).toBeNull();
    expect(specimenIdAtIndex(ids, -1)).toBeNull();
    expect(specimenIdAtIndex(ids, 1.5)).toBeNull();
    expect(specimenIdAtIndex(ids, 'two')).toBeNull();
    expect(specimenIdAtIndex([], 0)).toBeNull();
  });
});
