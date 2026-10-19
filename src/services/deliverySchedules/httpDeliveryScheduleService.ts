// src/services/deliverySchedules/httpDeliveryScheduleService.ts
// Batch 619 (PS-800): the API server's version of IDeliveryScheduleService (HTTP_SERVICES_PATTERN.md §7).
// One route per method; a refusal is a fixed code. Contract: docs/architecture/DELIVERY_SCHEDULES_API.md
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IDeliveryScheduleService } from './IDeliveryScheduleService';

type P<K extends keyof IDeliveryScheduleService> = Parameters<IDeliveryScheduleService[K]>;
const BASE = '/api/delivery-schedules/delivery-schedule';

export const createHttpDeliveryScheduleService = (client: ApiHttpClient): IDeliveryScheduleService =>
  buildHttpService<IDeliveryScheduleService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getForFacility: result('GET', (facilityId: P<'getForFacility'>[0]) => `${BASE}/get-for-facility${queryString({ facilityId })}`),
    set: result('POST', () => `${BASE}/set`, { body: (input: P<'set'>[0]) => ({ ...input, registryKey: input.registryKey ?? null }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (feed: P<'remove'>[0], facilityId: P<'remove'>[1], registryKey?: P<'remove'>[2]) => ({ feed, facilityId, registryKey: registryKey ?? null }) }),
  });
