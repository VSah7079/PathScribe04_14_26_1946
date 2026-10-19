// src/services/billing/httpBillingRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498): the API server's version of IBillingRuleService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/BILLING_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IBillingRuleService } from './IBillingRuleService';

type P<K extends keyof IBillingRuleService> = Parameters<IBillingRuleService[K]>;
const BASE = '/api/billing/billing-rule';

export const createHttpBillingRuleService = (client: ApiHttpClient): IBillingRuleService =>
  buildHttpService<IBillingRuleService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getVersionsForBillingCode: result('GET', (billingCode: P<'getVersionsForBillingCode'>[0], siteId: P<'getVersionsForBillingCode'>[1]) => `${BASE}/get-versions-for-billing-code${queryString({ billingCode, siteId })}`),
    getActiveRuleAt: result('POST', () => `${BASE}/get-active-rule-at`, { body: (billingCode: P<'getActiveRuleAt'>[0], dateOfService: P<'getActiveRuleAt'>[1], siteId: P<'getActiveRuleAt'>[2], options: P<'getActiveRuleAt'>[3]) => ({ billingCode, dateOfService, siteId, options }) }),
    createVersion: result('POST', () => `${BASE}/create-version`, { body: (input: P<'createVersion'>[0]) => (input) }),
    submitForApproval: result('POST', () => `${BASE}/submit-for-approval`, { body: (billingCode: P<'submitForApproval'>[0], version: P<'submitForApproval'>[1], siteId: P<'submitForApproval'>[2], submittedBy: P<'submitForApproval'>[3]) => ({ billingCode, version, siteId, submittedBy }) }),
    approveVersion: result('POST', () => `${BASE}/approve-version`, { body: (billingCode: P<'approveVersion'>[0], version: P<'approveVersion'>[1], siteId: P<'approveVersion'>[2], reviewedBy: P<'approveVersion'>[3]) => ({ billingCode, version, siteId, reviewedBy }) }),
    rejectVersion: result('POST', () => `${BASE}/reject-version`, { body: (billingCode: P<'rejectVersion'>[0], version: P<'rejectVersion'>[1], siteId: P<'rejectVersion'>[2], reviewedBy: P<'rejectVersion'>[3], rejectionReason: P<'rejectVersion'>[4]) => ({ billingCode, version, siteId, reviewedBy, rejectionReason }) }),
    retireVersion: result('POST', () => `${BASE}/retire-version`, { body: (billingCode: P<'retireVersion'>[0], version: P<'retireVersion'>[1], effectiveTo: P<'retireVersion'>[2], siteId: P<'retireVersion'>[3]) => ({ billingCode, version, effectiveTo, siteId }) }),
  });
