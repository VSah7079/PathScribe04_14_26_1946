import { describe, expect, it } from 'vitest';
import { payloadToBatchRecord } from './batchRecordSource';

// Batch 620 part S (PS-800): the registry report payload as one flat record.
describe('payloadToBatchRecord', () => {
  it('flattens the payload, joining lists with " | " and turning missing values into empty strings', () => {
    const r = payloadToBatchRecord({
      patient: { mrn: 'M1', name: 'A B', dateOfBirth: '1980-01-02' }, accessionNumber: 'S1', screeningDate: '2026-10-01', specimenAdequacy: ['S', 'T'],
      primaryInterpretation: 'NILM', additionalInterpretations: [], recommendations: ['R1', '', 'R2'], facilityId: 'F1',
    } as never, 'CORRECTION', '2026-10-02T00:00:00.000Z');
    expect(r).toMatchObject({
      patientIdentifier: 'M1', patientName: 'A B', dateOfBirth: '1980-01-02', accessionNumber: 'S1', specimenAdequacy: 'S | T', additionalInterpretations: '',
      recommendations: 'R1 | R2', hpvResult: '', facilityName: '', facilityId: 'F1', submissionKind: 'CORRECTION', signedOutAt: '2026-10-02T00:00:00.000Z',
    });
  });
});
