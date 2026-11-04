// src/services/digitalPathology/httpSlidePreviewService.test.ts — Batch 750: the server version of the slide preview service.
import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpSlidePreviewService } from './httpSlidePreviewService';
import { mockSlidePreviewService } from './mockSlidePreviewService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });

describe('createHttpSlidePreviewService (server version)', () => {
  it('getForSlide posts the slide identifier in the body, never the address', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, { id: 'p1' }));
    const svc = createHttpSlidePreviewService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
    const r = await svc.getForSlide('S26-5404-B1-L1');
    expect(r.ok).toBe(true);
    expect(f.mock.calls[0][0]).toBe('https://api.test/api/digital-pathology/slide-previews/get-for-slide');
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ slideDisplayId: 'S26-5404-B1-L1' });
  });
});

describe('mockSlidePreviewService', () => {
  it('has no seeded preview (the demo uses the thumbnail address)', async () => {
    expect(await mockSlidePreviewService.getForSlide('S26-5404-B1-L1')).toEqual({ ok: true, data: null });
  });
});
