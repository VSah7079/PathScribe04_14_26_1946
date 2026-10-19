// @vitest-environment happy-dom
// Batch 609 (#31): the mismatch check for amendments, corrections and addenda.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/aiIntegration/aiProviderService', () => ({ callAi: vi.fn() }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));

import { callAi } from '@/services/aiIntegration/aiProviderService';
import { clinicalMismatchService } from './clinicalMismatchService';
import { mockClinicalMismatchRuleService } from './mockClinicalMismatchRuleService';
import { createClinicalMismatchRuleService } from './clinicalMismatchRuleService';
import { evaluateClinicalMismatch, DEFAULT_CLINICAL_MISMATCH_RULES } from './clinicalMismatchRules';
import { addendumMismatchInput, caseHasPendingAmendment, revisionStep, withReleaseSetting } from './amendmentMismatch';
import { mockQaActivityRecordService } from '../quality/mockQaActivityRecordService';
import { CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID } from '../quality/capaRecommendationRules';
import type { Case } from '@/types/case/Case';

const assessment = (confidence: number) => {
  const suggestion = { kind: 'unexpected-malignancy' as const, confidence, source: 'ai' as const };
  return { suggestion, outcome: evaluateClinicalMismatch(suggestion, [], DEFAULT_CLINICAL_MISMATCH_RULES) };
};
const surgicalCase = (extra: Partial<Case> = {}) => ({
  id: 'c-amend', order: { clinicalIndication: 'Routine screening colonoscopy, polyp' },
  diagnostic: { primaryDiagnosis: 'Tubular adenoma', microscopicDescription: 'Adenomatous mucosa' },
  synopticReports: [], ...extra,
}) as unknown as Case;

describe('pure rules', () => {
  it('a case is being amended when some report is unlocked for it', () => {
    expect(caseHasPendingAmendment({ synopticReports: [] })).toBe(false);
    expect(caseHasPendingAmendment({ synopticReports: [{ instanceId: 'i1' }, { instanceId: 'i2', pendingAmendmentId: 'a1' }] as never })).toBe(true);
    expect(caseHasPendingAmendment({})).toBe(false);
  });
  it('an addendum is compared with the report diagnosis plus its own text; an empty one is not checked', () => {
    const input = addendumMismatchInput(surgicalCase(), '  Focus of invasive adenocarcinoma identified on deeper levels.  ');
    expect(input?.diagnosis).toBe('Tubular adenoma\nFocus of invasive adenocarcinoma identified on deeper levels.');
    expect(input?.clinicalIndication).toBe('Routine screening colonoscopy, polyp');
    expect(addendumMismatchInput(surgicalCase(), '   ')).toBeNull();
  });
  it('the release step: none or suppressed → continue; high risk → decide only when the lab setting holds; otherwise logged', () => {
    expect(revisionStep(null, true)).toBe('continue');
    expect(revisionStep(assessment(50), true)).toBe('continue');
    expect(revisionStep(assessment(65), true)).toBe('log');
    expect(revisionStep(assessment(70), true)).toBe('decide');
    expect(revisionStep(assessment(70), false)).toBe('log');
  });
  it('the alert is marked "release not held" only for a high-risk mismatch when the setting is off', () => {
    expect(withReleaseSetting(assessment(80), true).releaseNotHeld).toBeUndefined();
    expect(withReleaseSetting(assessment(80), false).releaseNotHeld).toBe(true);
    expect(withReleaseSetting(assessment(65), false).releaseNotHeld).toBeUndefined();
  });
});

describe('the lab setting', () => {
  const make = (granted: string[]) => {
    let hold: boolean | null = null;
    const audit = vi.fn(async () => undefined);
    const refused = vi.fn();
    const svc = createClinicalMismatchRuleService({
      read: () => null, write: () => undefined, readRevisionHold: () => hold, writeRevisionHold: v => { hold = v; },
      enforce: async c => ({ allowed: granted.includes(c) }), audit, actorName: () => 'Dr Admin', specimenName: async () => null, refused,
    });
    return { svc, audit, refused, value: () => hold };
  };
  const MANAGE = 'config:clinical-mismatch-rules:manage';
  it('holds the release by default, and without a service that stores it', async () => {
    expect(await make([]).svc.revisionHoldsRelease()).toBe(true);
  });
  it('changing it needs the manage capability; a refusal changes nothing and names the permission', async () => {
    const { svc, refused, value } = make([]);
    expect(await svc.saveRevisionHoldsRelease(false)).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    expect(refused).toHaveBeenCalledWith(MANAGE);
    expect(value()).toBeNull();
  });
  it('a change is saved and audited with no case or patient detail; saving the same value audits nothing', async () => {
    const { svc, audit } = make([MANAGE]);
    expect(await svc.saveRevisionHoldsRelease(false)).toEqual({ ok: true, data: false });
    expect(await svc.revisionHoldsRelease()).toBe(false);
    expect(audit).toHaveBeenCalledTimes(1);
    const entry = (audit.mock.calls as unknown as [{ event: string; detail: string; caseId: string | null }][])[0][0];
    expect(entry).toMatchObject({ event: 'CLINICAL_MISMATCH_RULE_CHANGED', caseId: null });
    expect(entry.detail).toContain('holds the release → does not hold the release');
    await svc.saveRevisionHoldsRelease(false);
    expect(audit).toHaveBeenCalledTimes(1);
  });
});

describe('atRevision against the real rules, setting and QA records', () => {
  const ai = (confidence: number) =>
    vi.mocked(callAi).mockResolvedValue({ text: JSON.stringify({ mismatch: true, kind: 'unexpected-malignancy', explanation: 'x', confidence }), provider: 'p', model: 'm' } as never);
  const input = { clinicalIndication: 'Routine screening colonoscopy, polyp', clinicalHistory: '', microscopic: 'Invasive adenocarcinoma', diagnosis: 'Adenocarcinoma', malignantNow: true, discipline: 'surgical' as const };
  const meta = { caseType: 'Colon', discipline: 'surgical' as const };
  const correlation = async () => {
    const r = await mockQaActivityRecordService.getAll();
    return (r.ok ? r.data : []).filter(x => x.activityTypeId === CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID);
  };
  beforeEach(() => { localStorage.clear(); vi.mocked(callAi).mockReset(); clinicalMismatchService.forgetAnswers(); });

  it('by default a high-risk mismatch comes back to be decided before release; nothing is logged', async () => {
    ai(85);
    const a = await clinicalMismatchService.atRevision(input, { caseId: 'r-high' }, [], meta);
    expect(a?.outcome).toMatchObject({ risk: 'high', holdsSignOut: true });
    expect(await correlation()).toHaveLength(0);
  });
  it('with the setting off, the same mismatch does not hold the release; it is logged as high risk, and not asked again', async () => {
    await mockClinicalMismatchRuleService.saveRevisionHoldsRelease(false);
    ai(85);
    expect(await clinicalMismatchService.atRevision(input, { caseId: 'r-off' }, [], meta)).toBeNull();
    const recs = await correlation();
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({ caseId: 'r-off', fieldValues: { resolutionStatus: 'LOGGED', risk: 'high' } });
    expect(await clinicalMismatchService.atRevision(input, { caseId: 'r-off' }, [], meta)).toBeNull();
    expect(await correlation()).toHaveLength(1);
  });
  it('a low-risk mismatch is logged and never held, whatever the setting', async () => {
    ai(64);
    expect(await clinicalMismatchService.atRevision(input, { caseId: 'r-low' }, [], meta)).toBeNull();
    expect((await correlation())[0]).toMatchObject({ fieldValues: { resolutionStatus: 'LOGGED', risk: 'low' } });
  });
  it('a decision recorded on this text means the release does not ask again', async () => {
    ai(85);
    const first = await clinicalMismatchService.atRevision(input, { caseId: 'r-dec' }, [], meta);
    await clinicalMismatchService.record({ caseId: 'r-dec', caseType: 'Colon', kind: 'unexpected-malignancy', source: 'ai', confidence: 85, risk: 'high', resolution: 'RESOLVED', inputFingerprint: first?.fingerprint });
    expect(await clinicalMismatchService.atRevision(input, { caseId: 'r-dec' }, [], meta)).toBeNull();
  });
  it('with no clinical history or indication the check is deferred, as at first sign-out', async () => {
    expect(await clinicalMismatchService.atRevision({ ...input, clinicalIndication: '', clinicalHistory: '' }, { caseId: 'r-none' }, [], meta)).toBeNull();
    expect(callAi).not.toHaveBeenCalled();
  });
  it('the report alert on an amended report says when the release will not be held', async () => {
    const a = assessment(85);
    expect((await clinicalMismatchService.forRevisionAlert(a)).releaseNotHeld).toBeUndefined();
    await mockClinicalMismatchRuleService.saveRevisionHoldsRelease(false);
    expect((await clinicalMismatchService.forRevisionAlert(a)).releaseNotHeld).toBe(true);
  });
});
