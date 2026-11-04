// src/services/usEpath/httpUsEpathService.ts
// Batch 620 (part E, PS-800): the API server's version of IUsEpathService (HTTP_SERVICES_PATTERN.md §7).
// One route per method; a refusal is a fixed code. Contract: docs/architecture/US_EPATH_API.md
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { IUsEpathService } from './IUsEpathService';

type P<K extends keyof IUsEpathService> = Parameters<IUsEpathService[K]>;
const BASE = '/api/us-epath/us-epath';

export const createHttpUsEpathService = (client: ApiHttpClient): IUsEpathService =>
  buildHttpService<IUsEpathService>(client, {
    getProfiles: result('GET', () => `${BASE}/get-profiles`),
    saveProfile: result('POST', () => `${BASE}/save-profile`, { body: (input: P<'saveProfile'>[0]) => input }),
    removeProfile: result('POST', () => `${BASE}/remove-profile`, { body: (id: P<'removeProfile'>[0]) => ({ id }) }),
    getAssignments: result('GET', () => `${BASE}/get-assignments`),
    setAssignment: result('POST', () => `${BASE}/set-assignment`, { body: (input: P<'setAssignment'>[0]) => input }),
    removeAssignment: result('POST', () => `${BASE}/remove-assignment`, { body: (facilityId: P<'removeAssignment'>[0]) => ({ facilityId }) }),
  });
