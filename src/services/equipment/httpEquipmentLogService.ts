// src/services/equipment/httpEquipmentLogService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IEquipmentLogService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/EQUIPMENT_MIGRATION_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';

import type { IEquipmentLogService } from './IEquipmentLogService';

type P<K extends keyof IEquipmentLogService> = Parameters<IEquipmentLogService[K]>;
const BASE = '/api/equipment/equipment-log';

export const createHttpEquipmentLogService = (client: ApiHttpClient): IEquipmentLogService =>
  buildHttpService<IEquipmentLogService>(client, {
    list: result('GET', (equipmentId: P<'list'>[0]) => `${BASE}/list${queryString({ equipmentId })}`),
    add: result('POST', () => `${BASE}/add`, { body: (entry: P<'add'>[0], today: P<'add'>[1]) => ({ entry, today }) }),
  });
