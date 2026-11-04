// Batch 611 (#189): the review states and their rules (pure).
import { describe, it, expect } from 'vitest';
import {
  recordState, isStale, mayConfirm, approvalRefusal, exportRefusal, exportableLines, mergeDecisions,
  type SmartCaptureRecord, type SmartCaptureLine,
} from './smartCaptureStates';

const line = (key: string, over: Partial<SmartCaptureLine> = {}): SmartCaptureLine => ({
  key, specimenId: 's', specimenLabel: 'A', cpt: '88305', units: 1, ruleId: 'SC-LEVEL', ruleVersion: 'v', evidence: [], state: 'suggested', ...over,
});
const rec = (lines: SmartCaptureLine[], over: Partial<SmartCaptureRecord> = {}): SmartCaptureRecord => ({ caseId: 'C1', ruleVersion: 'v', signature: 's', generatedAt: 't', lines, ...over });

describe('Smart Capture states', () => {
  it('moves suggested, reviewed, approved, exported', () => {
    expect(recordState(null)).toBe('none');
    expect(recordState(rec([line('a')]))).toBe('suggested');
    expect(recordState(rec([line('a', { state: 'reviewed', decision: 'accepted' })]))).toBe('reviewed');
    expect(recordState(rec([line('a', { state: 'approved', decision: 'accepted' })]))).toBe('approved');
    expect(recordState(rec([line('a', { state: 'exported', decision: 'accepted' })]))).toBe('exported');
  });

  it('knows a record is stale when the case or the rule version changed', () => {
    expect(isStale(rec([]), 's', 'v')).toBe(false);
    expect(isStale(rec([]), 'other', 'v')).toBe(true);
    expect(isStale(rec([]), 's', 'v2')).toBe(true);
  });

  it('only a pathologist may confirm', () => {
    expect(mayConfirm('pathologist')).toBe(true);
    expect(mayConfirm('admin')).toBe(false);
    expect(mayConfirm('lab-director')).toBe(false);
    expect(mayConfirm(undefined)).toBe(false);
  });

  it('refuses approval until every line is decided, one is accepted, the box is ticked and the role is right', () => {
    const ok = rec([line('a', { state: 'reviewed', decision: 'accepted' }), line('b', { state: 'reviewed', decision: 'rejected' })]);
    const input = { role: 'pathologist', confirmed: true, stale: false };
    expect(approvalRefusal(ok, input)).toBeNull();
    expect(approvalRefusal(ok, { ...input, role: 'admin' })).toBe('NOT_A_PATHOLOGIST');
    expect(approvalRefusal(ok, { ...input, confirmed: false })).toBe('NOT_CONFIRMED');
    expect(approvalRefusal(ok, { ...input, stale: true })).toBe('STALE');
    expect(approvalRefusal(rec([line('a')]), input)).toBe('UNREVIEWED_LINES');
    expect(approvalRefusal(rec([line('a', { state: 'reviewed', decision: 'rejected' })]), input)).toBe('NOTHING_ACCEPTED');
    expect(approvalRefusal(null, input)).toBe('NOT_FOUND');
  });

  it('refuses export before approval, when stale, and to a real engine while the gate is closed', () => {
    const approved = rec([line('a', { state: 'approved', decision: 'accepted' })]);
    const open = { stale: false, engineSimulated: true, productionActivated: false };
    expect(exportRefusal(approved, open)).toBeNull();
    expect(exportRefusal(approved, { ...open, engineSimulated: false })).toBe('PRODUCTION_GATED');
    expect(exportRefusal(approved, { ...open, engineSimulated: false, productionActivated: true })).toBeNull();
    expect(exportRefusal(approved, { ...open, stale: true })).toBe('STALE');
    expect(exportRefusal(rec([line('a', { state: 'reviewed', decision: 'accepted' })]), open)).toBe('NOT_APPROVED');
    expect(exportRefusal(rec([line('a', { state: 'exported', decision: 'accepted' })]), open)).toBe('ALREADY_EXPORTED');
  });

  it('exports only accepted, approved lines', () => {
    const r = rec([line('a', { state: 'approved', decision: 'accepted' }), line('b', { state: 'reviewed', decision: 'rejected' })]);
    expect(exportableLines(r).map(l => l.key)).toEqual(['a']);
  });

  it('keeps earlier decisions on unchanged lines and makes changed lines suggested again', () => {
    const before = [line('a', { state: 'reviewed', decision: 'accepted', reviewedBy: 'Dr A', reviewedAt: 't' }), line('b', { state: 'reviewed', decision: 'rejected' })];
    const fresh = [line('a'), line('b', { units: 3 })];
    const merged = mergeDecisions(fresh, before);
    expect(merged[0]).toMatchObject({ state: 'reviewed', decision: 'accepted', reviewedBy: 'Dr A' });
    expect(merged[1]).toMatchObject({ state: 'suggested' });
    expect(merged[1].decision).toBeUndefined();
  });
});
