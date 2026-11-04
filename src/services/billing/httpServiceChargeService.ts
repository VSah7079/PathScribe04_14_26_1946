// src/services/billing/httpServiceChargeService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498): the API server's version of IServiceChargeService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/BILLING_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IServiceChargeService } from './IServiceChargeService';

type P<K extends keyof IServiceChargeService> = Parameters<IServiceChargeService[K]>;
const BASE = '/api/billing/service-charge';

export const createHttpServiceChargeService = (client: ApiHttpClient): IServiceChargeService =>
  buildHttpService<IServiceChargeService>(client, {
    saveCharge: result('POST', () => `${BASE}/save-charge`, { body: (record: P<'saveCharge'>[0]) => (record) }),
    getChargesForCase: result('GET', (caseId: P<'getChargesForCase'>[0]) => `${BASE}/get-charges-for-case${queryString({ caseId })}`),
    listRuleReferenceKeys: result('GET', () => `${BASE}/list-rule-reference-keys`),
    findActiveChargeForSource: result('GET', (caseId: P<'findActiveChargeForSource'>[0], specimenId: P<'findActiveChargeForSource'>[1], blockId: P<'findActiveChargeForSource'>[2], billingCode: P<'findActiveChargeForSource'>[3]) => `${BASE}/find-active-charge-for-source${queryString({ caseId, specimenId, blockId, billingCode })}`),
    submitForApproval: result('POST', () => `${BASE}/submit-for-approval`, { body: (chargeId: P<'submitForApproval'>[0], submittedBy: P<'submitForApproval'>[1], actorRole: P<'submitForApproval'>[2]) => ({ chargeId, submittedBy, actorRole }) }),
    approveCharge: result('POST', () => `${BASE}/approve-charge`, { body: (chargeId: P<'approveCharge'>[0], approvedBy: P<'approveCharge'>[1], bypassAuthorized: P<'approveCharge'>[2], actorRole: P<'approveCharge'>[3]) => ({ chargeId, approvedBy, bypassAuthorized, actorRole }) }),
    rejectCharge: result('POST', () => `${BASE}/reject-charge`, { body: (chargeId: P<'rejectCharge'>[0], reviewedBy: P<'rejectCharge'>[1], rejectionReason: P<'rejectCharge'>[2], actorRole: P<'rejectCharge'>[3]) => ({ chargeId, reviewedBy, rejectionReason, actorRole }) }),
    holdCharge: result('POST', () => `${BASE}/hold-charge`, { body: (chargeId: P<'holdCharge'>[0], heldBy: P<'holdCharge'>[1]) => ({ chargeId, heldBy }) }),
    releaseHold: result('POST', () => `${BASE}/release-hold`, { body: (chargeId: P<'releaseHold'>[0], releasedBy: P<'releaseHold'>[1]) => ({ chargeId, releasedBy }) }),
    listByApprovalStatus: result('GET', (statuses: P<'listByApprovalStatus'>[0]) => `${BASE}/list-by-approval-status${queryString({ statuses })}`),
  });
