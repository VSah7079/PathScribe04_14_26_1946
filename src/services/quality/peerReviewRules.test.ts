// PS-144 (Batch 439): peer review before sign-out — the decisions.
import { describe, it, expect } from 'vitest';
import {
  statesMalignancy, mentionsMalignancy, firstTimeMalignancy, malignantNow, peerReviewGateOn, peerReviewerOptions,
  requestProblem, readProblem, resolutionProblem, withdrawProblem, overrideProblem, retrospectiveDueAt,
  peerReviewState, peerReviewBlocksSignOut, qaRecordForCompletedReview, currentRequest, peerReviewGateSettingsChange,
  PRE_SIGN_OUT_PEER_REVIEW_ACTIVITY_TYPE_ID, DEFAULT_PEER_REVIEW_GATE_SETTINGS,
} from './peerReviewRules';
import type { PeerReviewRequest } from '@/types/quality/PeerReview';

const A = { userId: 'u-a', userName: 'Dr A' };
const B = { userId: 'u-b', userName: 'Dr B' };
const req = (over: Partial<PeerReviewRequest> = {}): PeerReviewRequest => ({
  id: 'r1', caseId: 'c1', trigger: 'first-time-malignancy', primaryPathologist: A, reviewer: B,
  status: 'pending', requestedAt: '2026-10-02T10:00:00.000Z', ...over,
});

describe('malignancy in text', () => {
  it('an established malignancy counts; negated or tentative mentions do not', () => {
    expect(statesMalignancy('Invasive ductal carcinoma, grade 2')).toBe(true);
    expect(statesMalignancy('Benign-appearing mucosa with invasive adenocarcinoma')).toBe(true);
    expect(statesMalignancy('Negative for carcinoma')).toBe(false);
    expect(statesMalignancy('No evidence of malignancy')).toBe(false);
    expect(statesMalignancy('Rule out lymphoma')).toBe(false);
    expect(statesMalignancy('Suspicious for melanoma')).toBe(false);
    expect(statesMalignancy('Tubular adenoma. No carcinoma. History of melanoma (2019).')).toBe(true);
    expect(statesMalignancy(undefined)).toBe(false);
  });
  it('a mention of any kind means the clinician was considering it', () => {
    expect(mentionsMalignancy('r/o lymphoma')).toBe(true);
    expect(mentionsMalignancy('Routine colon polyp')).toBe(false);
  });
});

describe('first-time malignancy (Pete: judged from the patient\'s prior cases)', () => {
  it('not malignant now → no trigger', () => {
    expect(firstTimeMalignancy({ malignantNow: false, priorCases: [] }).reason).toBe('not-malignant');
  });
  it('a prior malignant case (confirmed, or by its diagnosis) → not first-time', () => {
    const r = firstTimeMalignancy({ malignantNow: true, priorCases: [
      { id: 'p1', diagnostic: { primaryDiagnosis: 'Benign' } },
      { id: 'p2', abnormalDetectionStatus: { severity: 'Malignant' } },
      { id: 'p3', diagnostic: { primaryDiagnosis: 'Metastatic carcinoma' } },
    ] });
    expect(r).toEqual({ firstTime: false, reason: 'prior-malignant-case', priorMalignantCaseIds: ['p2', 'p3'] });
  });
  it('a known malignancy in the order\'s clinical history or indication → not first-time', () => {
    expect(firstTimeMalignancy({ malignantNow: true, priorCases: [], clinicalHistory: [{ historyCode: null, categoryCode: 'MAL_STAGE', metadata: {} }] }).reason).toBe('known-from-history');
    expect(firstTimeMalignancy({ malignantNow: true, priorCases: [], clinicalIndication: 'Known breast carcinoma, restaging' }).reason).toBe('known-from-history');
    expect(firstTimeMalignancy({ malignantNow: true, priorCases: [], clinicalIndication: 'Rule out carcinoma' }).firstTime).toBe(true);
  });
  it('malignant now and nothing before → first-time', () => {
    expect(firstTimeMalignancy({ malignantNow: true, priorCases: [{ id: 'p1', diagnostic: { primaryDiagnosis: 'Negative for malignancy' } }] }).firstTime).toBe(true);
  });
  it('malignant now: the confirmed status, or a Malignant finding this session', () => {
    expect(malignantNow({ abnormalDetectionStatus: { severity: 'Malignant' } })).toBe(true);
    expect(malignantNow({ abnormalDetectionStatus: { severity: 'Critical' } }, [{ severity: 'Malignant' }])).toBe(true);
    expect(malignantNow({}, [{ severity: 'Critical' }])).toBe(false);
  });
});

describe('the gate setting (Pete: per facility or department, off by default)', () => {
  it('off by default; most specific wins', () => {
    expect(peerReviewGateOn(DEFAULT_PEER_REVIEW_GATE_SETTINGS, 'f1', 'breast')).toBe(false);
    const s = { orgDefault: false, facilities: { f1: true }, subspecialties: { breast: false } };
    expect(peerReviewGateOn(s, 'f1', 'gi')).toBe(true);
    expect(peerReviewGateOn(s, 'f1', 'breast')).toBe(false);
    expect(peerReviewGateOn({ ...s, orgDefault: true }, 'f2', undefined)).toBe(true);
  });
  it('describes a change for the audit log', () => {
    expect(peerReviewGateSettingsChange(DEFAULT_PEER_REVIEW_GATE_SETTINGS, DEFAULT_PEER_REVIEW_GATE_SETTINGS)).toBeNull();
    expect(peerReviewGateSettingsChange(DEFAULT_PEER_REVIEW_GATE_SETTINGS, { orgDefault: false, facilities: { f1: true }, subspecialties: {} }))
      .toBe('Peer review sign-out gate: facility f1 inherits → on.');
  });
});

describe('requests', () => {
  it('reviewers: active pathologists other than the signer', () => {
    // Staff records hold role names, matched to the catalog by name.
    const catalog = [{ id: 'pathologist', name: 'Pathologist' }, { id: 'pa', name: "Pathologists' Assistant (PA)" }];
    const staff = [
      { id: 'u-a', firstName: 'Ann', lastName: 'A', roles: ['Pathologist'] },
      { id: 'u-b', firstName: 'Ben', lastName: 'B', roles: ['Pathologist', 'Admin'], status: 'Active' },
      { id: 'u-c', firstName: 'Cal', lastName: 'C', roles: ['Pathologist'], status: 'Inactive' },
      { id: 'u-d', firstName: 'Dee', lastName: 'D', roles: ["Pathologists' Assistant (PA)"] },
    ];
    expect(peerReviewerOptions(staff, 'u-a', catalog)).toEqual([{ userId: 'u-b', userName: 'Ben B' }]);
  });
  it('the reviewer is never the signer; one open request per case', () => {
    expect(requestProblem([], { caseId: 'c1', primaryPathologistId: 'u-a', reviewerId: '' })).toBe('REVIEWER_REQUIRED');
    expect(requestProblem([], { caseId: 'c1', primaryPathologistId: 'u-a', reviewerId: 'u-a' })).toBe('REVIEWER_IS_SIGNER');
    expect(requestProblem([req()], { caseId: 'c1', primaryPathologistId: 'u-a', reviewerId: 'u-b' })).toBe('ALREADY_REQUESTED');
    expect(requestProblem([req({ status: 'completed' })], { caseId: 'c1', primaryPathologistId: 'u-a', reviewerId: 'u-b' })).toBeNull();
  });
  it('only the reviewer records the read; a disagreement needs their diagnosis and severity', () => {
    expect(readProblem(req(), 'u-a', { agrees: true })).toBe('NOT_REVIEWER');
    expect(readProblem(req(), 'u-b', { agrees: false, diagnosis: ' ' })).toBe('DIAGNOSIS_REQUIRED');
    expect(readProblem(req(), 'u-b', { agrees: false, diagnosis: 'DCIS only' })).toBe('SEVERITY_REQUIRED');
    expect(readProblem(req(), 'u-b', { agrees: false, diagnosis: 'DCIS only', severity: 'high' })).toBeNull();
    expect(readProblem(req({ status: 'completed' }), 'u-b', { agrees: true })).toBe('NOT_PENDING');
  });
  it('either pathologist records the consensus; unresolved needs a note', () => {
    const d = req({ status: 'disagreement' });
    expect(resolutionProblem(req(), 'u-a', { result: 'unresolved', note: 'x' })).toBe('NOT_IN_DISAGREEMENT');
    expect(resolutionProblem(d, 'u-z', { result: 'unresolved', note: 'x' })).toBe('NOT_A_PARTY');
    expect(resolutionProblem(d, 'u-a', { result: 'consensus-reached', consensusDiagnosis: '' })).toBe('CONSENSUS_DIAGNOSIS_REQUIRED');
    expect(resolutionProblem(d, 'u-b', { result: 'unresolved', note: '' })).toBe('RESOLUTION_NOTE_REQUIRED');
    expect(resolutionProblem(d, 'u-a', { result: 'consensus-reached', consensusDiagnosis: 'Invasive carcinoma' })).toBeNull();
  });
  it('withdrawing: the requester, while pending, with a reason', () => {
    expect(withdrawProblem(req(), 'u-b', 'x')).toBe('NOT_REQUESTER');
    expect(withdrawProblem(req(), 'u-a', '')).toBe('REASON_REQUIRED');
    expect(withdrawProblem(req({ status: 'disagreement' }), 'u-a', 'x')).toBe('NOT_PENDING');
  });
  it('the current request ignores withdrawn ones', () => {
    expect(currentRequest([req({ id: 'old', status: 'withdrawn', requestedAt: '2026-10-02T11:00:00.000Z' }), req()], 'c1')?.id).toBe('r1');
  });
  it('the urgent-care override needs a reason (and a note for "other"); the review is owed in 24 hours', () => {
    expect(overrideProblem(undefined, undefined)).toBe('OVERRIDE_REASON_REQUIRED');
    expect(overrideProblem('other-urgent-care', ' ')).toBe('REASON_REQUIRED');
    expect(overrideProblem('immediate-surgery', undefined)).toBeNull();
    expect(retrospectiveDueAt(new Date('2026-10-02T10:00:00.000Z'))).toBe('2026-10-03T10:00:00.000Z');
  });
});

describe('the sign-out gate', () => {
  it('states', () => {
    expect(peerReviewState({ firstTime: false, overrides: [] })).toBe('not-required');
    expect(peerReviewState({ firstTime: true, overrides: [] })).toBe('needs-request');
    expect(peerReviewState({ firstTime: true, request: req(), overrides: [] })).toBe('pending');
    expect(peerReviewState({ firstTime: false, request: req({ status: 'disagreement' }), overrides: [] })).toBe('disagreement');
    expect(peerReviewState({ firstTime: true, request: req({ status: 'completed' }), overrides: [] })).toBe('clear');
    expect(peerReviewState({ firstTime: true, overrides: [{ id: 'o', caseId: 'c1', reason: 'immediate-surgery', by: A, at: '', retrospectiveDueAt: '' }] })).toBe('overridden');
  });
  it('blocks only when the gate is on and the review isn\'t done (off by default: never blocks)', () => {
    expect(peerReviewBlocksSignOut(false, 'needs-request')).toBe(false);
    expect(peerReviewBlocksSignOut(true, 'needs-request')).toBe(true);
    expect(peerReviewBlocksSignOut(true, 'disagreement')).toBe(true);
    expect(peerReviewBlocksSignOut(true, 'overridden')).toBe(false);
    expect(peerReviewBlocksSignOut(true, 'clear')).toBe(false);
  });
});

describe('the QA record a completed review writes', () => {
  const meta = { caseType: 'Breast', subspecialtyId: 'breast', primaryDiagnosis: 'Invasive carcinoma' };
  it('agreement: concordant, the primary is the reviewed pathologist', () => {
    const r = qaRecordForCompletedReview(req({ status: 'completed', result: 'concordant' }), meta);
    expect(r).toMatchObject({ activityTypeId: PRE_SIGN_OUT_PEER_REVIEW_ACTIVITY_TYPE_ID, outcome: 'concordant', recordedBy: B, reviewedPathologist: A, postSignOut: false });
    expect(r.consensus).toBeUndefined();
  });
  it('disagreement: discordant with its consensus outcome', () => {
    expect(qaRecordForCompletedReview(req({ status: 'completed', result: 'consensus-reached', reviewerDiagnosis: 'DCIS', disagreementSeverity: 'high', consensusDiagnosis: 'Invasive carcinoma' }), meta))
      .toMatchObject({ outcome: 'discordant', consensus: 'consensus-reached', severity: 'high', fieldValues: { consensusDiagnosis: 'Invasive carcinoma', reviewerDiagnosis: 'DCIS' } });
    expect(qaRecordForCompletedReview(req({ status: 'completed', result: 'unresolved', reviewerDiagnosis: 'DCIS', disagreementSeverity: 'high', resolutionNote: 'Outside expert split' }), meta))
      .toMatchObject({ outcome: 'discordant', consensus: 'unresolved', comments: 'Outside expert split' });
  });
});
