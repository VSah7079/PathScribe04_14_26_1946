// src/utils/labels/buildRequisitionLabelData.test.ts
import { describe, it, expect } from 'vitest';
import { buildRequisitionLabelData, labelPatientName } from './buildRequisitionLabelData';
import type { Case } from '@/types/case/Case';

function makeCase(overrides: Record<string, unknown> = {}): Case {
  return {
    id: 'O26-0031',
    accession: { fullAccession: 'DVMC26-0001' },
    patient: {
      givenNames: 'Maria',
      familyNames: 'Garcia',
      dateOfBirth: '1958-03-14T00:00:00.000Z',
      mrn: 'AUTO-0031',
    },
    order: {
      requestingProvider: 'Dr. Sarah Chen',
      facilityName: 'Metro General Hospital',
    },
    ...overrides,
  } as unknown as Case;
}

const fixedNow = () => '2026-08-12T20:30:00.000Z';

describe('buildRequisitionLabelData — real feature, per direct follow-up on the label-printing scope', () => {
  it('maps the real, human-facing accession number, not the internal case id', () => {
    const data = buildRequisitionLabelData(makeCase(), fixedNow);
    expect(data.fullAccession).toBe('DVMC26-0001');
  });

  it('builds the real patient name from givenNames + familyNames', () => {
    const data = buildRequisitionLabelData(makeCase(), fixedNow);
    expect(data.patientName).toBe('Maria Garcia');
  });

  it('maps dateOfBirth, mrn, requestingProvider, and submittingFacility directly', () => {
    const data = buildRequisitionLabelData(makeCase(), fixedNow);
    expect(data.dateOfBirth).toBe('1958-03-14T00:00:00.000Z');
    expect(data.mrn).toBe('AUTO-0031');
    expect(data.requestingProvider).toBe('Dr. Sarah Chen');
    expect(data.submittingFacility).toBe('Metro General Hospital');
  });

  it('uses the real, injected timestamp for printedAt, not a fresh Date.now()', () => {
    const data = buildRequisitionLabelData(makeCase(), fixedNow);
    expect(data.printedAt).toBe('2026-08-12T20:30:00.000Z');
  });

  it('never fabricates a facility name when the case genuinely has none', () => {
    const noFacility = makeCase({ order: { requestingProvider: 'Dr. X', facilityName: undefined } });
    const data = buildRequisitionLabelData(noFacility, fixedNow);
    expect(data.submittingFacility).toBe('Unknown Submitting Facility');
  });

  it('requestingProvider is genuinely undefined when never captured, not an empty string', () => {
    const noProvider = makeCase({ order: { requestingProvider: undefined, facilityName: 'X' } });
    const data = buildRequisitionLabelData(noProvider, fixedNow);
    expect(data.requestingProvider).toBeUndefined();
  });
});

describe('patient name on a label (PS-478)', () => {
  it('prints a blank, not "undefined undefined", when the patient record is missing', () => {
    const data = buildRequisitionLabelData(makeCase({ patient: undefined }), fixedNow);
    expect(data.patientName).toBe('');
    expect(data.mrn).toBe('');
    expect(data.dateOfBirth).toBe('');
  });

  it('prints a blank when both names are missing', () => {
    expect(labelPatientName({})).toBe('');
  });

  it('prints just the name that exists when one half is missing', () => {
    expect(labelPatientName({ givenNames: 'Maria' })).toBe('Maria');
    expect(labelPatientName({ familyNames: 'Garcia' })).toBe('Garcia');
  });

  it('reads the older firstName / lastName spelling', () => {
    expect(labelPatientName({ firstName: 'Maria', lastName: 'Garcia' })).toBe('Maria Garcia');
  });

  it('reads the first_name / last_name spelling', () => {
    expect(labelPatientName({ first_name: 'Maria', last_name: 'Garcia' })).toBe('Maria Garcia');
  });

  it('ignores names that are not text', () => {
    expect(labelPatientName({ givenNames: undefined, familyNames: null })).toBe('');
  });
});
