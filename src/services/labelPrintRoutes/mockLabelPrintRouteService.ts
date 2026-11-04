// src/services/labelPrintRoutes/mockLabelPrintRouteService.ts
// Batch 730: the demo's record of add-on slide labels printed at another station (mock storage). Append only; the
// newest route for a slide wins. The API server keeps the same record (CASE_WORKFLOWS_API.md).
import type { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import type { ILabelPrintRouteService, LabelPrintRoute } from './ILabelPrintRouteService';

const KEY = 'addOnLabelPrintRoutes';
const load = (): LabelPrintRoute[] => storageGet<LabelPrintRoute[]>(KEY, []);

export const mockLabelPrintRouteService: ILabelPrintRouteService = {
  async recordPrinted(routes): Promise<ServiceResult<LabelPrintRoute[]>> {
    if (!(await authorizationService.enforce('print:job:redirect')).allowed) return { ok: false, error: 'NOT_PERMITTED' };
    if (routes.some(r => !r.stainOrderId || !r.stationId)) return { ok: false, error: 'INVALID' };
    const at = new Date().toISOString();
    const recorded = routes.map(r => ({ ...r, printedAt: at }));
    storageSet(KEY, [...load(), ...recorded]);
    return { ok: true, data: recorded };
  },
  async getForStainOrders(ids): Promise<ServiceResult<LabelPrintRoute[]>> {
    const wanted = new Set(ids);
    const latest = new Map<string, LabelPrintRoute>();
    for (const r of load()) if (wanted.has(r.stainOrderId)) latest.set(r.stainOrderId, r);
    return { ok: true, data: [...latest.values()] };
  },
};
