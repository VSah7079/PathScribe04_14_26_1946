// src/services/caseAttachments/httpAttachmentStorageService.ts
// Batch 742: the API server's version of IAttachmentStorageService, built from the shared HTTP kit
// (docs/architecture/HTTP_SERVICES_PATTERN.md). Calls: docs/architecture/CASE_ATTACHMENTS_API.md.
// Three server calls (destination, completion, read link); the bytes themselves go straight from the browser to the
// destination the adapter named (a pre-signed link to the hospital's bucket, or the adapter's one-time staging
// link), never through the PathScribe API. The file name travels in the body only, never in a URL.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, result } from '../apiServer/httpServiceKit';
import type { ServiceResult } from '../types';
import type { IAttachmentStorageService, UploadDestination } from './IAttachmentStorageService';

type P<K extends keyof IAttachmentStorageService, N extends number> = Parameters<IAttachmentStorageService[K]>[N];

const BASE = '/api/case-attachments/attachment-storage';
const route = (method: string): string => methodPath(BASE, method);

/** Sends the bytes to where the adapter said, with the method and headers it gave. No PathScribe token goes with them. */
export async function transferToDestination(destination: UploadDestination, file: Blob, send: typeof fetch = (...a) => fetch(...a)): Promise<ServiceResult<void>> {
  if (Date.parse(destination.expiresAt) < Date.now()) return { ok: false, error: 'expired' };
  try {
    const res = await send(destination.uploadUrl, { method: destination.method, headers: destination.headers, body: file });
    if (res.ok) return { ok: true, data: undefined };
    return { ok: false, error: res.status === 413 ? 'tooLarge' : res.status === 403 ? 'expired' : 'refused' };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

export function createHttpAttachmentStorageService(client: ApiHttpClient): IAttachmentStorageService {
  const routes = buildHttpService<Omit<IAttachmentStorageService, 'transfer'>>(client, {
    requestDestination: result('POST', () => route('requestDestination'), { body: (req: P<'requestDestination', 0>) => req }),
    completeUpload: result('POST', () => route('completeUpload'), { body: (ticketId: P<'completeUpload', 0>) => ({ ticketId }) }),
    getReadLink: result('POST', () => route('getReadLink'), { body: (pointer: P<'getReadLink', 0>, purpose: P<'getReadLink', 1>) => ({ pointer, purpose }) }),
  });
  return { ...routes, transfer: (destination, file) => transferToDestination(destination, file) };
}
