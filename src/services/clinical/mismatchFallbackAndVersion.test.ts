// Batch 651: the rule-based mismatch fallback is shown regardless of the AI threshold (labelled rule-based, low risk), and the
// AI instruction version reaches the QA record and the audit text.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { evaluateClinicalMismatch, DEFAULT_CLINICAL_MISMATCH_RULES } from './clinicalMismatchRules';
import { RULE_BASED_CONFIDENCE } from './detectClinicalPathologicMismatch';
import { qaRecordForMismatchDecision, clinicalMismatchAuditDetail, type ClinicalMismatchDecisionInput } from './clinicalMismatchDecision';

// Batch 679: these tests cover the score-driven thresholds and Block rules, which belong to the clinical_support profile.
beforeAll(() => { vi.stubEnv('VITE_REGULATORY_PROFILE', 'clinical_support'); });
afterAll(() => { vi.unstubAllEnvs(); });

describe('rule-based fallback display', () => {
  it('is below the default AI display threshold, yet shown, low risk, never holding sign-out', () => {
    const rules = DEFAULT_CLINICAL_MISMATCH_RULES;
    const ai = evaluateClinicalMismatch({ kind: 'unexpected-malignancy', confidence: RULE_BASED_CONFIDENCE, source: 'ai' }, [], rules);
    expect(ai.risk).toBe('suppressed');           // the AI threshold is unchanged
    const rule = evaluateClinicalMismatch({ kind: 'unexpected-malignancy', confidence: RULE_BASED_CONFIDENCE, source: 'rule' }, [], rules);
    expect(rule).toMatchObject({ risk: 'low', display: true, holdsSignOut: false, logToQa: true, action: null });
  });
});

describe('instruction version persisted', () => {
  const input: ClinicalMismatchDecisionInput = { caseId: 'c1', caseType: 'surgical', kind: 'unexpected-malignancy', source: 'ai', confidence: 82, resolution: 'RESOLVED', instructionVersion: 3 };
  it('is on the QA record and in the audit text', () => {
    const rec = qaRecordForMismatchDecision(input, { userId: 'u', userName: 'U' });
    expect(rec.fieldValues.instructionVersion).toBe(3);
    expect(clinicalMismatchAuditDetail(input)).toContain('AI instructions version 3');
  });
  it('is left out for a rule-based suggestion (no AI instructions)', () => {
    const { instructionVersion: _v, ...rest } = input;
    const rec = qaRecordForMismatchDecision({ ...rest, source: 'rule' }, { userId: 'u', userName: 'U' });
    expect('instructionVersion' in rec.fieldValues).toBe(false);
    expect(clinicalMismatchAuditDetail({ ...rest, source: 'rule' })).not.toContain('instructions version');
  });
});

import { parseMismatchResponse } from './detectClinicalPathologicMismatch';
describe('mismatch evidence quotes (Batch 683)', () => {
  const sources = { clinical: 'Indication: Benign polyp, routine follow-up.', pathology: 'Invasive ductal carcinoma, grade 2.' };
  const raw = (o: object) => JSON.stringify({ mismatch: true, kind: 'unexpected-malignancy', explanation: 'x', confidence: 80, ...o });
  it('a quote copied from the text is found; one that is not is flagged, never trusted', () => {
    const s = parseMismatchResponse(raw({ clinicalQuote: 'benign   polyp', pathologyQuote: 'metastatic melanoma' }), sources)!;
    expect(s.evidence).toEqual({ clinical: { text: 'benign   polyp', found: true }, pathology: { text: 'metastatic melanoma', found: false } });
  });
  it('a quote whose first words match but whose tail was invented is not found', () => {
    const s = parseMismatchResponse(raw({ pathologyQuote: 'Invasive ductal carcinoma, grade 3 with necrosis' }), sources)!;
    expect(s.evidence?.pathology?.found).toBe(false);
  });
  it('no quotes, or no sources, means no evidence', () => {
    expect(parseMismatchResponse(raw({ clinicalQuote: '', pathologyQuote: '' }), sources)!.evidence).toBeUndefined();
    expect(parseMismatchResponse(raw({ clinicalQuote: 'benign polyp' }))!.evidence).toBeUndefined();
  });
});

import { evidenceFieldValues } from './clinicalMismatchDecision';
describe('evidence quotes in the QA record (Batch 685)', () => {
  const base: ClinicalMismatchDecisionInput = { caseId: 'c1', caseType: 'surgical', kind: 'unexpected-malignancy', source: 'ai', resolution: 'RESOLVED' };
  const actor = { userId: 'u1', userName: 'Dr Chen' };
  it('the record keeps the two quotes and whether each was found', () => {
    const rec = qaRecordForMismatchDecision({ ...base, evidence: { clinical: { text: 'benign polyp', found: true }, pathology: { text: 'melanoma', found: false } } }, actor);
    expect(rec.fieldValues).toMatchObject({ evidenceClinical: 'benign polyp', evidenceClinicalFound: 'yes', evidencePathology: 'melanoma', evidencePathologyFound: 'no' });
  });
  it('no evidence adds no fields, and the audit text never carries the quotes', () => {
    expect(evidenceFieldValues(undefined)).toEqual({});
    expect(qaRecordForMismatchDecision(base, actor).fieldValues).not.toHaveProperty('evidenceClinical');
    expect(clinicalMismatchAuditDetail({ ...base, evidence: { clinical: { text: 'benign polyp', found: true } } })).not.toContain('benign polyp');
  });
});

import { evidenceFromFieldValues } from './clinicalMismatchDecision';
import { deferredMismatchDetails } from './clinicalMismatchInputs';
import { mockQaActivityTypeService } from '../quality/mockQaActivityTypeService';
describe('quotes read back, and old records (Batch 685 limits)', () => {
  it('round-trips through the record', () => {
    const ev = { clinical: { text: 'benign polyp', found: true }, pathology: { text: 'melanoma', found: false } };
    expect(evidenceFromFieldValues(evidenceFieldValues(ev))).toEqual(ev);
  });
  it('a record made before quotes were kept reads back as no evidence', () => {
    expect(evidenceFromFieldValues({ clinicalIndication: 'polyp' })).toBeUndefined();
    expect(evidenceFromFieldValues(undefined)).toBeUndefined();
    const d = deferredMismatchDetails({ id: 'r', caseId: 'c', caseType: 'surgical', fieldValues: { mismatchKind: 'other' }, recordedAt: 'x' } as never);
    expect(d.evidence).toBeUndefined();
  });
  it('the activity type declares the four evidence fields so exports label them', async () => {
    const types = await mockQaActivityTypeService.getAll?.();
    const ids = JSON.stringify(types ?? []);
    for (const f of ['evidenceClinical', 'evidenceClinicalFound', 'evidencePathology', 'evidencePathologyFound']) expect(ids).toContain(f);
  });
});
