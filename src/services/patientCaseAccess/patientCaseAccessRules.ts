// src/services/patientCaseAccess/patientCaseAccessRules.ts
// ───────────────────────────────────────────────────────────────────────────
// Batch 613 (Pete, Oct 18, 2026): access to a patient's other cases.
//
// A pathologist working up or signing out a case may find the patient has other
// cases they are not allowed to open (another organisation, another facility, a
// subspecialty pool they are not in). The history shows how many, never which. They
// can ask for access; the case's assigned pathologist or an administrator decides.
// A grant covers the patient (every case under that identity, linked identities
// included) and stays open until someone revokes it.
//
// This file holds the decisions as pure functions so they can be tested without a
// browser: which cases are restricted, who may decide, what the audit entries and
// messages say. patientCaseAccessService.ts does the loading, saving and messaging.
//
// Audit entries and messages carry no patient name, date of birth or MRN, and never the
// requester's free-text note (it can hold clinical detail). Accession numbers are
// not direct identifiers and may appear.
// ───────────────────────────────────────────────────────────────────────────

import type { AccessRequest } from '@/types/access/AccessRequest';
import type { NewAuditLog } from '../auditlog/IAuditService';

/** The few fields of a case this feature needs. */
export interface PatientCaseLite {
  id: string;
  patient?: { id?: string };
  order?: { assignedTo?: string; assignedToName?: string };
}

/** The signed-in person, as the Auth context and the session profile describe them. */
export interface AccessUser {
  id: string;
  name?: string;
  role?: 'pathologist' | 'admin' | 'pathologist-admin' | 'superadmin';
  organisationId?: string;
}

// ── Reasons (a picklist; the note is optional except for "other") ──────────────
export const OTHER_CASES_REASONS = ['signOutCorrelation', 'tumorBoard', 'followUp', 'secondOpinion', 'other'] as const;
export type OtherCasesReason = (typeof OTHER_CASES_REASONS)[number];
export const DEFAULT_OTHER_CASES_REASON: OtherCasesReason = 'signOutCorrelation';

/** Stored English wording for messages and audit detail (other people read these). */
const REASON_ENGLISH: Record<OtherCasesReason, string> = {
  signOutCorrelation: 'Correlate with this case at sign-out',
  tumorBoard: 'Tumor board preparation',
  followUp: 'Clinical follow-up',
  secondOpinion: 'Second opinion',
  other: 'Other',
};

export function isOtherCasesReason(code: string | undefined): code is OtherCasesReason {
  return !!code && (OTHER_CASES_REASONS as readonly string[]).includes(code);
}

export function reasonEnglish(code: string | undefined): string {
  return isOtherCasesReason(code) ? REASON_ENGLISH[code] : 'Not stated';
}

export type RequestInputError = 'REASON_REQUIRED' | 'NOTE_REQUIRED';

/** Whether a request can be sent: a reason from the list, and a note when the reason is "other". */
export function validateRequestInput(code: string | undefined, note: string | undefined): RequestInputError | null {
  if (!isOtherCasesReason(code)) return 'REASON_REQUIRED';
  if (code === 'other' && !note?.trim()) return 'NOTE_REQUIRED';
  return null;
}

// ── Which cases are out of reach ─────────────────────────────────────────────

/** The patient's cases (under any linked identity), without the case being viewed. */
export function patientCasesOf<C extends PatientCaseLite>(all: readonly C[], patientIds: readonly string[], excludeCaseId?: string): C[] {
  const ids = new Set(patientIds);
  return all.filter(c => c.id !== excludeCaseId && !!c.patient?.id && ids.has(c.patient.id));
}

/** Splits a patient's cases into the ones the person may open and the ones they may not. An active grant opens them all. */
export function partitionPatientCases<C extends PatientCaseLite>(
  patientCases: readonly C[], accessibleIds: ReadonlySet<string>, hasActiveGrant: boolean,
): { visible: C[]; restricted: C[]; viaGrant: C[] } {
  const visible: C[] = []; const restricted: C[] = []; const viaGrant: C[] = [];
  for (const c of patientCases) {
    if (accessibleIds.has(c.id)) visible.push(c);
    else if (hasActiveGrant) { visible.push(c); viaGrant.push(c); }
    else restricted.push(c);
  }
  return { visible, restricted, viaGrant };
}

// ── Requests and grants ──────────────────────────────────────────────────────

const isPatientCases = (r: AccessRequest) => r.type === 'patient_cases';
const forPatient = (r: AccessRequest, patientIds: readonly string[]) => !!r.patientId && patientIds.includes(r.patientId);

/** A grant is a granted request that nobody has revoked. */
export function isActiveGrant(r: AccessRequest): boolean {
  return isPatientCases(r) && r.status === 'granted' && !r.revokedAt;
}

export function activeGrantsFor(requests: readonly AccessRequest[], patientIds: readonly string[], userId?: string): AccessRequest[] {
  return requests.filter(r => isActiveGrant(r) && forPatient(r, patientIds) && (userId === undefined || r.requestingUserId === userId));
}

export function pendingRequestsFor(requests: readonly AccessRequest[], patientIds: readonly string[], userId?: string): AccessRequest[] {
  return requests.filter(r => isPatientCases(r) && r.status === 'pending' && forPatient(r, patientIds) && (userId === undefined || r.requestingUserId === userId));
}

/** The person's most recent refused request for this patient, if there is no newer request. */
export function latestDenialFor(requests: readonly AccessRequest[], patientIds: readonly string[], userId: string): AccessRequest | undefined {
  const mine = requests
    .filter(r => isPatientCases(r) && forPatient(r, patientIds) && r.requestingUserId === userId)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  return mine[0]?.status === 'denied' ? mine[0] : undefined;
}

// ── Who may decide ───────────────────────────────────────────────────────────

export const isAdministrator = (role: AccessUser['role']) => role === 'admin' || role === 'pathologist-admin';

/**
 * Whether this person may approve, deny or revoke a request: an administrator, or the
 * assigned pathologist of at least one of the cases the request names. Nobody decides their
 * own request. PathScribe support (superadmin) never decides a hospital's access.
 */
export function canDecideRequest(user: AccessUser, request: AccessRequest, casesById: ReadonlyMap<string, PatientCaseLite>): boolean {
  if (!isPatientCases(request) || request.requestingUserId === user.id) return false;
  if (user.role === 'superadmin') return false;
  if (isAdministrator(user.role)) return true;
  return (request.caseIds ?? []).some(id => casesById.get(id)?.order?.assignedTo === user.id);
}

/** The people to tell about a new request: the assigned pathologists of the restricted cases. Administrators are added by the caller. */
export function assignedPathologistIds(restricted: readonly PatientCaseLite[], excludeUserId?: string): string[] {
  return Array.from(new Set(restricted.map(c => c.order?.assignedTo).filter((id): id is string => !!id && id !== excludeUserId)));
}

// ── Audit entries (no patient identifiers, no free text) ─────────────────────

export const PATIENT_CASE_ACCESS_EVENTS = {
  requested: 'PATIENT_CASES_ACCESS_REQUESTED',
  granted: 'PATIENT_CASES_ACCESS_GRANTED',
  denied: 'PATIENT_CASES_ACCESS_DENIED',
  revoked: 'PATIENT_CASES_ACCESS_REVOKED',
  viewed: 'PATIENT_CASES_ACCESS_VIEWED',
} as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function requestedAuditEntry(actor: string, request: AccessRequest, fromCaseId: string): NewAuditLog {
  return {
    type: 'user', event: PATIENT_CASE_ACCESS_EVENTS.requested,
    detail: `Asked to see a patient's other cases (${plural(request.caseIds?.length ?? 0, 'case', 'cases')} out of reach) while working on case ${fromCaseId}. Reason: ${reasonEnglish(request.reasonCode)}. Request ${request.id}.`,
    user: actor, caseId: fromCaseId, confidence: null,
  };
}

export function decidedAuditEntry(kind: 'granted' | 'denied' | 'revoked', actor: string, request: AccessRequest): NewAuditLog {
  const verb = kind === 'granted' ? 'Granted' : kind === 'denied' ? 'Refused' : 'Revoked';
  const tail = kind === 'denied' ? ` Reason given: ${request.denialReason ?? 'none'}.` : kind === 'revoked' ? ` Reason given: ${request.revokeReason ?? 'none'}.` : '';
  return {
    type: 'user', event: PATIENT_CASE_ACCESS_EVENTS[kind],
    detail: `${verb} ${request.requestingUserName}'s access to a patient's other cases (request ${request.id}).${tail}`,
    user: actor, caseId: null, confidence: null,
  };
}

export function viewedAuditEntry(actor: string, patientCaseCount: number, fromCaseId: string | undefined, grantRequestId: string | undefined): NewAuditLog {
  return {
    type: 'user', event: PATIENT_CASE_ACCESS_EVENTS.viewed,
    detail: `Opened ${plural(patientCaseCount, 'case', 'cases')} of a patient's history through a granted access${grantRequestId ? ` (request ${grantRequestId})` : ''}.`,
    user: actor, caseId: fromCaseId ?? null, confidence: null,
  };
}

// ── Messages (stored English, like every system message) ─────────────────────

export function requestMessage(requesterName: string, request: AccessRequest, fromCaseId: string): { subject: string; body: string } {
  const n = request.caseIds?.length ?? 0;
  return {
    subject: `Access request: a patient's other cases (${fromCaseId})`,
    body: `${requesterName} asked to see ${plural(n, 'other case', 'other cases')} for the patient on case ${fromCaseId}.\n\nReason: ${reasonEnglish(request.reasonCode)}${request.reasonNote?.trim() ? `\nNote: ${request.reasonNote.trim()}` : ''}\n\nYou can approve or decline it in the patient history of that case.`,
  };
}

export function grantedMessage(deciderName: string): { subject: string; body: string } {
  return {
    subject: "Access granted: a patient's other cases",
    body: `${deciderName} granted your request. You can now open the patient's other cases from their history. The access stays open until it is revoked.`,
  };
}

export function revokedMessage(deciderName: string, reason: string): { subject: string; body: string } {
  return {
    subject: "Access ended: a patient's other cases",
    body: `${deciderName} ended your access to a patient's other cases.\n\nReason: ${reason}`,
  };
}
