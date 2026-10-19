// src/services/patients/httpOutboundPatientAdtQueueService.ts
// Batch 616 (PS-503): the API server's queue of patient ADT messages going out. Contract: PATIENTS_API.md section 5.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { outboundQueueRoutes } from '../apiServer/outboundQueueRoutes';
import { itemsOf } from '../apiServer/replyShapes';
import type { IOutboundPatientAdtQueueService } from './IOutboundPatientAdtQueueService';

type Args<K extends keyof IOutboundPatientAdtQueueService> = Parameters<IOutboundPatientAdtQueueService[K]>;
const BASE = '/api/patients/outbound-patient-adt-queue';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpOutboundPatientAdtQueueService = (client: ApiHttpClient): IOutboundPatientAdtQueueService =>
  buildHttpService<IOutboundPatientAdtQueueService>(client, {
    ...outboundQueueRoutes(BASE),
    getByPatientId: result('GET', (patientId: Args<'getByPatientId'>[0]) => `${route('getByPatientId')}${queryString({ patientId })}`, { pick: (d: { items?: unknown[] }) => itemsOf(d) }),
  });
