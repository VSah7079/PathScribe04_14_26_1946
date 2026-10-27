// src/services/cosd/cosdSample.ts
// Batch 620 (part C, PS-800): a sample UK submission typed into the check panel on Configuration > System, as the registry payload
// PathScribe builds from a real case. Pure. It names no real case and the sample is never queued or sent.
import type { CancerRegistryReportPayload } from '../cancerRegistry/buildCancerRegistryReportPayload';
import { resolveIcdOBehaviorCode } from '../cancerRegistry/resolveIcdOBehaviorCode';

export interface CosdSampleFields { nhsNumber: string; dateOfBirth: string; diagnosisDate: string; icdO: string; primaryDiagnosis: string }

export function samplePayload(fields: CosdSampleFields, now: Date): CancerRegistryReportPayload {
  const code = fields.icdO.trim();
  const nhs = fields.nhsNumber.trim();
  return {
    messageId: 'sample', timestamp: now.toISOString(), registryId: 'cosd_uk', facilityId: 'sample',
    patient: { name: '', dateOfBirth: fields.dateOfBirth || undefined },
    accessionNumber: 'SAMPLE', diagnosisDate: fields.diagnosisDate || undefined, primaryDiagnosis: fields.primaryDiagnosis,
    icdOCodes: code ? [{ code, description: '', behaviorCode: resolveIcdOBehaviorCode(code) }] : [], icd10Codes: [],
    ...(nhs ? { patientIdentifier: { formatId: 'mrn_nhs', value: nhs, verification: 'formatOnly' as const, fromNationalIdentifier: true } } : {}),
  };
}
