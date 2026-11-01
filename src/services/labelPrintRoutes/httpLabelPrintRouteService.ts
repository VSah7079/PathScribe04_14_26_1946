// src/services/labelPrintRoutes/httpLabelPrintRouteService.ts
// Batch 730: the API server's version of ILabelPrintRouteService (HTTP_SERVICES_PATTERN.md §7). Both calls are POST
// (the ids are in the body, never a URL). Contract: CASE_WORKFLOWS_API.md, "Print labels at".
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { ILabelPrintRouteService } from './ILabelPrintRouteService';

type P<K extends keyof ILabelPrintRouteService> = Parameters<ILabelPrintRouteService[K]>;
const BASE = '/api/label-print-routes/label-print-route';

export const createHttpLabelPrintRouteService = (client: ApiHttpClient): ILabelPrintRouteService =>
  buildHttpService<ILabelPrintRouteService>(client, {
    recordPrinted: result('POST', () => methodPath(BASE, 'recordPrinted'), { body: (routes: P<'recordPrinted'>[0]) => ({ routes }) }),
    getForStainOrders: result('POST', () => methodPath(BASE, 'getForStainOrders'), { body: (ids: P<'getForStainOrders'>[0]) => ({ stainOrderIds: ids }) }),
  });
