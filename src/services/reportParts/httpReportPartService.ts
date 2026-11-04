// src/services/reportParts/httpReportPartService.ts
// Batch 616 (PS-483): the API server's report part library (the building blocks of report templates).
// Contract: REPORTS_API.md section 6. A change made through this service tells the open screens
// (the same event the mock fires) so a library tab refreshes after a save.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { itemsOf, type ItemsReply } from '../apiServer/replyShapes';
import type { ReportPart } from '../../types/reportPart';
import type { ServiceResult } from '../types';
import type { IReportPartService } from './IReportPartService';

type Args<K extends keyof IReportPartService> = Parameters<IReportPartService[K]>;
const BASE = '/api/report-parts/report-part';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpReportPartService(client: ApiHttpClient, onChanged: () => void = () => {}): IReportPartService {
  const routes = buildHttpService<IReportPartService>(client, {
    getAll: result('POST', () => route('getAll'), { body: (filter: Args<'getAll'>[0]) => filter, pick: (d: ItemsReply<ReportPart>) => itemsOf(d) }),
    getById: result('GET', (id: Args<'getById'>[0]) => `${route('getById')}${queryString({ id })}`),
    getByIds: result('GET', (ids: Args<'getByIds'>[0]) => `${route('getByIds')}${queryString({ ids })}`, { pick: (d: ItemsReply<ReportPart>) => itemsOf(d) }),
    create: result('POST', () => route('create'), { body: (partial?: unknown) => partial ?? {} }),
    save: result('POST', () => route('save'), { body: (part: ReportPart) => part }),
    publish: result('POST', () => route('publish'), { body: (id: Args<'publish'>[0]) => ({ id }) }),
    archive: result('POST', () => route('archive'), { body: (id: Args<'archive'>[0]) => ({ id }) }),
    clone: result('POST', () => route('clone'), { body: (id: string, newName: string) => ({ id, newName }) }),
    remove: result('POST', () => route('remove'), { body: (id: Args<'remove'>[0]) => ({ id }) }),
  });
  const changing = <A extends unknown[], T>(call: (...a: A) => Promise<ServiceResult<T>>) => async (...a: A): Promise<ServiceResult<T>> => {
    const r = await call(...a);
    if (r.ok === true) onChanged();
    return r;
  };
  return {
    ...routes,
    create: changing(routes.create), save: changing(routes.save), publish: changing(routes.publish),
    archive: changing(routes.archive), clone: changing(routes.clone), remove: changing(routes.remove),
  };
}
