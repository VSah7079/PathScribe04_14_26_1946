// src/services/terminologySearch/nlmLookupRoute.test.ts
// Batch 617 (PS-488): ICD-10-CM, ICD-11 and LOINC look-ups go to the API server's same-origin route when an
// API address is configured, and straight to NLM only in the demonstration.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { nlmLookupUrl, nlmViaServer, NLM_PROXY_BASE } from './nlmLookupRoute';
import { searchCodes } from './codeSearchService';
import { setAccessTokenSource } from '../auth/accessTokenSource';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); setAccessTokenSource(async () => null); });

const NLM_REPLY = [1, ['C50.911'], null, [['C50.911', 'Malignant neoplasm of unspecified site of right female breast']]];
function fakeFetch() {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => NLM_REPLY }) as unknown as Response);
}

describe('where the NLM look-ups are sent', () => {
  it('the demonstration (no API address) calls NLM directly', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect(nlmViaServer()).toBe(false);
    expect(nlmLookupUrl('icd10')).toBe('https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search');
    expect(nlmLookupUrl('icd11')).toContain('/icd11_codes/v3/search');
    expect(nlmLookupUrl('loinc')).toContain('/loinc_items/v3/search');
  });

  it('with an API address every look-up goes to a same-origin /api/terminology/nlm route', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.hospital.example');
    expect(nlmViaServer()).toBe(true);
    expect(nlmLookupUrl('icd10')).toBe(`${NLM_PROXY_BASE}/search-icd10`);
    expect(nlmLookupUrl('icd11')).toBe(`${NLM_PROXY_BASE}/search-icd11`);
    expect(nlmLookupUrl('loinc')).toBe(`${NLM_PROXY_BASE}/search-loinc`);
    for (const k of ['icd10', 'icd11', 'loinc'] as const) expect(nlmLookupUrl(k).startsWith('/')).toBe(true);
  });
});

describe('a look-up in a server deployment (fake fetch)', () => {
  it('ICD-10 sends the same query to the server route with the user\'s token and reads the NLM-shaped reply', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.hospital.example');
    setAccessTokenSource(async () => 'tok-1');
    const f = fakeFetch(); vi.stubGlobal('fetch', f);
    const out = await searchCodes('ICD10', 'breast', 'all', 5);
    expect(out).toEqual([{ code: 'C50.911', display: 'Malignant neoplasm of unspecified site of right female breast', system: 'ICD10' }]);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.startsWith('/api/terminology/nlm/search-icd10?')).toBe(true);
    expect(url).toContain('terms=breast');
    expect(url).toContain('maxList=5');
    expect(url).not.toContain('nih.gov');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
  });

  it('LOINC and ICD-11 use their own routes, and no call names an NLM host', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.hospital.example');
    const f = fakeFetch(); vi.stubGlobal('fetch', f);
    await searchCodes('LOINC', 'ki-67');
    await searchCodes('ICD11', 'breast');
    const urls = f.mock.calls.map(c => String((c as unknown[])[0]));
    expect(urls[0].startsWith('/api/terminology/nlm/search-loinc?')).toBe(true);
    expect(urls[1].startsWith('/api/terminology/nlm/search-icd11?')).toBe(true);
    expect(urls.some(u => /nih\.gov|who\.int/.test(u))).toBe(false);
  });

  it('a rate limit or an invalid key from the server shows as "search unavailable", never as "no matches"', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.hospital.example');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, json: async () => ({ code: 'TOO_MANY_REQUESTS' }) }) as unknown as Response));
    await expect(searchCodes('ICD10', 'breast')).rejects.toThrow(/unavailable/i);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, json: async () => ({ code: 'UPSTREAM_KEY_INVALID' }) }) as unknown as Response));
    await expect(searchCodes('LOINC', 'ki-67')).rejects.toThrow(/unavailable/i);
  });

  it('the demonstration sends no Authorization header', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    setAccessTokenSource(async () => 'tok-1');
    const f = fakeFetch(); vi.stubGlobal('fetch', f);
    await searchCodes('ICD10', 'breast');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.startsWith('https://clinicaltables.nlm.nih.gov/')).toBe(true);
    expect(init.headers).toBeUndefined();
  });
});
