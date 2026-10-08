// PS-145 (Batch 439): the clinical-pathologic mismatch check and the pathologist's decision.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/aiIntegration/aiProviderService', () => ({ callAi: vi.fn() }));

import { callAi } from '@/services/aiIntegration/aiProviderService';
import {
  detectClinicalPathologicMismatch, parseMismatchResponse, ruleBasedMismatch, RULE_BASED_CONFIDENCE,
} from './detectClinicalPathologicMismatch';
import { clinicalMismatchProblem, qaRecordForMismatchDecision, recordClinicalMismatchDecision } from './clinicalMismatchDecision';
import { qaRecordRecommendation, CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID } from '../quality/capaRecommendationRules';

const input = (over = {}) => ({
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
    expect(await detectClinicalPathologicMismatch(input())).toEqual({ ok: true, data: { kind: 'unexpected-malignancy', confidence: 100, source: 'ai', explanation: 'Ordered as a routine polyp; carcinoma found.' } });
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

describe('the pathologist\'s decision', () => {
  const decision = (d: 'not-a-mismatch' | 'resolved' | 'unresolved', note?: string) => ({
    caseId: 'c1', caseType: 'Colon', kind: 'unexpected-malignancy' as const, source: 'ai' as const, confidence: 80, decision: d, note,
  });
  const actor = { userId: 'u-a', userName: 'Dr A' };

  it('a real mismatch needs a note', () => {
    expect(clinicalMismatchProblem(undefined, undefined)).toBe('DECISION_REQUIRED');
    expect(clinicalMismatchProblem('resolved', ' ')).toBe('NOTE_REQUIRED');
    expect(clinicalMismatchProblem('not-a-mismatch', undefined)).toBeNull();
  });
  it('not a mismatch → concordant; resolved → no CAPA; unresolved → a clinical-mismatch recommendation', () => {
    const none = qaRecordForMismatchDecision(decision('not-a-mismatch'), actor);
    const resolved = qaRecordForMismatchDecision(decision('resolved', 'Clinician confirmed the history was outdated'), actor);
    const unresolved = qaRecordForMismatchDecision(decision('unresolved', 'Nobody can explain it'), actor);
    expect(none).toMatchObject({ activityTypeId: CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID, outcome: 'concordant' });
    expect(qaRecordRecommendation(none, undefined)).toBeNull();
    expect(qaRecordRecommendation(resolved, undefined)).toBeNull();
    expect(qaRecordRecommendation(unresolved, undefined)).toEqual({ source: 'clinical-mismatch', deficiencyTypeId: 'def-clinical-pathologic-mismatch' });
  });
  it('checks case:clinical-mismatch:record and audits the decision', async () => {
    const create = vi.fn(async (r: any) => ({ ok: true as const, data: { ...r, id: 'qa1', recordedAt: 'x' } }));
    const audit = vi.fn(async () => {});
    const enforce = vi.fn(async () => ({ allowed: true }));
    const res = await recordClinicalMismatchDecision(decision('unresolved', 'Unexplained'), { qaRecords: { create }, audit, enforce, actor: () => actor });
    expect(res.ok).toBe(true);
    expect(enforce).toHaveBeenCalledWith('case:clinical-mismatch:record', { caseId: 'c1' });
    expect((audit.mock.calls[0] as any)[0]).toMatchObject({ event: 'CLINICAL_MISMATCH_DECIDED' });
    const refused = await recordClinicalMismatchDecision(decision('unresolved', 'x'), { qaRecords: { create }, audit, enforce: async () => ({ allowed: false }), actor: () => actor });
    expect(refused).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(create).toHaveBeenCalledTimes(1);
  });
});
