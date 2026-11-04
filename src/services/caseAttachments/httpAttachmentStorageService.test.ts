// Batch 742: the API server's storage adapter calls (docs/architecture/CASE_ATTACHMENTS_API.md).
import { describe, expect, it, vi } from 'vitest';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';
import { createHttpAttachmentStorageService, transferToDestination } from './httpAttachmentStorageService';
import type { UploadDestination } from './IAttachmentStorageService';

const REQ = { caseId: 'C1', facilityId: 'F1', fileName: 'Brennick.pdf', contentType: 'application/pdf' as const, byteLength: 10, sha256: 'ab' };
const POINTER = { kind: 'objectKey' as const, storageId: 's3-site-a', objectKey: 't/2026/10/x' };
const CASES: CallCase[] = [
  ['requestDestination', [REQ], 'POST', '/api/case-attachments/attachment-storage/request-destination', REQ],
  ['completeUpload', ['tkt-1'], 'POST', '/api/case-attachments/attachment-storage/complete-upload', { ticketId: 'tkt-1' }],
  ['getReadLink', [POINTER, 'render'], 'POST', '/api/case-attachments/attachment-storage/get-read-link', { pointer: POINTER, purpose: 'render' }],
];
const dest = (over: Partial<UploadDestination> = {}): UploadDestination => ({
  ticketId: 't', mode: 'direct', method: 'PUT', uploadUrl: 'https://bucket.hospital.org/up?sig=1', headers: { 'Content-Type': 'application/pdf' },
  expiresAt: new Date(Date.now() + 60_000).toISOString(), ...over,
});

describe('createHttpAttachmentStorageService', () => {
  it('calls the three adapter routes; the file name travels in the body, never the URL', async () => {
    const { client, fetch } = fakeApi(200, {});
    const service = createHttpAttachmentStorageService(client);
    await expectCalls(service, fetch, CASES);
    expectEveryMethod({ ...service, transfer: undefined }, CASES);
    expect(fetch.mock.calls.every(c => !String(c[0]).includes('Brennick'))).toBe(true);
  });

  it('sends the bytes straight to the destination with its method and headers, and no PathScribe token', async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const body = new Blob(['%PDF']);
    expect(await transferToDestination(dest(), body, send)).toEqual({ ok: true, data: undefined });
    const [url, init] = send.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://bucket.hospital.org/up?sig=1');
    expect(init.method).toBe('PUT');
    expect(init.headers).toEqual({ 'Content-Type': 'application/pdf' });
    expect(init.body).toBe(body);
    const staged = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    await transferToDestination(dest({ mode: 'staged', method: 'POST', uploadUrl: 'https://adapter.hospital.org/stage/abc' }), body, staged);
    expect((staged.mock.calls[0] as [string, RequestInit])[1].method).toBe('POST');
  });

  it('turns failures into fixed codes', async () => {
    const at = (status: number) => vi.fn().mockResolvedValue(new Response(null, { status }));
    expect(await transferToDestination(dest(), new Blob(['x']), at(413))).toEqual({ ok: false, error: 'tooLarge' });
    expect(await transferToDestination(dest(), new Blob(['x']), at(403))).toEqual({ ok: false, error: 'expired' });
    expect(await transferToDestination(dest(), new Blob(['x']), at(422))).toEqual({ ok: false, error: 'refused' });
    expect(await transferToDestination(dest(), new Blob(['x']), vi.fn().mockRejectedValue(new Error('net')))).toEqual({ ok: false, error: 'unavailable' });
    const never = vi.fn();
    expect(await transferToDestination(dest({ expiresAt: '2000-01-01T00:00:00Z' }), new Blob(['x']), never)).toEqual({ ok: false, error: 'expired' });
    expect(never).not.toHaveBeenCalled();
  });
});
