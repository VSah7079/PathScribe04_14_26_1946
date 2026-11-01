// src/services/itemEndStates/httpItemEndStateService.ts
// Batch 731: the API server's version of IItemEndStateService (HTTP_SERVICES_PATTERN.md §7). Every call is POST: the
// bodies name a case or its items, never a URL. Contract: CASE_WORKFLOWS_API.md, "Item end states".
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { IItemEndStateService } from './IItemEndStateService';

type P<K extends keyof IItemEndStateService> = Parameters<IItemEndStateService[K]>;
const BASE = '/api/item-end-states/item-end-state';

export const createHttpItemEndStateService = (client: ApiHttpClient): IItemEndStateService =>
  buildHttpService<IItemEndStateService>(client, {
    record: result('POST', () => methodPath(BASE, 'record'), { body: (entry: P<'record'>[0]) => entry }),
    recordFromAction: result('POST', () => methodPath(BASE, 'recordFromAction'), { body: (entry: P<'recordFromAction'>[0]) => entry }),
    listForItems: result('POST', () => methodPath(BASE, 'listForItems'), { body: (itemIds: P<'listForItems'>[0]) => ({ itemIds }) }),
    listForCase: result('POST', () => methodPath(BASE, 'listForCase'), { body: (caseAccession: P<'listForCase'>[0]) => ({ caseAccession }) }),
  });
