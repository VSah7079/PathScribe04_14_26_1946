// src/services/quality/peerReviewService.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-144 (Batch 439): peer review before sign-out. Requesting, the reviewer's
// independent read, the consensus step, withdrawing, and the urgent-care
// override when the sign-out gate is on. Decisions are in peerReviewRules.ts;
// this applies them, checks each action's capability, audits, and writes the
// QA activity record when a review completes (which is what recommends a
// CAPA for an unresolved disagreement, through the shared engine).
//
// Capabilities (checked here):
//   case:peer-review:request  — ask for a review, withdraw it, or (as the
//                               signing pathologist) record the consensus
//   case:peer-review:record   — the reviewer's read, and the consensus
//   case:peer-review:override — sign out ahead of the review for urgent care
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { QaActivityRecord } from '@/types/quality/QaActivityRecord';
import type {
  PeerReviewOverride, PeerReviewOverrideReason, PeerReviewRequest, PeerReviewTrigger, PersonRef,
} from '@/types/quality/PeerReview';
import {
  overrideProblem, qaRecordForCompletedReview, readProblem, requestProblem, resolutionProblem,
  retrospectiveDueAt, withdrawProblem, type PeerReviewProblem, type Resolution, type ReviewerRead,
} from './peerReviewRules';

export interface PeerReviewDeps {
  loadRequests(): PeerReviewRequest[];
  persistRequests(all: PeerReviewRequest[]): void;
  loadOverrides(): PeerReviewOverride[];
  persistOverrides(all: PeerReviewOverride[]): void;
  /** What the QA record needs about the case. */
  caseMeta(caseId: string): Promise<{ caseType: string; subspecialtyId?: string; primaryDiagnosis?: string }>;
  qaRecords: { create(record: Omit<QaActivityRecord, 'id' | 'recordedAt'>): Promise<ServiceResult<QaActivityRecord>> };
  audit(entry: NewAuditLog): Promise<unknown>;
  enforce(capability: string, context: { caseId: string }): Promise<{ allowed: boolean }>;
  actor(): PersonRef;
  now?: () => Date;
  newId?: (prefix: string) => string;
}

export type PeerReviewError = PeerReviewProblem | 'NOT_FOUND' | 'NOT_PERMITTED';

export interface IPeerReviewService {
  getForCase(caseId: string): Promise<ServiceResult<{ requests: PeerReviewRequest[]; overrides: PeerReviewOverride[] }>>;
  /** Reviews waiting on this pathologist: their read (pending) or a consensus they are part of. */
  getOpenForUser(userId: string): Promise<ServiceResult<PeerReviewRequest[]>>;
  request(input: { caseId: string; accession?: string; trigger: PeerReviewTrigger; triggerDetail?: string; reviewer: PersonRef; note?: string }): Promise<ServiceResult<PeerReviewRequest>>;
  recordRead(id: string, read: ReviewerRead): Promise<ServiceResult<PeerReviewRequest>>;
  resolve(id: string, resolution: Resolution): Promise<ServiceResult<PeerReviewRequest>>;
  withdraw(id: string, reason: string): Promise<ServiceResult<PeerReviewRequest>>;
  override(caseId: string, input: { reason: PeerReviewOverrideReason; note?: string }): Promise<ServiceResult<PeerReviewOverride>>;
}

export function createPeerReviewService(deps: PeerReviewDeps): IPeerReviewService {
  const now = () => (deps.now ?? (() => new Date()))();
  const newId = deps.newId ?? ((prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
  const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
  const fail = <T>(error: PeerReviewError): ServiceResult<T> => ({ ok: false, error });

  const save = (rec: PeerReviewRequest) => {
    const all = deps.loadRequests();
    deps.persistRequests(all.some(r => r.id === rec.id) ? all.map(r => (r.id === rec.id ? rec : r)) : [rec, ...all]);
  };
  const audit = (event: string, caseId: string, detail: string, user: PersonRef) =>
    deps.audit({ type: 'user', event, detail, user: user.userId, caseId, confidence: null }).catch(() => {});
  const find = (id: string) => deps.loadRequests().find(r => r.id === id);

  /** A completed review writes its QA record; an unresolved disagreement recommends a CAPA from there. */
  const complete = async (rec: PeerReviewRequest): Promise<PeerReviewRequest> => {
    const meta = await deps.caseMeta(rec.caseId);
    const qa = await deps.qaRecords.create(qaRecordForCompletedReview(rec, meta)).catch(() => null);
    return qa?.ok ? { ...rec, qaRecordId: qa.data.id } : rec;
  };

  return {
    async getForCase(caseId) {
      return ok({
        requests: deps.loadRequests().filter(r => r.caseId === caseId),
        overrides: deps.loadOverrides().filter(o => o.caseId === caseId),
      });
    },

    async getOpenForUser(userId) {
      return ok(deps.loadRequests().filter(r =>
        (r.status === 'pending' && r.reviewer.userId === userId)
        || (r.status === 'disagreement' && (r.reviewer.userId === userId || r.primaryPathologist.userId === userId))));
    },

    async request(input) {
      const actor = deps.actor();
      if (!(await deps.enforce('case:peer-review:request', { caseId: input.caseId })).allowed) return fail('NOT_PERMITTED');
      const problem = requestProblem(deps.loadRequests(), { caseId: input.caseId, primaryPathologistId: actor.userId, reviewerId: input.reviewer.userId });
      if (problem) return fail(problem);
      const rec: PeerReviewRequest = {
        id: newId('peer-review'),
        caseId: input.caseId,
        accession: input.accession,
        trigger: input.trigger,
        triggerDetail: input.triggerDetail,
        primaryPathologist: actor,
        reviewer: input.reviewer,
        status: 'pending',
        requestedAt: now().toISOString(),
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      };
      save(rec);
      audit('PEER_REVIEW_REQUESTED', rec.caseId, `Peer review requested from ${rec.reviewer.userName} (${rec.trigger === 'first-time-malignancy' ? 'first-time malignancy' : 'requested by the pathologist'}).${rec.triggerDetail ? ` ${rec.triggerDetail}` : ''}`, actor);
      return ok(rec);
    },

    async recordRead(id, read) {
      const rec = find(id);
      if (!rec) return fail('NOT_FOUND');
      const actor = deps.actor();
      if (!(await deps.enforce('case:peer-review:record', { caseId: rec.caseId })).allowed) return fail('NOT_PERMITTED');
      const problem = readProblem(rec, actor.userId, read);
      if (problem) return fail(problem);
      const at = now().toISOString();
      let next: PeerReviewRequest = read.agrees === false
        ? { ...rec, reviewerAgrees: false, reviewerDiagnosis: read.diagnosis.trim(), disagreementSeverity: read.severity, reviewerNotes: read.notes?.trim() || undefined, reviewedAt: at, status: 'disagreement' }
        : { ...rec, reviewerAgrees: true, reviewerNotes: read.notes?.trim() || undefined, reviewedAt: at, status: 'completed', result: 'concordant', resolvedAt: at, resolvedBy: actor };
      if (next.status === 'completed') next = await complete(next);
      save(next);
      audit('PEER_REVIEW_READ_RECORDED', rec.caseId, read.agrees === false
        ? `Peer reviewer disagrees (${read.severity} severity): ${read.diagnosis.trim()}`
        : 'Peer reviewer agrees with the diagnosis.', actor);
      return ok(next);
    },

    async resolve(id, resolution) {
      const rec = find(id);
      if (!rec) return fail('NOT_FOUND');
      const actor = deps.actor();
      const capability = actor.userId === rec.reviewer.userId ? 'reviewer' : 'requester';
      const allowed = capability === 'reviewer'
        ? (await deps.enforce('case:peer-review:record', { caseId: rec.caseId })).allowed
        : (await deps.enforce('case:peer-review:request', { caseId: rec.caseId })).allowed;
      if (!allowed) return fail('NOT_PERMITTED');
      const problem = resolutionProblem(rec, actor.userId, resolution);
      if (problem) return fail(problem);
      const base: PeerReviewRequest = { ...rec, status: 'completed', result: resolution.result, resolvedAt: now().toISOString(), resolvedBy: actor };
      const next = await complete(resolution.result === 'consensus-reached'
        ? { ...base, consensusDiagnosis: resolution.consensusDiagnosis.trim(), resolutionNote: resolution.note?.trim() || undefined }
        : { ...base, resolutionNote: resolution.note.trim() });
      save(next);
      audit('PEER_REVIEW_RESOLVED', rec.caseId, resolution.result === 'consensus-reached'
        ? `Peer review disagreement resolved by consensus: ${resolution.consensusDiagnosis.trim()}`
        : `Peer review disagreement recorded as unresolved: ${resolution.note.trim()}`, actor);
      return ok(next);
    },

    async withdraw(id, reason) {
      const rec = find(id);
      if (!rec) return fail('NOT_FOUND');
      const actor = deps.actor();
      if (!(await deps.enforce('case:peer-review:request', { caseId: rec.caseId })).allowed) return fail('NOT_PERMITTED');
      const problem = withdrawProblem(rec, actor.userId, reason);
      if (problem) return fail(problem);
      const next: PeerReviewRequest = { ...rec, status: 'withdrawn', withdrawnReason: reason.trim() };
      save(next);
      audit('PEER_REVIEW_WITHDRAWN', rec.caseId, `Peer review request withdrawn: ${reason.trim()}`, actor);
      return ok(next);
    },

    async override(caseId, input) {
      const actor = deps.actor();
      if (!(await deps.enforce('case:peer-review:override', { caseId })).allowed) return fail('NOT_PERMITTED');
      const problem = overrideProblem(input.reason, input.note);
      if (problem) return fail(problem);
      const at = now();
      const rec: PeerReviewOverride = {
        id: newId('peer-review-override'),
        caseId,
        reason: input.reason,
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
        by: actor,
        at: at.toISOString(),
        retrospectiveDueAt: retrospectiveDueAt(at),
      };
      deps.persistOverrides([rec, ...deps.loadOverrides()]);
      audit('PEER_REVIEW_OVERRIDDEN', caseId, `Signed out ahead of peer review for urgent care (${input.reason})${rec.note ? `: ${rec.note}` : ''}. Review due by ${rec.retrospectiveDueAt}.`, actor);
      return ok(rec);
    },
  };
}
