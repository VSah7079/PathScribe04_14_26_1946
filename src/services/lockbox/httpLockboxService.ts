// src/services/lockbox/httpLockboxService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the API server's version of ILockboxService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/LOCKBOX_API.md.
// Every method of the interface has a route. The barcode is an identifier, so no read puts it in a URL: lookup and
// every write are POSTs with the values in the body. Only the folder, which takes no arguments, is a GET. The body
// carries no user and no time: the server stamps both from the token and ignores any it is sent. A refusal comes back as
// a fixed code (NOT_PERMITTED, CONFLICT for a barcode already received, INVALID, NOT_FOUND ...).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { ILockboxService } from './ILockboxService';

type P<K extends keyof ILockboxService, N extends number> = Parameters<ILockboxService[K]>[N];

const BASE = '/api/lockbox/lockbox-drop-off';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpLockboxService = (client: ApiHttpClient): ILockboxService =>
  buildHttpService<ILockboxService>(client, {
    lookupBarcode: result('POST', () => route('lookupBarcode'), { body: (barcode: P<'lookupBarcode', 0>) => ({ barcode }) }),
    receiveSpecimen: result('POST', () => route('receiveSpecimen'), { body: (input: P<'receiveSpecimen', 0>) => input }),
    getFolder: result('GET', () => route('getFolder')),
    markAccessioned: result('POST', () => route('markAccessioned'), { body: (receiptId: P<'markAccessioned', 0>) => ({ receiptId }) }),
    accessionReceiptForCase: result('POST', () => route('accessionReceiptForCase'), { body: (input: P<'accessionReceiptForCase', 0>) => input }),
    resolvePlaceholder: result('POST', () => route('resolvePlaceholder'), { body: (receiptId: P<'resolvePlaceholder', 0>, accessionNumber: P<'resolvePlaceholder', 1>) => ({ receiptId, accessionNumber }) }),
  });
