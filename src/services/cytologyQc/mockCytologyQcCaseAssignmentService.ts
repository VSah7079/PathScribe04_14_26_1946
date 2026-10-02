// src/services/cytologyQc/mockCytologyQcCaseAssignmentService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Mock implementation of ICytologyQcCaseAssignmentService. Real,
// honest state-machine enforcement — every transition method checks
// the assignment's own current, real state before acting, and
// refuses with a real error rather than silently allowing an
// out-of-order transition (e.g. recording a discrepancy on a case
// still sitting in QC_PENDING, never yet assigned a reviewer).
// ─────────────────────────────────────────────────────────────────────────────

import type { ICytologyQcCaseAssignmentService, NewCytologyQcCaseAssignment } from './ICytologyQcCaseAssignmentService';
import type { CytologyQcCaseAssignment } from '@/types/cytologyQc/CytologyQcRule';
import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { resolveQcReviewerEligibility } from './resolveQcReviewerEligibility';
import { sortQcQueueByPriority } from './sortQcQueueByPriority';
import { resolveQcSlaStatus } from './resolveQcSlaStatus';
import { mockAuditService } from '../auditlog/mockAuditService';
import { demoCytologyQcAssignments } from './demoCytologyQcAssignments';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { getSessionUser } from '../auth/caseAccessControl';

/** Batch 432: the signed-in person's name for the audit trail. */
function actorName(fallback = 'Unknown'): string {
  const me = getSessionUser();
  return me ? ([me.firstName, me.lastName].filter(Boolean).join(' ') || me.id) : fallback;
}

import { QC_REVIEW_NOT_PERMITTED } from './qcReviewErrors';

// Batch 396: taking a QC review and recording its verdict needs
// cytology:qc-review:record (Pathologist and Fellow, who had the queue).

const STORAGE_KEY = 'cytologyQcCaseAssignments';

// Batch 395: a store that has never been written starts with the demo assignments.
const load = (): CytologyQcCaseAssignment[] => storageGet<CytologyQcCaseAssignment[] | null>(STORAGE_KEY, null) ?? demoCytologyQcAssignments();
const persist = (data: CytologyQcCaseAssignment[]) => storageSet(STORAGE_KEY, data);
let _cache: CytologyQcCaseAssignment[] = load();

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = (message: string): ServiceResult<never> => ({ ok: false, error: message });
const delay = () => new Promise(res => setTimeout(res, 30));

export const mockCytologyQcCaseAssignmentService: ICytologyQcCaseAssignmentService = {
  async getAll() {
    await delay();
    return ok([..._cache]);
  },

  async getById(id: ID) {
    await delay();
    const found = _cache.find(a => a.id === id);
    return found ? ok({ ...found }) : err(`CytologyQcCaseAssignment ${id} not found`);
  },

  async getByCaseId(caseId: string) {
    await delay();
    return ok(_cache.filter(a => a.caseId === caseId));
  },

  async getUnifiedQueue() {
    await delay();
    const active = _cache.filter(a => a.state === 'QC_PENDING' || a.state === 'QC_IN_REVIEW');
    return ok(sortQcQueueByPriority(active));
  },

  async create(assignment: NewCytologyQcCaseAssignment) {
    await delay();
    const created: CytologyQcCaseAssignment = { ...assignment, id: 'qc-assign-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) };
    _cache = [..._cache, created];
    persist(_cache);
    return ok({ ...created });
  },

  async assignReviewer(id: ID, reviewerId: string) {
    const decision = await authorizationService.enforce('cytology:qc-review:record', { caseId: _cache.find(a => a.id === id)?.caseId ?? null });
    if (!decision.allowed) return err(QC_REVIEW_NOT_PERMITTED);
    await delay();
    const idx = _cache.findIndex(a => a.id === id);
    if (idx === -1) return err(`CytologyQcCaseAssignment ${id} not found`);
    const current = _cache[idx];
    if (current.state !== 'QC_PENDING') {
      return err(`Cannot assign a reviewer to assignment ${id} — it is genuinely in state "${current.state}", not QC_PENDING.`);
    }
    if (!resolveQcReviewerEligibility(reviewerId, current.primarySignOutProviderId)) {
      return err('Self-review is not permitted: the assigned reviewer cannot be the case\'s own primary sign-out provider.');
    }
    const updated: CytologyQcCaseAssignment = { ...current, state: 'QC_IN_REVIEW', assignedReviewerId: reviewerId };
    _cache = [..._cache.slice(0, idx), updated, ..._cache.slice(idx + 1)];
    persist(_cache);
    return ok({ ...updated });
  },

  async recordConcurrence(id: ID, reviewerCommentary?: string) {
    const decision = await authorizationService.enforce('cytology:qc-review:record', { caseId: _cache.find(a => a.id === id)?.caseId ?? null });
    if (!decision.allowed) return err(QC_REVIEW_NOT_PERMITTED);
    await delay();
    const idx = _cache.findIndex(a => a.id === id);
    if (idx === -1) return err(`CytologyQcCaseAssignment ${id} not found`);
    const current = _cache[idx];
    if (current.state !== 'QC_IN_REVIEW') {
      return err(`Cannot record concurrence for assignment ${id} — it is genuinely in state "${current.state}", not QC_IN_REVIEW.`);
    }
    const updated: CytologyQcCaseAssignment = {
      ...current,
      state: 'FINAL_APPROVED',
      resolvedAt: new Date().toISOString(),
      concurrenceCommentary: reviewerCommentary,
    };
    _cache = [..._cache.slice(0, idx), updated, ..._cache.slice(idx + 1)];
    persist(_cache);
    return ok({ ...updated });
  },

  async recordDiscrepancy(id: ID, discrepancy) {
    const decision = await authorizationService.enforce('cytology:qc-review:record', { caseId: _cache.find(a => a.id === id)?.caseId ?? null });
    if (!decision.allowed) return err(QC_REVIEW_NOT_PERMITTED);
    await delay();
    const idx = _cache.findIndex(a => a.id === id);
    if (idx === -1) return err(`CytologyQcCaseAssignment ${id} not found`);
    const current = _cache[idx];
    if (current.state !== 'QC_IN_REVIEW') {
      return err(`Cannot record a discrepancy for assignment ${id} — it is genuinely in state "${current.state}", not QC_IN_REVIEW.`);
    }
    const updated: CytologyQcCaseAssignment = {
      ...current,
      state: 'QC_DISCREPANCY_REVISE',
      resolvedAt: new Date().toISOString(),
      discrepancy: { ...discrepancy, loggedAt: new Date().toISOString() },
    };
    _cache = [..._cache.slice(0, idx), updated, ..._cache.slice(idx + 1)];
    persist(_cache);
    return ok({ ...updated });
  },

  async escalateForSlaBreach(id: ID, now: string, reason: string) {
    // Batch 432: a reviewer escalates from the queue (cytology:qc-review:record).
    const decision = await authorizationService.enforce('cytology:qc-review:record', { caseId: _cache.find(a => a.id === id)?.caseId ?? null });
    if (!decision.allowed) return err(QC_REVIEW_NOT_PERMITTED);
    if (!reason.trim()) return err('A reason is required to escalate.');
    await delay();
    const idx = _cache.findIndex(a => a.id === id);
    if (idx === -1) return err(`CytologyQcCaseAssignment ${id} not found`);
    const current = _cache[idx];
    if (current.state !== 'QC_IN_REVIEW') {
      return err(`Cannot escalate assignment ${id} — it is genuinely in state "${current.state}", not QC_IN_REVIEW.`);
    }
    const slaStatus = resolveQcSlaStatus(current.createdAt, current.slaDeadline, now);
    if (slaStatus !== 'breached') {
      return err(`Cannot escalate assignment ${id} — it has not genuinely breached its own real SLA deadline yet (real status: "${slaStatus}").`);
    }
    const updated: CytologyQcCaseAssignment = {
      ...current,
      state: 'QC_PENDING',
      assignedReviewerId: undefined,
      slaEscalationCount: current.slaEscalationCount + 1,
    };
    _cache = [..._cache.slice(0, idx), updated, ..._cache.slice(idx + 1)];
    persist(_cache);
    await mockAuditService.logEvent({
      type: 'user', event: 'Cytology QC SLA Breach — Case Escalated', caseId: current.caseId, user: actorName(), confidence: null,
      detail: `Assignment ${id} released back to the unified queue after breaching its own SLA deadline (${current.slaDeadline}). Reason: ${reason}.`,
    }).catch(() => {});
    return ok({ ...updated });
  },

  async supervisorBypass(id: ID, supervisorId: string, justification: string) {
    // Batch 432 (Pete): cytology:qc-review:bypass, assigned by an administrator.
    const decision = await authorizationService.enforce('cytology:qc-review:bypass', { caseId: _cache.find(a => a.id === id)?.caseId ?? null });
    if (!decision.allowed) return err(QC_REVIEW_NOT_PERMITTED);
    if (!justification.trim()) return err('A justification is required to bypass.');
    await delay();
    const idx = _cache.findIndex(a => a.id === id);
    if (idx === -1) return err(`CytologyQcCaseAssignment ${id} not found`);
    const current = _cache[idx];
    if (current.state === 'FINAL_APPROVED' || current.state === 'QC_DISCREPANCY_REVISE') {
      return err(`Cannot bypass assignment ${id} — it is genuinely already in a terminal state ("${current.state}").`);
    }
    const updated: CytologyQcCaseAssignment = {
      ...current,
      state: 'FINAL_APPROVED',
      resolvedAt: new Date().toISOString(),
      supervisorBypass: { supervisorId, justification, bypassedAt: new Date().toISOString() },
    };
    _cache = [..._cache.slice(0, idx), updated, ..._cache.slice(idx + 1)];
    persist(_cache);
    await mockAuditService.logEvent({
      type: 'user', event: 'Cytology QC Supervisor Bypass', caseId: current.caseId, user: actorName(supervisorId), confidence: null,
      detail: `Assignment ${id} force-approved by supervisor ${actorName(supervisorId)} to prevent clinical delay. Justification: ${justification}.`,
    }).catch(() => {});
    return ok({ ...updated });
  },
};
