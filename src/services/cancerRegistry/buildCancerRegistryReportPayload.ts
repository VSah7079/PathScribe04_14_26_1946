// src/services/cancerRegistry/buildCancerRegistryReportPayload.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the RFP-APLIS-2026-GLOBAL Broader Cancer Registry Exports
// gap. Same real "PathScribe builds structured JSON; interface engine
// handles registry-specific translation" principle as
// buildCytologyRegistryReportPayload.ts — this file assembles the
// real, structured content; it never itself speaks any registry's
// own wire format (NAACCR XML, CoC Data Standard, etc. — real,
// external interface-engine work, per FHIR_DISPATCH_ARCHITECTURE_PLAN.md's
// own already-settled decision).
//
// Real, per that same document's own critical finding: the caller of
// this function must be a real SURGICAL PATHOLOGY case sign-out — a
// confirmed biopsy/resection diagnosis — never a cytology screening
// result.
//
// Reads Specimen.coding.icdO directly (types/case/Specimen.ts) — the
// real, newly-added field this gap's own prerequisite fix introduced,
// never a guessed or fabricated storage location.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CancerRegistryId } from './ICancerRegistrySettingsService';
import { cancerRegistryDefinition, type CancerRegistryWireFormat } from './cancerRegistryDefinitions';
import { resolveRegistryPatientIdentifier, type RegistryPatientIdentifierResolution } from '../screeningRegistry/screeningRegistryEngine';
import { resolveIcdOBehaviorCode, type IcdOBehaviorCode } from './resolveIcdOBehaviorCode';

export interface CancerRegistryIcdOEntry {
  code: string;
  description: string;
  behaviorCode: IcdOBehaviorCode | null;
}

export interface CancerRegistryReportPayload {
  messageId: string;
  timestamp: string;
  registryId: CancerRegistryId;
  facilityId: string;
  facilityName?: string;
  patient: {
    mrn?: string; name: string; dateOfBirth?: string;
    /** Batch 417 (SRS v2.1 FR-004): the patient's national identifiers with their check-digit status.
     *  The interface engine picks the one the registry keys on; a 'failedChecksum' one must not be sent. */
    nationalIdentifiers?: { system: string; value: string; verificationStatus: string }[];
  };
  accessionNumber: string;
  diagnosisDate?: string;
  primaryDiagnosis: string;
  /** Real, per this app's own established multi-specimen model — ICD-O
   *  codes are captured per specimen (Specimen.coding.icdO), so a case
   *  with more than one specimen can genuinely carry more than one
   *  real ICD-O finding. */
  icdOCodes: CancerRegistryIcdOEntry[];
  icd10Codes: string[];
  /** Batch 422: the wire format the interface engine turns this into (cancerRegistryDefinitions.ts). */
  wireFormat?: CancerRegistryWireFormat;
  /** Batch 422: the national identifier this registry keys on, from the patient's verified national
   *  identifiers first (Batch 417), the MRN as a format-checked fallback. Absent for a registry that
   *  matches on demographics. Cancer reporting is statutory, so an unusable identifier doesn't hold
   *  the report; the interface engine and the registry see `verification`. */
  patientIdentifier?: { formatId: string; value?: string; verification: RegistryPatientIdentifierResolution['status']; fromNationalIdentifier: boolean };
  /** Batch 620 (part E): for the US ePath registry, the state profile the report was checked against and where it goes (the engine builds the HL7 from this; usEpath/). */
  epath?: { profileId: string; stateCode: string; transport: string; basisFacilityId: string; messageControlId: string };
}

export function buildCancerRegistryReportPayload(
  caseData: Case,
  registryId: CancerRegistryId,
  facilityId: string,
  facilityName: string | undefined,
): CancerRegistryReportPayload {
  const patientName = [caseData.patient.firstName, caseData.patient.lastName].filter(Boolean).join(' ').trim() || 'Unknown';
  const definition = cancerRegistryDefinition(registryId);
  const identifier = definition ? resolveRegistryPatientIdentifier(definition, caseData.patient) : undefined;

  const icdOCodes: CancerRegistryIcdOEntry[] = [];
  const icd10Codes: string[] = [];
  for (const specimen of caseData.specimens ?? []) {
    for (const icd of specimen.coding?.icd10 ?? []) {
      icd10Codes.push(icd.code);
    }
    for (const icdO of specimen.coding?.icdO ?? []) {
      icdOCodes.push({ code: icdO.code, description: icdO.description, behaviorCode: resolveIcdOBehaviorCode(icdO.code) });
    }
  }

  return {
    messageId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    registryId,
    facilityId,
    facilityName,
    patient: {
      mrn: caseData.patient.mrn, name: patientName, dateOfBirth: caseData.patient.dateOfBirth,
      ...(caseData.patient.nationalIdentifiers?.length ? { nationalIdentifiers: caseData.patient.nationalIdentifiers.map(i => ({ system: i.system, value: i.value, verificationStatus: i.verificationStatus })) } : {}),
    },
    accessionNumber: caseData.accession.fullAccession ?? caseData.accession.accessionNumber,
    diagnosisDate: caseData.diagnostic?.issuedDate,
    primaryDiagnosis: caseData.diagnostic?.primaryDiagnosis ?? '',
    icdOCodes,
    icd10Codes,
    ...(definition ? { wireFormat: definition.wireFormat } : {}),
    ...(identifier ? { patientIdentifier: { formatId: identifier.formatId, value: identifier.value, verification: identifier.status, fromNationalIdentifier: identifier.fromNationalIdentifier } } : {}),
  };
}
