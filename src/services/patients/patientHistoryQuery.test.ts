// src/services/patients/patientHistoryQuery.test.ts
import { describe, it, expect } from 'vitest';
import { queryRealPatientHistory, toPatientHistoryCase } from './patientHistoryQuery';

describe('queryRealPatientHistory — real fix: replaces MOCK_PRIOR_PATHOLOGY with a genuine query by real patient identity', () => {
  const cases = [
    { id: 'S26-1', patient: { id: 'MPI-A' }, diagnostic: { primaryDiagnosis: 'Invasive ductal carcinoma', issuedDate: '2026-01-01T00:00:00.000Z' } },
    { id: 'S26-2', patient: { id: 'MPI-A' }, diagnostic: { primaryDiagnosis: 'Fibroadenoma', issuedDate: '2026-03-01T00:00:00.000Z' } },
    { id: 'S26-3', patient: { id: 'MPI-B' }, diagnostic: { primaryDiagnosis: 'Unrelated patient case', issuedDate: '2026-02-01T00:00:00.000Z' } },
  ];

  it('returns only real cases genuinely belonging to this patient identity', () => {
    const result = queryRealPatientHistory(cases, ['MPI-A']);
    expect(result.map(r => r.id).sort()).toEqual(['S26-1', 'S26-2']);
  });

  it('excludes a genuinely unrelated patient\'s case, even with similar-looking data', () => {
    const result = queryRealPatientHistory(cases, ['MPI-A']);
    expect(result.find(r => r.id === 'S26-3')).toBeUndefined();
  });

  it('the real point of the Link feature: includes cases from every linked identity, not just the one on screen', () => {
    const result = queryRealPatientHistory(cases, ['MPI-A', 'MPI-B']);
    expect(result.map(r => r.id).sort()).toEqual(['S26-1', 'S26-2', 'S26-3']);
  });

  it('excludes the case currently being viewed - history means the patient\'s OTHER cases', () => {
    const result = queryRealPatientHistory(cases, ['MPI-A'], 'S26-1');
    expect(result.map(r => r.id)).toEqual(['S26-2']);
  });

  it('sorts most-recent-first, matching what a reviewer actually wants', () => {
    const result = queryRealPatientHistory(cases, ['MPI-A']);
    expect(result[0].id).toBe('S26-2'); // later date
    expect(result[1].id).toBe('S26-1');
  });

  it('a case with no real patient id at all is never included - never a guess', () => {
    const withMissing = [...cases, { id: 'S26-4', patient: {}, diagnostic: {} }];
    const result = queryRealPatientHistory(withMissing, ['MPI-A']);
    expect(result.find(r => r.id === 'S26-4')).toBeUndefined();
  });
});

describe('toPatientHistoryCase — real fix: honest mapping from real Case fields, nothing fabricated', () => {
  it('maps real, existing biomarker fields into a real, readable receptors string', () => {
    const result = toPatientHistoryCase({
      id: 'S26-1',
      diagnostic: { synoptic: { biomarkers: { er: 'Positive', pr: 'Negative', her2: 'Negative', ki67: '15%' } } },
    });
    expect(result.receptors).toBe('ER Positive, PR Negative, HER2 Negative');
    expect(result.ki67).toBe('15%');
  });

  it('leaves genuinely unmapped fields as real, honest empty defaults rather than fabricated text', () => {
    const result = toPatientHistoryCase({ id: 'S26-1' });
    expect(result.comment).toBe('');
    expect(result.nodes).toBe('');
    expect(result.tags).toEqual([]);
  });

  it('falls back to order.receivedDate when no real issuedDate exists yet', () => {
    const result = toPatientHistoryCase({ id: 'S26-1', order: { receivedDate: '2026-01-01T00:00:00.000Z' } });
    expect(result.date).toBe('2026-01-01T00:00:00.000Z');
  });
});
