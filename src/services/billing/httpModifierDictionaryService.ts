// src/services/billing/httpModifierDictionaryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498): the API server's version of IModifierDictionaryService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/BILLING_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { IModifierDictionaryService } from './IModifierDictionaryService';

type P<K extends keyof IModifierDictionaryService> = Parameters<IModifierDictionaryService[K]>;
const BASE = '/api/billing/modifier-dictionary';

export const createHttpModifierDictionaryService = (client: ApiHttpClient): IModifierDictionaryService =>
  buildHttpService<IModifierDictionaryService>(client, {
    getAllVersions: result('GET', () => `${BASE}/get-all-versions`),
    getActiveVersion: result('GET', () => `${BASE}/get-active-version`),
    createVersion: result('POST', () => `${BASE}/create-version`, { body: (input: P<'createVersion'>[0]) => (input) }),
    activateVersion: result('POST', () => `${BASE}/activate-version`, { body: (versionId: P<'activateVersion'>[0]) => ({ versionId }) }),
    approveVersion: result('POST', () => `${BASE}/approve-version`, { body: (versionId: P<'approveVersion'>[0], reviewedBy: P<'approveVersion'>[1]) => ({ versionId, reviewedBy }) }),
    rejectVersion: result('POST', () => `${BASE}/reject-version`, { body: (versionId: P<'rejectVersion'>[0], reviewedBy: P<'rejectVersion'>[1], rejectionReason: P<'rejectVersion'>[2]) => ({ versionId, reviewedBy, rejectionReason }) }),
  });
