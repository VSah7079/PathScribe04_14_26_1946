// src/services/cytologyQc/httpCytologyQcCaseAssignmentService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-499): the API server's version of ICytologyQcCaseAssignmentService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICytologyQcCaseAssignmentService } from './ICytologyQcCaseAssignmentService';

type P<K extends keyof ICytologyQcCaseAssignmentService> = Parameters<ICytologyQcCaseAssignmentService[K]>;
const BASE = '/api/cytology-qc/cytology-qc-case-assignment';

export const createHttpCytologyQcCaseAssignmentService = (client: ApiHttpClient): ICytologyQcCaseAssignmentService =>
  buildHttpService<ICytologyQcCaseAssignmentService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    getByCaseId: result('GET', (caseId: P<'getByCaseId'>[0]) => `${BASE}/get-by-case-id${queryString({ caseId })}`),
    getUnifiedQueue: result('GET', () => `${BASE}/get-unified-queue`),
    create: result('POST', () => `${BASE}/create`, { body: (assignment: P<'create'>[0]) => (assignment) }),
    applyAdditionalTrigger: result('POST', () => `${BASE}/apply-additional-trigger`, { body: (id: P<'applyAdditionalTrigger'>[0], changes: P<'applyAdditionalTrigger'>[1]) => ({ id, changes }) }),
    assignReviewer: result('POST', () => `${BASE}/assign-reviewer`, { body: (id: P<'assignReviewer'>[0], reviewerId: P<'assignReviewer'>[1]) => ({ id, reviewerId }) }),
    recordConcurrence: result('POST', () => `${BASE}/record-concurrence`, { body: (id: P<'recordConcurrence'>[0], reviewerCommentary: P<'recordConcurrence'>[1]) => ({ id, reviewerCommentary }) }),
    recordDiscrepancy: result('POST', () => `${BASE}/record-discrepancy`, { body: (id: P<'recordDiscrepancy'>[0], discrepancy: P<'recordDiscrepancy'>[1]) => ({ id, discrepancy }) }),
    escalateForSlaBreach: result('POST', () => `${BASE}/escalate-for-sla-breach`, { body: (id: P<'escalateForSlaBreach'>[0], now: P<'escalateForSlaBreach'>[1], reason: P<'escalateForSlaBreach'>[2]) => ({ id, now, reason }) }),
    supervisorBypass: result('POST', () => `${BASE}/supervisor-bypass`, { body: (id: P<'supervisorBypass'>[0], supervisorId: P<'supervisorBypass'>[1], justification: P<'supervisorBypass'>[2]) => ({ id, supervisorId, justification }) }),
  });
