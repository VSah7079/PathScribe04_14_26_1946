// src/services/auth/mfa/httpMfaPolicyService.ts
// Batch 675 (access-14): the API server's version of IMfaPolicyService (shared HTTP kit).
import type { ApiHttpClient } from '../../apiServer/apiHttpClient';
import { buildHttpService, result } from '../../apiServer/httpServiceKit';
import type { IMfaPolicyService } from './IMfaPolicyService';
import type { MfaPolicy } from './mfaPolicy';

const BASE = '/api/session-security/mfa-policy';

export const createHttpMfaPolicyService = (client: ApiHttpClient): IMfaPolicyService =>
  buildHttpService<IMfaPolicyService>(client, {
    get: result('GET', () => `${BASE}/get`),
    save: result('POST', () => `${BASE}/save`, { body: (next: Partial<MfaPolicy>) => next }),
  });
