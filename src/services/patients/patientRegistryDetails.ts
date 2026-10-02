// src/services/patients/patientRegistryDetails.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 425 (Pete and his developer: "national ID prefill via JSON", "consent
// via normalised JSON, newest updatedAt wins"). A patient's national
// identifiers and registry opt-outs, as the interface engine sends them from
// the hospital's PAS/EHR (the engine reads the HL7 and posts this JSON,
// PS-331; PathScribe never reads HL7 for it):
//
//   DEMOGRAPHICS_UPDATED      { event, patient: { assigningAuthority, identifierValue },
//                               nationalIdentifiers: [{ system, value }], updatedAt }
//   REGISTRY_CONSENT_UPDATED  { event, patient: { assigningAuthority, identifierValue },
//                               screeningOptOut, cancerRegistryOptOut, updatedAt }
//
// The patient is found in the MPI by the identifier given (an MRN with its
// authority, or a national identifier with its system). Both are
// patient-level (Batch 418): applied to the MPI and to every case of that
// patient. The newest `updatedAt` wins, per identifier system and for the
// consent, against what is already recorded (by a person or an earlier
// message), so messages arriving out of order settle on the latest.
// Identifiers are added or replaced, never removed, by a message. No research
// consent (Pete's answer: leave it out).
//
// System to system: the API server authenticates the engine (PS-345); no
// person's capability is involved. Audited, without the identifier values
// (patient PHI). Nothing goes back out as an A08: the source already has it.
//
// `prefillPatientRegistryDetails` gives the Accession page what the MPI
// holds, so a known patient's identifiers and opt-outs are filled in.
// ─────────────────────────────────────────────────────────────────────────────

import type { Patient } from '@/types/case/Patient';
import type { NationalPatientIdentifier } from '@/types/patient/NationalPatientIdentifier';
import type { PatientRegistryConsent } from '@/types/patient/PatientRegistryConsent';
import { normalizeNationalIdentifier, verifyNationalIdentifier } from '../patientIdentifiers/checkDigits';
import { withNationalIdentifier } from '../patientIdentifiers/recordNationalPatientIdentifier';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PatientRegistryDetailsDeps {
  resolvePatient: (assigningAuthority: string, identifierValue: string) => Promise<string | null>;
  getPatient: (patientId: string) => Promise<{ id: string; registryConsent?: PatientRegistryConsent } | null | undefined>;
  listNationalIdentifiers: (patientId: string) => Promise<NationalPatientIdentifier[]>;
  recordInMpi: (patientId: string, identifier: NationalPatientIdentifier) => Promise<unknown>;
  setConsentInMpi: (patientId: string, consent: PatientRegistryConsent) => Promise<unknown>;
  casesForPatient: (patientId: string) => Promise<{ id: string; patient: Patient }[]>;
  updateCase: (caseId: string, patch: { patient: Patient }) => Promise<unknown>;
  logAudit: (event: any) => unknown;
}

export interface PatientRegistryIntakeOutcome {
  outcome: 'unparseable' | 'unknownPatient' | 'stale' | 'applied';
  patientId?: string;
  casesUpdated?: number;
  /** Identifiers: the systems recorded, and those skipped as older than what was there. */
  recorded?: string[];
  skipped?: string[];
}

const newer = (incoming: string, existing: string | undefined) => !existing || Date.parse(incoming) > Date.parse(existing);

function parse(raw: string, event: string): any | null {
  let body: any;
  try { body = JSON.parse(raw); } catch { return null; }
  if (!body || body.event !== event) return null;
  if (!body.patient?.assigningAuthority || !body.patient?.identifierValue) return null;
  if (!body.updatedAt || Number.isNaN(Date.parse(body.updatedAt))) return null;
  return body;
}

async function findPatient(body: any, deps: PatientRegistryDetailsDeps): Promise<string | null> {
  const authority = String(body.patient.assigningAuthority);
  const value = String(body.patient.identifierValue);
  return (await deps.resolvePatient(authority, value)) ?? (await deps.resolvePatient(authority, normalizeNationalIdentifier(value)));
}

const sysAudit = (event: string, detail: string, caseId: string | null = null) => ({ type: 'system', event, detail, user: 'system', caseId, confidence: null });

export async function ingestRegistryConsentEvent(raw: string, deps: PatientRegistryDetailsDeps): Promise<PatientRegistryIntakeOutcome> {
  const body = parse(raw, 'REGISTRY_CONSENT_UPDATED');
  if (!body || typeof body.screeningOptOut !== 'boolean' || typeof body.cancerRegistryOptOut !== 'boolean') {
    deps.logAudit(sysAudit('Registry consent message rejected', 'A registry consent message could not be read.'));
    return { outcome: 'unparseable' };
  }
  const patientId = await findPatient(body, deps);
  if (!patientId) {
    deps.logAudit(sysAudit('Registry consent for an unknown patient', `No patient matches the ${body.patient.assigningAuthority} identifier given.`));
    return { outcome: 'unknownPatient' };
  }
  const updatedAt = new Date(body.updatedAt).toISOString();
  const consent: PatientRegistryConsent = { screeningOptOut: body.screeningOptOut, cancerRegistryOptOut: body.cancerRegistryOptOut, recordedAt: updatedAt, source: 'hl7' };
  const mpi = await deps.getPatient(patientId);
  const mpiNewer = newer(updatedAt, mpi?.registryConsent?.recordedAt);
  if (mpiNewer) await deps.setConsentInMpi(patientId, consent);
  let casesUpdated = 0;
  for (const c of await deps.casesForPatient(patientId)) {
    if (!newer(updatedAt, c.patient.registryConsent?.recordedAt)) continue;
    await deps.updateCase(c.id, { patient: { ...c.patient, registryConsent: consent } });
    casesUpdated++;
  }
  if (!mpiNewer && !casesUpdated) {
    deps.logAudit(sysAudit('Registry consent message older than the record', `Patient ${patientId}: a consent dated ${updatedAt} was not applied; a newer one is recorded.`));
    return { outcome: 'stale', patientId, casesUpdated: 0 };
  }
  deps.logAudit(sysAudit('Registry opt-out received', `Patient ${patientId}: screening opt-out ${consent.screeningOptOut ? 'yes' : 'no'}, cancer registry opt-out ${consent.cancerRegistryOptOut ? 'yes' : 'no'} (as of ${updatedAt}); ${casesUpdated} case(s) updated.`));
  return { outcome: 'applied', patientId, casesUpdated };
}

export async function ingestNationalIdentifierEvent(raw: string, deps: PatientRegistryDetailsDeps): Promise<PatientRegistryIntakeOutcome> {
  const body = parse(raw, 'DEMOGRAPHICS_UPDATED');
  const list = Array.isArray(body?.nationalIdentifiers) ? body.nationalIdentifiers.filter((i: any) => i?.system && normalizeNationalIdentifier(String(i.value ?? ''))) : [];
  if (!body || !list.length) {
    deps.logAudit(sysAudit('National identifier message rejected', 'A national identifier message could not be read, or named no identifier.'));
    return { outcome: 'unparseable' };
  }
  const patientId = await findPatient(body, deps);
  if (!patientId) {
    deps.logAudit(sysAudit('National identifier for an unknown patient', `No patient matches the ${body.patient.assigningAuthority} identifier given.`));
    return { outcome: 'unknownPatient' };
  }
  const updatedAt = new Date(body.updatedAt).toISOString();
  const existing = await deps.listNationalIdentifiers(patientId);
  const recorded: string[] = [];
  const skipped: string[] = [];
  const incoming: NationalPatientIdentifier[] = [];
  for (const i of list) {
    const system = String(i.system);
    const value = normalizeNationalIdentifier(String(i.value));
    const identifier: NationalPatientIdentifier = { system, value, verificationStatus: verifyNationalIdentifier(system, value).status, verifiedAt: updatedAt, source: 'hl7' };
    incoming.push(identifier);
    if (!newer(updatedAt, existing.find(e => e.system === system)?.verifiedAt)) { skipped.push(system); continue; }
    await deps.recordInMpi(patientId, identifier);
    recorded.push(system);
  }
  let casesUpdated = 0;
  for (const c of await deps.casesForPatient(patientId)) {
    let ids = c.patient.nationalIdentifiers;
    for (const identifier of incoming) {
      if (newer(updatedAt, ids?.find(e => e.system === identifier.system)?.verifiedAt)) ids = withNationalIdentifier(ids, identifier.system, identifier);
    }
    if (ids === c.patient.nationalIdentifiers) continue;
    await deps.updateCase(c.id, { patient: { ...c.patient, nationalIdentifiers: ids } });
    casesUpdated++;
  }
  if (!recorded.length && !casesUpdated) {
    deps.logAudit(sysAudit('National identifier message older than the record', `Patient ${patientId}: ${skipped.join(', ')} dated ${updatedAt} not applied; newer ones are recorded.`));
    return { outcome: 'stale', patientId, recorded, skipped, casesUpdated: 0 };
  }
  // The values are patient PHI and stay out of the audit text; the systems and check results are the record.
  const checks = incoming.filter(i => recorded.includes(i.system)).map(i => `${i.system} ${i.verificationStatus === 'verified' ? 'verified' : i.verificationStatus === 'failedChecksum' ? 'failed its check digit' : 'unchecked'}`);
  deps.logAudit(sysAudit('National identifier received', `Patient ${patientId}: ${checks.join(', ') || 'no MPI change'}${skipped.length ? `; older than the record: ${skipped.join(', ')}` : ''}; ${casesUpdated} case(s) updated.`));
  return { outcome: 'applied', patientId, recorded, skipped, casesUpdated };
}

/** What the Accession page fills in for a patient picked from the MPI. */
export async function prefillPatientRegistryDetails(
  patientId: string,
  deps: Pick<PatientRegistryDetailsDeps, 'getPatient' | 'listNationalIdentifiers'>,
): Promise<{ nationalIds: Record<string, string>; consent: { screeningOptOut: boolean; cancerRegistryOptOut: boolean } }> {
  const [patient, ids] = await Promise.all([deps.getPatient(patientId), deps.listNationalIdentifiers(patientId)]);
  return {
    nationalIds: Object.fromEntries(ids.map(i => [i.system, i.value])),
    consent: { screeningOptOut: !!patient?.registryConsent?.screeningOptOut, cancerRegistryOptOut: !!patient?.registryConsent?.cancerRegistryOptOut },
  };
}

/** The badge for a patient card: which registries the patient has opted out of. */
export function registryOptOutBadge(consent: PatientRegistryConsent | undefined): 'none' | 'screening' | 'cancer' | 'both' {
  if (!consent) return 'none';
  if (consent.screeningOptOut && consent.cancerRegistryOptOut) return 'both';
  if (consent.screeningOptOut) return 'screening';
  if (consent.cancerRegistryOptOut) return 'cancer';
  return 'none';
}

// ── Editing after accessioning (Batch 425) ───────────────────────────────────

export interface CaseRegistryDetails {
  nationalIds: Record<string, string>;
  consent: { screeningOptOut: boolean; cancerRegistryOptOut: boolean };
}

/** What the case's patient has now, in the editor's shape. */
export function caseRegistryDetails(patient: Pick<Patient, 'nationalIdentifiers' | 'registryConsent'> | undefined): CaseRegistryDetails {
  return {
    nationalIds: Object.fromEntries((patient?.nationalIdentifiers ?? []).map(i => [i.system, i.value])),
    consent: { screeningOptOut: !!patient?.registryConsent?.screeningOptOut, cancerRegistryOptOut: !!patient?.registryConsent?.cancerRegistryOptOut },
  };
}

/** The identifiers that changed (a blank one is a removal) and whether the opt-outs did. */
export function registryDetailsChanges(before: CaseRegistryDetails, after: CaseRegistryDetails): { identifiers: { system: string; value: string }[]; consentChanged: boolean } {
  const systems = [...new Set([...Object.keys(before.nationalIds), ...Object.keys(after.nationalIds)])];
  return {
    identifiers: systems
      .filter(s => normalizeNationalIdentifier(before.nationalIds[s] ?? '') !== normalizeNationalIdentifier(after.nationalIds[s] ?? ''))
      .map(s => ({ system: s, value: after.nationalIds[s] ?? '' })),
    consentChanged: before.consent.screeningOptOut !== after.consent.screeningOptOut || before.consent.cancerRegistryOptOut !== after.consent.cancerRegistryOptOut,
  };
}

export interface SaveCaseRegistryDetailsDeps {
  recordIdentifier: (input: { caseId: string; system: string; value: string; announce: boolean }) => Promise<{ outcome: string }>;
  recordConsent: (input: { caseId: string; screeningOptOut: boolean; cancerRegistryOptOut: boolean }) => Promise<{ outcome: string }>;
}

/**
 * Saves the patient details editor: each changed identifier through recordNationalPatientIdentifier
 * (patient:national-identifier:record; an A08 goes to the engine), the opt-outs through
 * recordPatientRegistryConsent (patient:registry-consent:record). Each service checks its own capability;
 * a refusal of either is reported, and what was allowed is kept.
 */
export async function saveCaseRegistryDetails(
  input: { caseId: string; before: CaseRegistryDetails; after: CaseRegistryDetails },
  deps: SaveCaseRegistryDetailsDeps,
): Promise<{ outcome: 'unchanged' | 'saved' | 'partlyRefused' | 'refused'; identifiersSaved: number; consentSaved: boolean }> {
  const changes = registryDetailsChanges(input.before, input.after);
  if (!changes.identifiers.length && !changes.consentChanged) return { outcome: 'unchanged', identifiersSaved: 0, consentSaved: false };
  let identifiersSaved = 0;
  let refused = 0;
  for (const c of changes.identifiers) {
    const r = await deps.recordIdentifier({ caseId: input.caseId, system: c.system, value: c.value, announce: true });
    if (r.outcome === 'saved' || r.outcome === 'removed') identifiersSaved++; else refused++;
  }
  let consentSaved = false;
  if (changes.consentChanged) {
    const r = await deps.recordConsent({ caseId: input.caseId, ...input.after.consent });
    if (r.outcome === 'saved' || r.outcome === 'cleared') consentSaved = true; else refused++;
  }
  const saved = identifiersSaved + (consentSaved ? 1 : 0);
  return { outcome: !refused ? 'saved' : saved ? 'partlyRefused' : 'refused', identifiersSaved, consentSaved };
}
