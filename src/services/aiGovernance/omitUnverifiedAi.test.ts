// Batch 691: unconfirmed optional AI values stay out of the signed report.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unverifiedAiOmissions, withoutOmitted, rememberOmissions, forgetOmissions, stillOmitted, aiOmittedAtSignOutAudit, recordAiOmittedAtSignOut, recordAiOmittedAtGross } from './omitUnverifiedAi';

const reports = [
  { instanceId: 'i1', templateId: 't1',
    answers: { opt: 'AI text', req: 'AI req', edited: 'pathologist text', confirmed: 'ok', empty: '', list: ['a', 'b'] },
    aiSuggestions: {
      opt: { verification: 'unverified', value: 'AI text' }, req: { verification: 'unverified', value: 'AI req' },
      edited: { verification: 'unverified', value: 'AI original' }, confirmed: { verification: 'verified', value: 'ok' },
      empty: { verification: 'unverified', value: 'x' }, list: { verification: 'unverified', value: ['a', 'b'] },
    } },
  { instanceId: 'i2', templateId: 't1', answers: { opt: 'other report' }, aiSuggestions: { opt: { verification: 'unverified', value: 'other report' } } },
];
const required = () => new Set(['req']);

describe('unverifiedAiOmissions', () => {
  it('picks optional fields holding an unchanged unverified AI value, in every report', () => {
    const o = unverifiedAiOmissions(reports, r => r.aiSuggestions, required);
    expect(o).toEqual([{ instanceId: 'i1', fieldId: 'opt' }, { instanceId: 'i1', fieldId: 'list' }, { instanceId: 'i2', fieldId: 'opt' }]);
  });
  it('never picks required, edited, confirmed or empty fields', () => {
    const ids = unverifiedAiOmissions(reports, r => r.aiSuggestions, required).map(x => x.fieldId);
    for (const keep of ['req', 'edited', 'confirmed', 'empty']) expect(ids).not.toContain(keep);
  });
  it('uses the current verification supplied, so a value confirmed since is kept', () => {
    const fresh = { opt: { verification: 'verified', value: 'AI text' } };
    expect(unverifiedAiOmissions([reports[0]], () => fresh, required)).toEqual([]);
  });
  it('handles no reports', () => expect(unverifiedAiOmissions(undefined, () => undefined, required)).toEqual([]));
});

describe('withoutOmitted', () => {
  it('clears only the named answers and keeps every suggestion', () => {
    const out = withoutOmitted(reports, [{ instanceId: 'i1', fieldId: 'opt' }])!;
    expect(out[0].answers).not.toHaveProperty('opt');
    expect(out[0].answers).toHaveProperty('req');
    expect(out[0].aiSuggestions).toEqual(reports[0].aiSuggestions);
    expect(out[1]).toBe(reports[1]);
  });
  it('does not change its input and passes through when nothing is omitted', () => {
    withoutOmitted(reports, [{ instanceId: 'i1', fieldId: 'opt' }]);
    expect(reports[0].answers).toHaveProperty('opt');
    expect(withoutOmitted(reports, [])).toBe(reports);
    expect(withoutOmitted(undefined, [{ instanceId: 'i1', fieldId: 'opt' }])).toBeUndefined();
  });
});

describe('what was left out at the moment of signing', () => {
  beforeEach(() => forgetOmissions('c1'));
  it('counts a value still without an answer, not one confirmed again', () => {
    rememberOmissions('c1', [{ instanceId: 'i1', fieldId: 'opt' }, { instanceId: 'i1', fieldId: 'list' }]);
    rememberOmissions('c1', [{ instanceId: 'i1', fieldId: 'opt' }]);
    const now = [{ instanceId: 'i1', answers: { list: ['a'] } }];
    expect(stillOmitted('c1', now)).toEqual([{ instanceId: 'i1', fieldId: 'opt' }]);
  });
  it('audit: nothing left out, nothing recorded; otherwise the count only, never a value', async () => {
    expect(aiOmittedAtSignOutAudit(0, { caseId: 'c1', userName: 'Dr Chen' })).toBeNull();
    const e = aiOmittedAtSignOutAudit(2, { caseId: 'c1', userName: 'Dr Chen' })!;
    expect(e).toMatchObject({ event: 'AI_VALUES_OMITTED_AT_SIGNOUT', caseId: 'c1', confidence: null });
    expect(e.detail).toContain('2 optional AI-filled fields were left out');
    expect(e.detail).not.toContain('AI text');
    const logEvent = vi.fn().mockRejectedValue(new Error('down'));
    rememberOmissions('c1', [{ instanceId: 'i1', fieldId: 'opt' }]);
    expect(() => recordAiOmittedAtSignOut({ logEvent }, 'c1', [{ instanceId: 'i1', answers: {} }], 'Dr Chen')).not.toThrow();
    expect(logEvent).toHaveBeenCalledTimes(1);
    recordAiOmittedAtSignOut({ logEvent }, 'c1', [{ instanceId: 'i1', answers: { opt: 'back' } }], 'Dr Chen');
    expect(logEvent).toHaveBeenCalledTimes(1);
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
describe('where it is wired', () => {
  const page = readFileSync(resolve(__dirname, '../../pages/SynopticReportPage/SynopticReportPage.tsx'), 'utf8');
  it('both sign-out dialogs open only after the unconfirmed values are cleared', () => {
    expect(page).toMatch(/const handleSignOutClick = async \(\) => \{\n\s+setOmittedAiCount\(await omitUnverifiedAi\(\)\)/);
    expect(page).toContain('void omitUnverifiedAi().then(n => { setOmittedAiCount(n); setShowFinalizeModal(true); })');
  });
  it('the sign-out checks audit what was left out', () => {
    const hook = readFileSync(resolve(__dirname, '../../pages/SynopticReportPage/hooks/useSignOutWorkflow.ts'), 'utf8');
    expect(hook).toContain('recordAiOmittedAtSignOut(auditService, caseData.id');
  });
  it('Gross Complete clears grossing values too, audited at once (Batch 692)', () => {
    const hook = readFileSync(resolve(__dirname, '../../pages/SynopticReportPage/hooks/useOmitUnverifiedAi.ts'), 'utf8');
    expect(hook).toContain("['synopticReports', 'grossingReports']");
    expect(hook).toContain("recordAiOmittedAtGross(auditService, c.id, omissions.length");
    expect(page).toContain("onGrossComplete={isOrchestrationMode ? grossCompleteAfterOmit : undefined}");
    expect(page).toContain("await omitUnverifiedAi('gross'); return grossCompleteRef.current(...a)");
  });
  it('the sign-out audit counts grossing reports as well', () => {
    const wf = readFileSync(resolve(__dirname, '../../pages/SynopticReportPage/hooks/useSignOutWorkflow.ts'), 'utf8');
    expect(wf).toContain('...(caseData.grossingReports ?? [])');
  });
});

describe('gross stage audit (Batch 692)', () => {
  it('names the finalized gross report and never a value', () => {
    const e = aiOmittedAtSignOutAudit(1, { caseId: 'c1', userName: 'PA Lee' }, 'gross')!;
    expect(e.detail).toBe('1 optional AI-filled field was left out of the finalized gross report because PA Lee had not confirmed it');
  });
  it('is recorded once and a failed write is swallowed', () => {
    const logEvent = vi.fn().mockRejectedValue(new Error('down'));
    expect(() => recordAiOmittedAtGross({ logEvent }, 'c1', 2, 'PA Lee')).not.toThrow();
    recordAiOmittedAtGross({ logEvent }, 'c1', 0, 'PA Lee');
    expect(logEvent).toHaveBeenCalledTimes(1);
  });
});
