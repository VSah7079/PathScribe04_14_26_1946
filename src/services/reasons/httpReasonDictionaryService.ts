// src/services/reasons/httpReasonDictionaryService.ts
// Batch 616 (PS-507): the API server's version of IReasonDictionaryService
// (contract: LAB_DICTIONARIES_API.md §7). A category is always named; the server
// returns that category only.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import type { IReasonDictionaryService, ReasonDictionaryEntry } from '@/types/reasons/ReasonDictionaryEntry';

type Args<K extends keyof IReasonDictionaryService> = Parameters<IReasonDictionaryService[K]>;
const BASE = '/api/reasons/reason-dictionary';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpReasonDictionaryService = (client: ApiHttpClient): IReasonDictionaryService =>
  buildHttpService<IReasonDictionaryService>(client, {
    getAll: result('GET', (category: Args<'getAll'>[0]) => `${route('getAll')}${queryString({ category })}`, { pick: (d: { items: ReasonDictionaryEntry[] }) => d.items ?? [] }),
    add: result('POST', () => route('add'), { body: (e: Omit<ReasonDictionaryEntry, 'id'>) => e }),
    update: result('POST', () => route('update'), { body: (id: string, c: Partial<Omit<ReasonDictionaryEntry, 'id' | 'category'>>) => ({ id, changes: c }) }),
    deactivate: result('POST', () => route('deactivate'), { body: (id: Args<'deactivate'>[0]) => ({ id }) }),
    reactivate: result('POST', () => route('reactivate'), { body: (id: Args<'reactivate'>[0]) => ({ id }) }),
  });
