// src/services/facilities/httpFacilityService.ts
// Batch 616 (PS-484): the API server's version of IFacilityService (contract:
// STAFF_ADMIN_API.md §4). `add` and `update` never carry the print settings
// (setPrintSettings has its own call and permission, config:print-settings:manage).
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { Facility, IFacilityService } from './IFacilityService';
import type { FacilityReportPrintSettings } from '../printing/facilityReportPrinting';

type Args<K extends keyof IFacilityService> = Parameters<IFacilityService[K]>;
const BASE = '/api/facilities/facility';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpFacilityService = (client: ApiHttpClient): IFacilityService =>
  buildHttpService<IFacilityService>(client, {
    getAll: result('GET', () => route('getAll'), { pick: (d: { items: Facility[] }) => d.items ?? [] }),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    add: result('POST', () => route('add'), { body: (f: Omit<Facility, 'id'>) => f }),
    update: result('POST', () => route('update'), { body: (id: string, c: Partial<Omit<Facility, 'id'>>) => ({ id, changes: c }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
    verify: result('POST', () => route('verify'), { body: (id: Args<'verify'>[0]) => ({ id }) }),
    setPrintSettings: result('POST', () => route('setPrintSettings'), { body: (id: string, s: FacilityReportPrintSettings) => ({ id, settings: s }) }),
    setDirectDevicePrinting: result('POST', () => route('setDirectDevicePrinting'), { body: (id: string, allowed: boolean) => ({ id, allowed }) }),
    findOrCreateByAssigningAuthority: result('POST', () => route('findOrCreateByAssigningAuthority'), { body: (assigningAuthority: string, name: string, note?: string) => ({ assigningAuthority, name, note }) }),
  });
