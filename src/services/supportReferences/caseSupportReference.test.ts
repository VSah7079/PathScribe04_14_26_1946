// src/services/supportReferences/caseSupportReference.test.ts — Batch 573.
import { describe, it, expect, vi } from 'vitest';
import { createCaseSupportReferenceLookup } from './caseSupportReference';

const ok = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

describe("a case's support reference", () => {
  it('with the API server: asked of the server once per case, with the token; the demo stand-in unused', async () => {
    const fetch = vi.fn(async () => ok({ ref: 'sr-7k2q-9mxd' }));
    const fallback = vi.fn(async () => 'SR-LOCA-L000');
    const lookup = createCaseSupportReferenceLookup({ baseUrl: 'https://api.lab.org/', fetch, accessToken: async () => 'tok', fallback });
    expect(await lookup('S26/4408')).toBe('SR-7K2Q-9MXD');
    expect(await lookup('S26/4408')).toBe('SR-7K2Q-9MXD');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('https://api.lab.org/api/cases/S26%2F4408/support-reference', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }));
    expect(fallback).not.toHaveBeenCalled();
  });

  it('refused or unreadable: none, and asked again next time', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(ok({}, 404)).mockResolvedValueOnce(ok({ ref: 'not a ref' })).mockResolvedValueOnce(ok({ ref: 'SR-7K2Q-9MXD' }));
    const lookup = createCaseSupportReferenceLookup({ baseUrl: 'https://api.lab.org', fetch, accessToken: async () => null, fallback: async () => null });
    expect(await lookup('c1')).toBeNull();
    await Promise.resolve();
    expect(await lookup('c1')).toBeNull();
    await Promise.resolve();
    expect(await lookup('c1')).toBe('SR-7K2Q-9MXD');
  });

  it("with no API server (the demo): the browser's own reference service", async () => {
    const lookup = createCaseSupportReferenceLookup({ baseUrl: null, fetch: vi.fn(), accessToken: async () => null, fallback: async id => (id === 'c1' ? 'SR-7K2Q-9MXD' : null) });
    expect(await lookup('c1')).toBe('SR-7K2Q-9MXD');
  });
});
