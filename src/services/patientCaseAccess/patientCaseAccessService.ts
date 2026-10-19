// src/services/patientCaseAccess/patientCaseAccessService.ts
// ───────────────────────────────────────────────────────────────────────────
// Batch 613: asking for, granting, refusing and revoking access to a patient's other
// cases (the rules are in patientCaseAccessRules.ts). The request is the existing tracked
// access request record (type 'patient_cases'), so it appears in the Quality Assurance
// access request metrics like the other kinds.
//
//   • Asking needs patient:other-cases:request-access.
//   • Approving, refusing and revoking need patient:other-cases:decide-access AND
//     being an administrator or the assigned pathologist of a case the request names.
//   • Every request, grant, refusal, revocation and use of a grant is written to the Audit Log.
//   • The requester is messaged when the request is decided or the grant is revoked; the
//     approvers are messaged when a request comes in.
//
// All of it takes its collaborators as arguments (createPatientCaseAccess), so it is
// tested without browser storage. getPatientCaseAccess() returns the one wired to the app.
// ───────────────────────────────────────────────────────────────────────────

import type { AccessRequest } from '@/types/access/AccessRequest';
import type { IAccessRequestService } from '../access/IAccessRequestService';
import type { IAuditService } from '../auditlog/IAuditService';
import {
  type AccessUser, type PatientCaseLite,
  activeGrantsFor, assignedPathologistIds, canDecideRequest, decidedAuditEntry, grantedMessage, isAdministrator,
  latestDenialFor, partitionPatientCases, patientCasesOf, pendingRequestsFor, requestMessage, requestedAuditEntry,
  revokedMessage, validateRequestInput, viewedAuditEntry,
  type RequestInputError,
} from './patientCaseAccessRules';

export const REQUEST_CAPABILITY = 'patient:other-cases:request-access';
export const DECIDE_CAPABILITY = 'patient:other-cases:decide-access';

export interface PatientCaseAccessDeps {
  accessRequests: Pick<IAccessRequestService, 'getAll' | 'create' | 'grant' | 'deny' | 'revoke'>;
  /** The patient's identity plus every identity a person confirmed is the same patient. */
  linkedPatientIds(patientId: string): Promise<string[]>;
  /** Every case, with no access filter (to count what is out of reach), and the ids the signed-in person may open. */
  cases: { loadAll(): Promise<PatientCaseLite[]>; loadAccessibleIds(): Promise<Set<string>> };
  users: { getAll(): Promise<Array<{ id: string; firstName: string; lastName: string; roles: string[]; organisationId?: string; status?: string }>> };
  messages: { send(m: { senderId: string; senderName: string; recipientId: string; recipientName: string; subject: string; body: string; caseNumber?: string; timestamp: Date; isUrgent: boolean }): Promise<unknown> };
  audit: Pick<IAuditService, 'logEvent'>;
  authorization: { enforce(capability: string): Promise<{ allowed: boolean }> };
}

export type AccessActionError = RequestInputError | 'NOT_PERMITTED' | 'NOTHING_TO_REQUEST' | 'ALREADY_REQUESTED' | 'NOT_FOUND' | 'NOT_PENDING' | 'REASON_REQUIRED' | 'FAILED';
export type AccessActionResult<T = AccessRequest> = { ok: true; data: T } | { ok: false; code: AccessActionError };

export interface PatientCaseAccessState {
  /** Cases of this patient the person may not open (0 once a grant is active). */
  restrictedCount: number;
  restrictedCaseIds: string[];
  /** The person has an active grant for this patient. */
  hasGrant: boolean;
  /** The person's own open request, and their latest refusal if nothing newer. */
  pending?: AccessRequest;
  denied?: AccessRequest;
  /** Open requests from other people that this person may approve or refuse. */
  toDecide: AccessRequest[];
  /** Active grants to other people that this person may revoke. */
  grants: AccessRequest[];
}

const failed = (code: AccessActionError): { ok: false; code: AccessActionError } => ({ ok: false, code });
const actorName = (u: AccessUser) => u.name ?? u.id;

export function createPatientCaseAccess(deps: PatientCaseAccessDeps) {
  async function context(patientId: string, excludeCaseId?: string) {
    const [linked, all, accessibleIds, requestsRes] = await Promise.all([
      deps.linkedPatientIds(patientId), deps.cases.loadAll(), deps.cases.loadAccessibleIds(), deps.accessRequests.getAll(),
    ]);
    const patientIds = Array.from(new Set([patientId, ...linked]));
    const requests = requestsRes.ok ? requestsRes.data : [];
    return { patientIds, patientCases: patientCasesOf(all, patientIds, excludeCaseId), casesById: new Map(all.map(c => [c.id, c] as const)), accessibleIds, requests };
  }

  /** What the notice shows for this patient and case. */
  async function getState(patientId: string, caseId: string, user: AccessUser): Promise<PatientCaseAccessState> {
    const { patientIds, patientCases, casesById, accessibleIds, requests } = await context(patientId, caseId);
    const mineGrants = activeGrantsFor(requests, patientIds, user.id);
    const { restricted } = partitionPatientCases(patientCases, accessibleIds, mineGrants.length > 0);
    const pending = pendingRequestsFor(requests, patientIds, user.id)[0];
    return {
      restrictedCount: restricted.length,
      restrictedCaseIds: restricted.map(c => c.id),
      hasGrant: mineGrants.length > 0,
      pending,
      denied: pending ? undefined : latestDenialFor(requests, patientIds, user.id),
      toDecide: pendingRequestsFor(requests, patientIds).filter(r => canDecideRequest(user, r, casesById)),
      grants: activeGrantsFor(requests, patientIds).filter(r => canDecideRequest(user, r, casesById)),
    };
  }

  /** How many of the patient's other cases the person cannot open. */
  async function getRestrictedCaseCount(patientId: string, user: AccessUser, excludeCaseId?: string): Promise<number> {
    const { patientIds, patientCases, accessibleIds, requests } = await context(patientId, excludeCaseId);
    return partitionPatientCases(patientCases, accessibleIds, activeGrantsFor(requests, patientIds, user.id).length > 0).restricted.length;
  }

  /** For the history lists: which of the patient's other cases the person may see, and how many they may not. */
  async function splitPatientHistory(patientId: string, user: AccessUser, excludeCaseId?: string) {
    const { patientIds, patientCases, accessibleIds, requests } = await context(patientId, excludeCaseId);
    const grant = activeGrantsFor(requests, patientIds, user.id)[0];
    const { visible, restricted, viaGrant } = partitionPatientCases(patientCases, accessibleIds, !!grant);
    return { visibleIds: new Set(visible.map(c => c.id)), restrictedCount: restricted.length, viaGrantCount: viaGrant.length, grantRequestId: grant?.id };
  }

  async function notifyApprovers(request: AccessRequest, user: AccessUser, restricted: PatientCaseLite[], fromCaseId: string) {
    const usersRes = await deps.users.getAll().catch(() => []);
    const active = usersRes.filter(u => (u.status ?? 'Active') === 'Active' && u.id !== user.id);
    const assigned = new Set(assignedPathologistIds(restricted, user.id));
    const admins = active.filter(u => u.roles.includes('Admin') && (!user.organisationId || !u.organisationId || u.organisationId === user.organisationId));
    const recipients = [...active.filter(u => assigned.has(u.id)), ...admins.filter(a => !assigned.has(a.id))];
    const { subject, body } = requestMessage(actorName(user), request, fromCaseId);
    await Promise.all(recipients.map(r => deps.messages.send({
      senderId: user.id, senderName: actorName(user), recipientId: r.id, recipientName: `${r.firstName} ${r.lastName}`.trim(),
      subject, body, caseNumber: fromCaseId, timestamp: new Date(), isUrgent: false,
    }).catch(() => undefined)));
  }

  async function requestAccess(
    input: { patientId: string; caseId: string; reasonCode: string; note?: string }, user: AccessUser,
  ): Promise<AccessActionResult> {
    const invalid = validateRequestInput(input.reasonCode, input.note);
    if (invalid) return failed(invalid);
    if (!(await deps.authorization.enforce('patient:other-cases:request-access')).allowed) return failed('NOT_PERMITTED');
    const { patientIds, patientCases, accessibleIds, requests } = await context(input.patientId, input.caseId);
    const { restricted } = partitionPatientCases(patientCases, accessibleIds, activeGrantsFor(requests, patientIds, user.id).length > 0);
    if (restricted.length === 0) return failed('NOTHING_TO_REQUEST');
    if (pendingRequestsFor(requests, patientIds, user.id).length > 0) return failed('ALREADY_REQUESTED');
    const created = await deps.accessRequests.create({
      type: 'patient_cases', requestingUserId: user.id, requestingUserName: actorName(user), organisationId: user.organisationId,
      caseId: input.caseId, patientId: input.patientId, caseIds: restricted.map(c => c.id),
      reasonCode: input.reasonCode, reasonNote: input.note?.trim() || undefined,
    });
    if (!created.ok) return failed('FAILED');
    await deps.audit.logEvent(requestedAuditEntry(actorName(user), created.data, input.caseId)).catch(() => undefined);
    await notifyApprovers(created.data, user, restricted, input.caseId);
    return { ok: true, data: created.data };
  }

  async function loadForDecision(id: string, user: AccessUser, need: 'pending' | 'granted'): Promise<AccessActionResult> {
    if (!(await deps.authorization.enforce('patient:other-cases:decide-access')).allowed) return failed('NOT_PERMITTED');
    const all = await deps.accessRequests.getAll();
    const request = all.ok ? all.data.find(r => r.id === id) : undefined;
    if (!request || request.type !== 'patient_cases') return failed('NOT_FOUND');
    if (need === 'pending' ? request.status !== 'pending' : request.status !== 'granted' || !!request.revokedAt) return failed('NOT_PENDING');
    const cases = await deps.cases.loadAll();
    if (!canDecideRequest(user, request, new Map(cases.map(c => [c.id, c] as const)))) return failed('NOT_PERMITTED');
    return { ok: true, data: request };
  }

  async function tell(request: AccessRequest, user: AccessUser, message: { subject: string; body: string }) {
    await deps.messages.send({
      senderId: user.id, senderName: actorName(user), recipientId: request.requestingUserId, recipientName: request.requestingUserName,
      ...message, caseNumber: request.caseId, timestamp: new Date(), isUrgent: false,
    }).catch(() => undefined);
  }

  async function grantAccess(id: string, user: AccessUser): Promise<AccessActionResult> {
    const found = await loadForDecision(id, user, 'pending');
    if (!found.ok) return found;
    const res = await deps.accessRequests.grant(id, user.id, actorName(user));
    if (!res.ok) return failed('FAILED');
    await deps.audit.logEvent(decidedAuditEntry('granted', actorName(user), res.data)).catch(() => undefined);
    await tell(res.data, user, grantedMessage(actorName(user)));
    return { ok: true, data: res.data };
  }

  async function denyAccess(id: string, user: AccessUser, reason: string): Promise<AccessActionResult> {
    if (!reason?.trim()) return failed('REASON_REQUIRED');
    const found = await loadForDecision(id, user, 'pending');
    if (!found.ok) return found;
    // The access request service checks the permission again, messages the requester and keeps the reason.
    const res = await deps.accessRequests.deny(id, user.id, actorName(user), reason.trim());
    if (!res.ok) return failed(res.error === 'NOT_PERMITTED' ? 'NOT_PERMITTED' : 'FAILED');
    await deps.audit.logEvent(decidedAuditEntry('denied', actorName(user), res.data)).catch(() => undefined);
    return { ok: true, data: res.data };
  }

  async function revokeAccess(id: string, user: AccessUser, reason: string): Promise<AccessActionResult> {
    if (!reason?.trim()) return failed('REASON_REQUIRED');
    const found = await loadForDecision(id, user, 'granted');
    if (!found.ok) return found;
    const res = await deps.accessRequests.revoke(id, user.id, actorName(user), reason.trim());
    if (!res.ok) return failed('FAILED');
    await deps.audit.logEvent(decidedAuditEntry('revoked', actorName(user), res.data)).catch(() => undefined);
    await tell(res.data, user, revokedMessage(actorName(user), reason.trim()));
    return { ok: true, data: res.data };
  }

  /** Writes one audit entry when someone opens a patient's history and some of it is visible only through a grant. */
  async function recordGrantedView(patientId: string, user: AccessUser, fromCaseId?: string): Promise<void> {
    const s = await splitPatientHistory(patientId, user, fromCaseId);
    if (s.viaGrantCount === 0) return;
    await deps.audit.logEvent(viewedAuditEntry(actorName(user), s.viaGrantCount, fromCaseId, s.grantRequestId)).catch(() => undefined);
  }

  /** Every active grant the person may revoke, across patients (for the administrator's list). */
  async function listRevocableGrants(user: AccessUser): Promise<AccessRequest[]> {
    const [reqs, cases] = await Promise.all([deps.accessRequests.getAll(), deps.cases.loadAll()]);
    if (!reqs.ok) return [];
    const byId = new Map(cases.map(c => [c.id, c] as const));
    return reqs.data.filter(r => r.type === 'patient_cases' && r.status === 'granted' && !r.revokedAt && canDecideRequest(user, r, byId));
  }

  return { getState, getRestrictedCaseCount, splitPatientHistory, requestAccess, grantAccess, denyAccess, revokeAccess, recordGrantedView, listRevocableGrants };
}

export type PatientCaseAccess = ReturnType<typeof createPatientCaseAccess>;

/** The one wired to the app's services (loaded when first used, so nothing here pulls in the case services early). */
let wired: PatientCaseAccess | null = null;
export function getPatientCaseAccess(): PatientCaseAccess {
  if (wired) return wired;
  wired = createPatientCaseAccess({
    accessRequests: {
      getAll: async () => (await import('../index')).accessRequestService.getAll(),
      create: async r => (await import('../index')).accessRequestService.create(r),
      grant: async (...a) => (await import('../index')).accessRequestService.grant(...a),
      deny: async (...a) => (await import('../index')).accessRequestService.deny(...a),
      revoke: async (...a) => (await import('../index')).accessRequestService.revoke(...a),
    },
    linkedPatientIds: async patientId => (await import('../index')).patientIndexService.getLinkedPatientIds(patientId, 'same_person'),
    cases: {
      loadAll: async () => {
        const { caseRouter } = await import('../cases/CaseRouter');
        const res = await caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: true });
        return res.ok ? (res.data as unknown as PatientCaseLite[]) : [];
      },
      loadAccessibleIds: async () => {
        const { caseRouter } = await import('../cases/CaseRouter');
        const res = await caseRouter.getAll(undefined, { includeOrchestration: true });
        return new Set(res.ok ? res.data.map(c => c.id) : []);
      },
    },
    users: { getAll: async () => { const r = await (await import('../index')).userService.getAll(); return r.ok ? (r.data as never) : []; } },
    messages: { send: async m => (await import('../index')).messageService.send(m) },
    audit: { logEvent: async e => (await import('../index')).auditService.logEvent(e) },
    authorization: { enforce: async c => (await import('../authorization/defaultAuthorizationService')).authorizationService.enforce(c as never) },
  });
  return wired;
}

/** How many of a patient's other cases the signed-in person cannot open. */
export function getRestrictedCaseCount(patientId: string, user: AccessUser, excludeCaseId?: string): Promise<number> {
  return getPatientCaseAccess().getRestrictedCaseCount(patientId, user, excludeCaseId);
}

export { isAdministrator };
