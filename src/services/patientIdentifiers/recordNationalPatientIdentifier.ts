// src/services/patientIdentifiers/recordNationalPatientIdentifier.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 417 (SRS v2.1 FR-004.3). The one way a person records a patient's
// national identifier: checked for permission, the check digit run, written to
// the case's patient and mirrored to the MPI, audited. A value that fails its
// check digit is still stored, marked failedChecksum, so the accessioner can
// keep what the requisition said and the registry hold names the reason;
// nothing is sent to a registry on it (screeningRegistryEngine).
//
// A blank value removes the identifier for that system.
//
// Batch 425 (Pete and his developer: "post-accession identifier editing",
// "reuse the ADT A08"): a change after accessioning (`announce: true`, from
// the Registry Exceptions page's patient details) tells the interface engine
// with the existing A08 demographic update, carrying the patient's identifiers
// (buildPatientAdtPayload's snapshot already includes the national ones). A
// removal now also comes off the MPI, which it didn't before.
// ─────────────────────────────────────────────────────────────────────────────

import type { Patient } from '@/types/case/Patient';
import type { NationalPatientIdentifier } from '@/types/patient/NationalPatientIdentifier';
import { normalizeNationalIdentifier, verifyNationalIdentifier, type CheckDigitResult } from './checkDigits';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface RecordNationalIdentifierDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  getCase: (caseId: string) => Promise<{ id: string; patient: Patient } | null | undefined>;
  updateCase: (caseId: string, patch: { patient: Patient }) => Promise<unknown>;
  recordInMpi: (patientId: string, identifier: NationalPatientIdentifier) => Promise<unknown>;
  /** Batch 425: removes one system's identifier from the MPI. */
  removeFromMpi?: (patientId: string, system: string) => Promise<unknown>;
  /** Batch 425: queues the A08 demographic update for the patient (sourceOperation 'recordNationalIdentifier'). */
  announceDemographicUpdate?: (patientId: string) => Promise<unknown>;
  logAudit: (event: any) => unknown;
  now: () => string;
}

export interface RecordNationalIdentifierOutcome {
  outcome: 'notPermitted' | 'caseNotFound' | 'saved' | 'removed';
  identifier?: NationalPatientIdentifier;
  check?: CheckDigitResult;
}

/** The patient's list with one system's identifier replaced (or removed when identifier is null). Pure. */
export function withNationalIdentifier(list: NationalPatientIdentifier[] | undefined, system: string, identifier: NationalPatientIdentifier | null): NationalPatientIdentifier[] {
  const others = (list ?? []).filter(i => i.system !== system);
  return identifier ? [...others, identifier] : others;
}

export async function recordNationalPatientIdentifier(
  input: { caseId: string; system: string; value: string; source?: NationalPatientIdentifier['source']; announce?: boolean },
  user: { id: string; name: string },
  deps: RecordNationalIdentifierDeps,
): Promise<RecordNationalIdentifierOutcome> {
  const decision = await deps.enforce('patient:national-identifier:record', { caseId: input.caseId });
  if (!decision.allowed) return { outcome: 'notPermitted' };
  const c = await deps.getCase(input.caseId);
  if (!c) return { outcome: 'caseNotFound' };

  const value = normalizeNationalIdentifier(input.value);
  if (!value) {
    const patient = { ...c.patient, nationalIdentifiers: withNationalIdentifier(c.patient.nationalIdentifiers, input.system, null) };
    await deps.updateCase(c.id, { patient });
    if (c.patient.id && deps.removeFromMpi) await deps.removeFromMpi(c.patient.id, input.system);
    if (c.patient.id && input.announce && deps.announceDemographicUpdate) await deps.announceDemographicUpdate(c.patient.id);
    deps.logAudit({ type: 'user', event: 'National identifier removed', detail: `Case ${c.id}: ${input.system}`, user: user.name || user.id, caseId: c.id, confidence: null });
    return { outcome: 'removed' };
  }

  const check = verifyNationalIdentifier(input.system, value);
  const identifier: NationalPatientIdentifier = {
    system: input.system, value, verificationStatus: check.status, verifiedAt: deps.now(), source: input.source ?? 'manual',
  };
  const patient = { ...c.patient, nationalIdentifiers: withNationalIdentifier(c.patient.nationalIdentifiers, input.system, identifier) };
  await deps.updateCase(c.id, { patient });
  if (c.patient.id) await deps.recordInMpi(c.patient.id, identifier);
  if (c.patient.id && input.announce && deps.announceDemographicUpdate) await deps.announceDemographicUpdate(c.patient.id);
  // The value is patient PHI and stays out of the audit text; the system and the check result are the record.
  deps.logAudit({
    type: 'user', event: 'National identifier recorded',
    detail: `Case ${c.id}: ${input.system} ${check.status === 'verified' ? 'verified' : check.status === 'failedChecksum' ? 'failed its check digit' : 'recorded unchecked'}`,
    user: user.name || user.id, caseId: c.id, confidence: null,
  });
  return { outcome: 'saved', identifier, check };
}
