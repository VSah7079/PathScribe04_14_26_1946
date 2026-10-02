// src/services/cancerRegistry/cancerRegistryMandatoryData.test.ts
import { describe, it, expect } from 'vitest';
import { cancerMandatoryHoldMessage, missingCancerRegistryMandatoryData } from './cancerRegistryMandatoryData';
import { CANCER_REGISTRY_DEFINITIONS, cancerRegistryDefinition } from './cancerRegistryDefinitions';
import { syntheticCancerSubmissions } from '../registryGoLive/syntheticTestSuite';

const complete = {
  patient: { name: 'A B', dateOfBirth: '1970-01-01' }, diagnosisDate: '2026-09-01', primaryDiagnosis: 'Adenocarcinoma',
  icdOCodes: [{ code: '8140/3', description: 'Adenocarcinoma', behaviorCode: '3' as const }],
  patientIdentifier: { formatId: 'mrn_nhs', value: '9434765919', verification: 'verified' as const, fromNationalIdentifier: true },
};

describe('cancer registry mandatory data (Batch 425)', () => {
  it('every registry requires the diagnosis, its date, an ICD-O code and the date of birth; one keyed on an identifier requires it too', () => {
    for (const d of CANCER_REGISTRY_DEFINITIONS) {
      expect(d.mandatoryFields, d.id).toEqual(expect.arrayContaining(['dateOfBirth', 'diagnosisDate', 'primaryDiagnosis', 'icdOCode']));
      expect(d.mandatoryFields.includes('patientIdentifier'), d.id).toBe(!!d.patientIdentifierFormatId);
    }
  });
  it('lists what is missing, in the registry\'s order', () => {
    const cosd = cancerRegistryDefinition('cosd_uk');
    expect(missingCancerRegistryMandatoryData(cosd, complete)).toEqual([]);
    expect(missingCancerRegistryMandatoryData(cosd, { ...complete, patientIdentifier: { ...complete.patientIdentifier, verification: 'failedChecksum' } })).toEqual(['patientIdentifier']);
    expect(missingCancerRegistryMandatoryData(cosd, { ...complete, patientIdentifier: undefined, patient: { name: 'x' }, icdOCodes: [] })).toEqual(['patientIdentifier', 'dateOfBirth', 'icdOCode']);
    // A demographics-matched registry doesn't need the identifier.
    expect(missingCancerRegistryMandatoryData(cancerRegistryDefinition('naaccr_us'), { ...complete, patientIdentifier: undefined })).toEqual([]);
    expect(cancerMandatoryHoldMessage(['dateOfBirth', 'icdOCode'], 'naaccr_us')).toBe('Held, not sent: naaccr_us requires the date of birth; an ICD-O code. Record it on the case and resend.');
  });
  it('the synthetic test suite\'s cancer cases meet every registry\'s mandatory data', () => {
    for (const d of CANCER_REGISTRY_DEFINITIONS) {
      for (const s of syntheticCancerSubmissions(d, { facilityId: 'f', now: new Date('2026-10-01T00:00:00Z') })) {
        expect(missingCancerRegistryMandatoryData(d, s.body as any), `${d.id} ${s.caseRef}`).toEqual([]);
      }
    }
  });
});
