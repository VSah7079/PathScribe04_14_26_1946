// src/services/cancerRegistry/cancerRegistryMandatoryData.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 425 (Pete and his developer: "Targeted submission-level validation
// holds", HOLD_MISSING_MANDATORY_DATA). Before a cancer registry report is
// sent, it is checked against what that registry requires
// (cancerRegistryDefinitions.ts, mandatoryFields). A report missing any of it
// is queued and held, not sent, and shows on the Registry Exceptions worklist
// as held; a resend re-checks it against today's data.
//
// The case's sign-out is never blocked (Pete's answer: "keep sign-out
// unblocked and hold only the registry submission"). Before Batch 425 an
// unusable identifier didn't hold a cancer report (Batch 422); the registry
// that keys on it now holds it.
//
// The API server runs the same check before it emits the JSON (PS-345). Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { CancerRegistryDefinition, CancerRegistryMandatoryField } from './cancerRegistryDefinitions';
import type { CancerRegistryReportPayload } from './buildCancerRegistryReportPayload';

export const CANCER_MANDATORY_HOLD_CODE = 'HOLD_MISSING_MANDATORY_DATA';

const USABLE_IDENTIFIER = ['verified', 'formatOnly'];

/** What the payload lacks of what this registry requires, in the registry's own order. */
export function missingCancerRegistryMandatoryData(
  definition: Pick<CancerRegistryDefinition, 'mandatoryFields'> | undefined,
  payload: Pick<CancerRegistryReportPayload, 'patient' | 'diagnosisDate' | 'primaryDiagnosis' | 'icdOCodes' | 'patientIdentifier'>,
): CancerRegistryMandatoryField[] {
  const present: Record<CancerRegistryMandatoryField, boolean> = {
    patientIdentifier: !!payload.patientIdentifier?.value && USABLE_IDENTIFIER.includes(payload.patientIdentifier.verification),
    dateOfBirth: !!payload.patient.dateOfBirth,
    diagnosisDate: !!payload.diagnosisDate,
    primaryDiagnosis: !!payload.primaryDiagnosis.trim(),
    icdOCode: payload.icdOCodes.length > 0,
  };
  return (definition?.mandatoryFields ?? []).filter(f => !present[f]);
}

const FIELD_TEXT: Record<CancerRegistryMandatoryField, string> = {
  patientIdentifier: 'the national patient identifier the registry keys on (missing or failed its check digit)',
  dateOfBirth: 'the date of birth',
  diagnosisDate: 'the diagnosis date',
  primaryDiagnosis: 'the primary diagnosis',
  icdOCode: 'an ICD-O code',
};

/** The hold's message: stored on the queue entry and shown on the worklist as the registry's finding (literal English, like every hold message). */
export function cancerMandatoryHoldMessage(missing: CancerRegistryMandatoryField[], registryId: string): string {
  return `Held, not sent: ${registryId} requires ${missing.map(f => FIELD_TEXT[f]).join('; ')}. Record it on the case and resend.`;
}
