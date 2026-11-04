// src/services/cosd/httpCosdDestinationService.ts
// Batch 620 (part C, PS-800): the API server's version of ICosdDestinationService (HTTP_SERVICES_PATTERN.md §7).
// One route per method; a refusal is a fixed code. Contract: docs/architecture/UK_COSD_API.md
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { ICosdDestinationService } from './ICosdDestinationService';

type P<K extends keyof ICosdDestinationService> = Parameters<ICosdDestinationService[K]>;
const BASE = '/api/cosd/cosd-destination';

export const createHttpCosdDestinationService = (client: ApiHttpClient): ICosdDestinationService =>
  buildHttpService<ICosdDestinationService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getForFacility: result('GET', (facilityId: P<'getForFacility'>[0]) => `${BASE}/get-for-facility${queryString({ facilityId })}`),
    set: result('POST', () => `${BASE}/set`, { body: (input: P<'set'>[0]) => input }),
    remove: result('POST', () => `${BASE}/remove`, { body: (facilityId: P<'remove'>[0]) => ({ facilityId }) }),
  });
