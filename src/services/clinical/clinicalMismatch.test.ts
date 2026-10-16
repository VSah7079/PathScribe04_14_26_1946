// PS-145 (Batch 439): the clinical-pathologic mismatch check and the pathologist's decision.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/aiIntegration/aiProviderService', () => ({ callAi: vi.fn() }));

import { callAi } from '@/services/aiIntegration/aiProviderService';
import {
  detectClinicalPathologicMismatch, mismatchPrompt, parseMismatchResponse, ruleBasedMismatch, RULE_BASED_CONFIDENCE,
} from './detectClinicalPathologicMismatch';
import { clinicalMismatchProblem, qaRecordForMismatchDecision, recordClinicalMismatchDecision, logLowRiskMismatch } from './clinicalMismatchDecision';
import { qaRecordRecommendation, CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID } from '../quality/capaRecommendationRules';

const input = (over: Partial<import('./detectClinicalPathologicMismatch').ClinicalMismatchInput> = {}) => ({
  clinicalIndication: 'Routine screening colonoscopy, polyp', clinicalHistory: '', microscopic: 'Invasive adenocarcinoma arising in a tubular adenoma',
  diagnosis: 'Adenocarcinoma', malignantNow: true, ...over,
});
const ai = (body: object) => vi.mocked(callAi).mockResolvedValueOnce({ text: JSON.stringify(body), provider: 'structured_messages' as never, model: 'm' } as never);

describe('detectClinicalPathologicMismatch', () => {
  beforeEach(() => vi.mocked(callAi).mockReset());

  it('nothing clinical to compare → no suggestion, no model call', async () => {
    expect(await detectClinicalPathologicMismatch(input({ clinicalIndication: '' }))).toEqual({ ok: true, data: null });
    expect(callAi).not.toHaveBeenCalled();
  });
  it('passes on the model\'s suggestion with its confidence; clamps and checks it', async () => {
    ai({ mismatch: true, kind: 'unexpected-malignancy', explanation: 'Ordered as a routine polyp; carcinoma found.', confidence: 140 });
    // Batch 536: with the version of the approved instructions it answered (0: PathScribe's own).
    expect(await detectClinicalPathologicMismatch(input())).toEqual({ ok: true, data: { kind: 'unexpected-malignancy', confidence: 100, source: 'ai', explanation: 'Ordered as a routine polyp; carcinoma found.', instructionVersion: 0 } });
  });
  it('no mismatch, or too little confidence → nothing shown', () => {
    expect(parseMismatchResponse(JSON.stringify({ mismatch: false }))).toBeNull();
    expect(parseMismatchResponse(JSON.stringify({ mismatch: true, kind: 'other', confidence: 20 }))).toBeNull();
    expect(parseMismatchResponse(JSON.stringify({ mismatch: true, kind: 'made-up', confidence: 60 }))?.kind).toBe('other');
  });
  it('the AI unreachable → the narrow rule-based check, labelled with a modest confidence', async () => {
    vi.mocked(callAi).mockRejectedValueOnce(new Error('no provider'));
    expect(await detectClinicalPathologicMismatch(input())).toEqual({ ok: true, data: { kind: 'unexpected-malignancy', confidence: RULE_BASED_CONFIDENCE, source: 'rule' } });
  });
  it('the rule never fires when the clinician raised malignancy, even to rule it out (not a blunt keyword match)', () => {
    expect(ruleBasedMismatch(input({ clinicalIndication: 'Polyp, rule out carcinoma' }))).toBeNull();
    expect(ruleBasedMismatch(input({ clinicalIndication: 'Mass on CT' }))).toBeNull();
    expect(ruleBasedMismatch(input({ malignantNow: false }))).toBeNull();
  });
});

describe('the pathologist\'s decision (Batch 530: resolution status)', () => {
  const decision = (resolution: 'RESOLVED' | 'UNRESOLVED' | 'DEFERRED', extra: Record<string, unknown> = {}) => ({
    caseId: 'c1', caseType: 'Colon', kind: 'unexpected-malignancy' as const, source: 'ai' as const, confidence: 80, resolution, ...extra,
  });
  const actor = { userId: 'u-a', userName: 'Dr A' };

  it('a decision is needed; DEFERRED is for low risk only; the note and the reason are optional', () => {
    expect(clinicalMismatchProblem(undefined, 'high')).toBe('DECISION_REQUIRED');
    expect(clinicalMismatchProblem('LOGGED', 'low')).toBe('DECISION_REQUIRED');
    expect(clinicalMismatchProblem('DEFERRED', 'high')).toBe('DEFER_HIGH_RISK');
    expect(clinicalMismatchProblem('DEFERRED', 'low')).toBeNull();
    expect(clinicalMismatchProblem('UNRESOLVED', 'high')).toBeNull();
    expect(clinicalMismatchProblem('RESOLVED', 'low', 'expected-variation')).toBeNull();
    expect(clinicalMismatchProblem('RESOLVED', 'low', 'because')).toBe('UNKNOWN_REASON');
  });
  it('RESOLVED → no CAPA; UNRESOLVED → a clinical-mismatch recommendation; DEFERRED → none yet', () => {
    const resolved = qaRecordForMismatchDecision(decision('RESOLVED', { quickReason: 'expected-variation' }), actor);
    const unresolved = qaRecordForMismatchDecision(decision('UNRESOLVED', { risk: 'high' }), actor);
    const deferred = qaRecordForMismatchDecision(decision('DEFERRED', { risk: 'low' }), actor);
    expect(resolved).toMatchObject({ activityTypeId: CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID, consensus: 'consensus-reached', fieldValues: { resolutionStatus: 'RESOLVED', quickReason: 'expected-variation' } });
    expect(qaRecordRecommendation(resolved, undefined)).toBeNull();
    expect(qaRecordRecommendation(unresolved, undefined)).toEqual({ source: 'clinical-mismatch', deficiencyTypeId: 'def-clinical-pathologic-mismatch' });
    expect(deferred.consensus).toBeUndefined();
    expect(qaRecordRecommendation(deferred, undefined)).toBeNull();
  });
  it('checks case:clinical-mismatch:record and audits the decision; a deferral has its own event', async () => {
    const create = vi.fn(async (r: any) => ({ ok: true as const, data: { ...r, id: 'qa1', recordedAt: 'x' } }));
    const audit = vi.fn(async () => {});
    const enforce = vi.fn(async () => ({ allowed: true }));
    const res = await recordClinicalMismatchDecision(decision('UNRESOLVED', { risk: 'high' }), { qaRecords: { create }, audit, enforce, actor: () => actor });
    expect(res.ok).toBe(true);
    expect(enforce).toHaveBeenCalledWith('case:clinical-mismatch:record', { caseId: 'c1' });
    expect((audit.mock.calls[0] as any)[0]).toMatchObject({ event: 'CLINICAL_MISMATCH_DECIDED', detail: expect.stringContaining('UNRESOLVED') });
    await recordClinicalMismatchDecision(decision('DEFERRED', { risk: 'low' }), { qaRecords: { create }, audit, enforce, actor: () => actor });
    expect((audit.mock.calls[1] as any)[0]).toMatchObject({ event: 'CLINICAL_MISMATCH_DEFERRED' });
    const refused = await recordClinicalMismatchDecision(decision('UNRESOLVED'), { qaRecords: { create }, audit, enforce: async () => ({ allowed: false }), actor: () => actor });
    expect(refused).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await recordClinicalMismatchDecision(decision('DEFERRED', { risk: 'high' }), { qaRecords: { create }, audit, enforce, actor: () => actor })).toEqual({ ok: false, error: 'DEFER_HIGH_RISK' });
    expect(create).toHaveBeenCalledTimes(2);
  });
  it('a low-risk mismatch left undecided is logged at sign-out, without a capability check', async () => {
    const create = vi.fn(async (r: any) => ({ ok: true as const, data: { ...r, id: 'qa2', recordedAt: 'x' } }));
    const audit = vi.fn(async () => {});
    await logLowRiskMismatch({ caseId: 'c1', caseType: 'Colon', kind: 'other', source: 'ai', confidence: 62, risk: 'low' }, { qaRecords: { create }, audit, actor: () => actor });
    expect(create.mock.calls[0][0]).toMatchObject({ fieldValues: { resolutionStatus: 'LOGGED', risk: 'low' } });
    expect((audit.mock.calls[0] as any)[0]).toMatchObject({ event: 'CLINICAL_MISMATCH_LOGGED' });
  });
});

// Batch 523 (PS-145, decision 15): the check at cytology and autopsy sign-out.
describe('by discipline (Batch 523)', () => {
  beforeEach(() => vi.mocked(callAi).mockReset());

  it('cytology: an abnormal GYN screen is never "unexpected"; the prompt says so', async () => {
    const cyto = input({ clinicalIndication: 'Routine cervical screening', microscopic: '', diagnosis: 'Squamous cell carcinoma', discipline: 'cytology', gynScreening: true });
    expect(ruleBasedMismatch(cyto)).toBeNull();
    const prompt = mismatchPrompt(cyto);
    expect(prompt).toContain('CYTOLOGY INTERPRETATION: Squamous cell carcinoma');
    expect(prompt).toContain('is what screening is for');
    expect(prompt).not.toContain('FROZEN SECTION');
  });
  it('cytology, non-GYN: the rule ignores screening words but still sees a benign-leaning request', () => {
    expect(ruleBasedMismatch(input({ clinicalIndication: 'Surveillance', discipline: 'cytology' }))).toBeNull();
    expect(ruleBasedMismatch(input({ clinicalIndication: 'Thyroid nodule, benign appearing', discipline: 'cytology' }))?.kind).toBe('unexpected-malignancy');
  });
  it('autopsy: cause of death compared with the anatomic diagnoses; no rule-based fallback', async () => {
    const autopsy = input({ clinicalIndication: 'Clinical cause of death: myocardial infarction', microscopic: 'Saddle pulmonary embolus', diagnosis: 'Pulmonary thromboembolism', malignantNow: false, discipline: 'autopsy' });
    const prompt = mismatchPrompt(autopsy);
    expect(prompt).toContain('CLINICAL HISTORY AND CLINICAL CAUSE OF DEATH: Clinical cause of death: myocardial infarction');
    expect(prompt).toContain('"cause-of-death"');
    expect(prompt).toContain('Goldman class I or II');
    expect(ruleBasedMismatch({ ...autopsy, malignantNow: true, clinicalIndication: 'benign' })).toBeNull();
    vi.mocked(callAi).mockRejectedValueOnce(new Error('no provider'));
    expect(await detectClinicalPathologicMismatch(autopsy)).toEqual({ ok: true, data: null });
    ai({ mismatch: true, kind: 'cause-of-death', explanation: 'MI expected; pulmonary embolus found.', confidence: 77 });
    expect(await detectClinicalPathologicMismatch(autopsy)).toMatchObject({ ok: true, data: { kind: 'cause-of-death', confidence: 77 } });
  });
  it('surgical keeps the Batch 439 prompt: the frozen-section line and the four kinds', () => {
    const prompt = mismatchPrompt(input({ frozenImpression: 'Benign' }));
    expect(prompt).toContain('FROZEN SECTION IMPRESSION: Benign');
    expect(prompt).not.toContain('cause-of-death');
  });
  it('the decision records the discipline and the cytology specimen', () => {
    const rec = qaRecordForMismatchDecision({ caseId: 'c1', caseType: 'Cervix', kind: 'site-or-organ', source: 'ai', resolution: 'RESOLVED', note: 'Relabelled', discipline: 'cytology', specimenId: 'sp-1' }, { userId: 'u', userName: 'U' });
    expect(rec.fieldValues).toMatchObject({ discipline: 'cytology', specimenId: 'sp-1' });
  });
});
