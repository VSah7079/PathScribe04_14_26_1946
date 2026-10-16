// Batch 523 (PS-145, decision 15): what the mismatch check compares at each sign-out.
import { describe, it, expect, vi } from 'vitest';
import type { Case } from '@/types/case/Case';
import { autopsyMismatchInput, cytologyMismatchInput, mismatchAlreadyDecided, surgicalMismatchInput } from './clinicalMismatchInputs';
import { CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID } from '../quality/capaRecommendationRules';
import { cytologyClinicalMismatch } from '../cytology/cytologyClinicalMismatch';
import { evaluateClinicalMismatch, DEFAULT_CLINICAL_MISMATCH_RULES } from './clinicalMismatchRules';

const CASE = {
  id: 'c1',
  patient: { firstName: 'Ana', lastName: 'Ruiz', mrn: 'MRN-9' },
  order: { clinicalIndication: 'Routine screen', clinicalHistory: [{ categoryCode: 'SCR', historyCode: 'Annual' }] },
  diagnostic: { microscopicDescription: 'Sheets of atypical cells', primaryDiagnosis: 'Adenocarcinoma' },
  abnormalDetectionStatus: { severity: 'Malignant' },
  autopsy: { organTags: [
    { organCode: 'lung', status: 'abnormal', finding: 'Saddle embolus' },
    { organCode: 'heart', status: 'normal', finding: 'Unremarkable' },
  ] },
  orchSections: [{ label: 'Final anatomic diagnosis', text: 'Pulmonary thromboembolism' }, { label: 'Gross', text: '' }],
} as unknown as Case;

const CATS = [
  { id: 'nilm', label: 'NILM', description: 'Negative for intraepithelial lesion or malignancy', diagnosticRank: 0 },
  { id: 'hsil', label: 'HSIL', description: 'High-grade squamous intraepithelial lesion', diagnosticRank: 4 },
  { id: 'scc', label: 'SCC', description: 'Squamous cell carcinoma', diagnosticRank: 5 },
  { id: 'other-mal', label: 'Other', description: 'Other malignant neoplasm', suggestedAbnormalSeverity: 'Malignant' as const },
];

describe('what is compared', () => {
  it('surgical: as in Batch 439, and no patient identifier', () => {
    const i = surgicalMismatchInput(CASE);
    expect(i).toMatchObject({ clinicalIndication: 'Routine screen', clinicalHistory: 'Screening: Annual', microscopic: 'Sheets of atypical cells', diagnosis: 'Adenocarcinoma', malignantNow: true, discipline: 'surgical' });
    expect(JSON.stringify(i)).not.toMatch(/Ruiz|MRN-9/);
  });
  it('cytology: the final interpretations; malignant is a frank malignancy, not HSIL', () => {
    const hsil = cytologyMismatchInput(CASE, { primaryInterpretationId: 'hsil', primaryInterpretationComment: 'Few cells' }, CATS as never, true);
    expect(hsil).toMatchObject({ diagnosis: 'High-grade squamous intraepithelial lesion', microscopic: 'Few cells', malignantNow: false, discipline: 'cytology', gynScreening: true });
    expect(cytologyMismatchInput(CASE, { primaryInterpretationId: 'scc' }, CATS as never, true).malignantNow).toBe(true);
    expect(cytologyMismatchInput(CASE, { primaryInterpretationId: 'nilm', additionalInterpretations: [{ categoryId: 'other-mal' }] }, CATS as never, false).malignantNow).toBe(true);
  });
  it('autopsy: the report sections as on screen, and the abnormal organ findings', () => {
    const i = autopsyMismatchInput(CASE);
    expect(i.diagnosis).toContain('Final anatomic diagnosis: Pulmonary thromboembolism');
    expect(i.diagnosis).not.toContain('Gross');
    expect(i.microscopic).toContain('lung: Saddle embolus');
    expect(i.microscopic).not.toContain('Unremarkable');
    expect(i.discipline).toBe('autopsy');
    expect(autopsyMismatchInput(CASE, [{ label: 'FAD', text: 'Edited on screen' }]).diagnosis).toContain('FAD: Edited on screen');
  });
});

describe('decided once', () => {
  const rec = (caseId: string, specimenId?: string) => ({ caseId, activityTypeId: CLINICAL_PATHOLOGIC_CORRELATION_ACTIVITY_TYPE_ID, fieldValues: (specimenId ? { specimenId } : {}) as Record<string, string> });
  it('per case for surgical and autopsy; per specimen for cytology', () => {
    expect(mismatchAlreadyDecided([rec('c1')], 'c1')).toBe(true);
    expect(mismatchAlreadyDecided([rec('c2')], 'c1')).toBe(false);
    expect(mismatchAlreadyDecided([rec('c1', 'sp-1')], 'c1', 'sp-1')).toBe(true);
    expect(mismatchAlreadyDecided([rec('c1', 'sp-1')], 'c1', 'sp-2')).toBe(false);
  });
});

describe('the cytology sign-out check', () => {
  const base = { caseData: CASE, specimenId: 'sp-1', categories: CATS as never, gynScreening: false, finalReview: { primaryInterpretationId: 'scc' } };
  it('pathologist track only, once per specimen', async () => {
    const suggestion = { kind: 'unexpected-malignancy' as const, confidence: 70, source: 'ai' as const };
    const pending = vi.fn(async () => ({ suggestion, outcome: evaluateClinicalMismatch(suggestion, [], DEFAULT_CLINICAL_MISMATCH_RULES) }));
    expect(await cytologyClinicalMismatch({ ...base, isPathologist: false }, pending)).toBeNull();
    expect(pending).not.toHaveBeenCalled();
    expect(await cytologyClinicalMismatch({ ...base, isPathologist: true, finalReview: undefined }, pending)).toBeNull();
    expect((await cytologyClinicalMismatch({ ...base, isPathologist: true }, pending))?.suggestion.kind).toBe('unexpected-malignancy');
    expect(pending).toHaveBeenCalledWith(expect.objectContaining({ discipline: 'cytology', malignantNow: true }), { caseId: 'c1', specimenId: 'sp-1' }, [], expect.objectContaining({ discipline: 'cytology' }));
  });
});
