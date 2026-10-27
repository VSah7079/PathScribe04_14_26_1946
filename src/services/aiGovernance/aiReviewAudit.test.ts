import { describe, it, expect } from 'vitest';
import { aiNarrativeReviewAudit, AI_REVIEW_EVENTS } from './aiReviewAudit';
import { unacceptedAiNarrativeSections, runSignOutReviewGates, type SignOutReviewGateDeps } from '../signoutGates/signOutReviewGates';
import type { Case } from '@/types/case/Case';

const sec = (o: Partial<{ id: string; label: string; text: string; aiGenerated: string; userEdited: boolean; committed: boolean }> = {}) =>
  ({ id: 's1', label: 'Microscopic', text: 'draft', aiGenerated: 'draft', userEdited: false, ...o });

describe('AI narrative review (Batch 680)', () => {
  it('an untouched AI draft waits; accepted, edited, committed, manual and empty ones do not', () => {
    expect(unacceptedAiNarrativeSections([sec()])).toEqual([{ id: 's1', label: 'Microscopic' }]);
    expect(unacceptedAiNarrativeSections([sec({ userEdited: true }), sec({ committed: true }), sec({ aiGenerated: '' }), sec({ text: '  ' })])).toEqual([]);
  });
  it('audit entries name the section and action, never the text', () => {
    const e = aiNarrativeReviewAudit({ action: 'accepted-edited', caseId: 'S26-1', userName: 'Dr Chen', sectionLabel: 'Microscopic' });
    expect(e).toMatchObject({ event: AI_REVIEW_EVENTS['accepted-edited'], caseId: 'S26-1', user: 'Dr Chen', confidence: null });
    expect(e.detail).toBe('Dr Chen accepted, with changes, the AI draft of the "Microscopic" section');
    expect(aiNarrativeReviewAudit({ action: 'rejected', caseId: null, userName: '', sectionLabel: 'Gross' }).user).toBe('unknown');
  });
  it('sign-out stops on an unaccepted AI section, after every other check passes', async () => {
    const none = async () => [];
    const deps = {
      staleOrganMapFigures: none, mohsBlockGaps: none, derivedMarginConflicts: none,
      synopticEntryChecks: async () => ({ blocking: [], warnings: [] }), invasiveMarginGaps: none, molecularDifferences: none,
      microscopicBlocking: none, criticalAcknowledged: true, detectFindings: none,
      synopticFieldProblems: async () => ({ missing: [], unverifiedAi: [] }),
    } as unknown as SignOutReviewGateDeps;
    const c = { status: 'in-progress' } as unknown as Case;
    expect(await runSignOutReviewGates(c, { ...deps, unacceptedNarrative: () => [{ id: 's1', label: 'Microscopic' }] })).toEqual({ ok: false, stop: { gate: 'unacceptedAiNarrative', sections: [{ id: 's1', label: 'Microscopic' }] } });
    expect(await runSignOutReviewGates(c, { ...deps, unacceptedNarrative: () => [] })).toEqual({ ok: true });
    expect(await runSignOutReviewGates(c, deps)).toEqual({ ok: true });
  });
});

import { aiCodeBindAudits, recordAiCodeBinds } from './aiReviewAudit';
describe('AI code binding audit (Batch 680)', () => {
  const prev = [{ system: 'ICD10', code: 'C50.9', source: 'ai' }, { system: 'SNOMED', code: '1', source: 'manual' }];
  const next = [...prev, { system: 'ICD10', code: 'D05.1', source: 'ai' }, { system: 'CPT', code: '88305', source: 'manual' }];
  it('only a newly bound AI code is audited', () => {
    const a = aiCodeBindAudits(prev, next, { caseId: 'S26-1', userName: 'Dr Chen' });
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ event: 'AI_CODE_BOUND', caseId: 'S26-1', confidence: null });
    expect(a[0].detail).toContain('D05.1');
  });
  it('an audit failure never throws', () => {
    expect(() => recordAiCodeBinds({ logEvent: () => Promise.reject(new Error('x')) }, prev, next, { caseId: null, userName: '' })).not.toThrow();
  });
});

describe('AI code binding audit carries how the code was produced and checked (Batch 696)', () => {
  const who = { caseId: 'S26-1', userName: 'Dr Chen' };
  const bound = { system: 'SNOMED', code: '413448000', source: 'ai', display: 'Invasive carcinoma of breast, no special type', ai: { model: 'claude-x', provider: 'structured_messages', confidence: 95, verifiedBy: 'dictionary', sourceSection: 'microscopic', specimen: 'A' } };
  it('records the model, the dictionary check, the origin and the confidence (in the log, not on screen)', () => {
    const [e] = aiCodeBindAudits([], [bound], who);
    expect(e.confidence).toBe(95);
    expect(e.detail).toContain('413448000');
    expect(e.detail).toContain('Invasive carcinoma of breast, no special type');
    expect(e.detail).toContain('model claude-x via structured_messages');
    expect(e.detail).toContain('model confidence 95%');
    expect(e.detail).toContain('code confirmed in the terminology dictionary');
    expect(e.detail).toContain('taken from the microscopic, specimen A');
    expect(e.detail).toContain('bound as suggested');
  });
  it('says when the pathologist changed the suggestion before binding it', () => {
    const [e] = aiCodeBindAudits([], [{ ...bound, changedFromSuggestion: true }], who);
    expect(e.detail).toContain('changed by the pathologist before binding');
  });
  it('says plainly when no check was recorded (older codes), and never invents one', () => {
    const [e] = aiCodeBindAudits([], [{ system: 'ICD10', code: 'C50.9', source: 'ai' }], who);
    expect(e.detail).toContain('code check not recorded');
    expect(e.confidence).toBeNull();
  });
});

import { unreviewedAiValueCount } from './aiReviewAudit';
describe('unreviewed optional AI values, counted (Batch 681)', () => {
  const reports = [{ answers: { a: 'x', b: '', c: ['y'] }, aiSuggestions: { a: { verification: 'unverified' }, b: { verification: 'unverified' }, c: { verification: 'verified' }, d: { verification: 'unverified' } } }];
  it('counts only unverified suggestions that hold an answer', () => {
    expect(unreviewedAiValueCount(reports)).toBe(1);
    expect(unreviewedAiValueCount(undefined)).toBe(0);
  });
});
