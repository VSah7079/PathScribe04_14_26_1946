// src/services/orderIntake/httpOrderIntakeService.ts
// Batch 616 (PS-505): the API server's incoming-order intake and specimen-code crosswalk.
// Contract: docs/architecture/ACCESSIONING_API.md section 1. The server receives orders from the
// interface engine (HL7, API); the browser lists, links and resolves them.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { itemsOf, type ItemsReply } from '../apiServer/replyShapes';
import type { IncomingOrder, IOrderIntakeService, SpecimenCodeCrosswalkEntry } from './IOrderIntakeService';

type Args<K extends keyof IOrderIntakeService> = Parameters<IOrderIntakeService[K]>;
const BASE = '/api/order-intake/order-intake';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpOrderIntakeService = (client: ApiHttpClient): IOrderIntakeService =>
  buildHttpService<IOrderIntakeService>(client, {
    listPendingOrders: result('POST', () => route('listPendingOrders'), { body: (params: Args<'listPendingOrders'>[0]) => params, pick: (d: ItemsReply<IncomingOrder>) => itemsOf(d) }),
    getOrder: result('GET', (orderId: Args<'getOrder'>[0]) => `${route('getOrder')}${queryString({ orderId })}`),
    markOrderLinked: result('POST', () => route('markOrderLinked'), { body: (orderId: string, caseId: string) => ({ orderId, caseId }) }),
    receiveOrder: result('POST', () => route('receiveOrder'), { body: (order: unknown) => order }),
    resolveOrder: result('POST', () => route('resolveOrder'), { body: (orderId: Args<'resolveOrder'>[0]) => ({ orderId }) }),
    listCrosswalkEntries: result('GET', (clientId: Args<'listCrosswalkEntries'>[0]) => `${route('listCrosswalkEntries')}${queryString({ clientId })}`, { pick: (d: ItemsReply<SpecimenCodeCrosswalkEntry>) => itemsOf(d) }),
    addCrosswalkEntry: result('POST', () => route('addCrosswalkEntry'), { body: (entry: unknown) => entry }),
    updateCrosswalkEntry: result('POST', () => route('updateCrosswalkEntry'), { body: (id: string, changes: unknown) => ({ id, changes }) }),
  });
