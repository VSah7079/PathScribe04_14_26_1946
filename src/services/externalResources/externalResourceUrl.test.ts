// Batch 652: External Resources accept https links only.
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const { checkExternalResourceUrl, isSecureResourceUrl, withSecureUrls, ExternalResourceUrlError, toQuickLinks } = await import('./externalResourceUrl');
const { mockExternalResourceService } = await import('./mockExternalResourceService');

const ORG = 'ORG-TEST';
const input = (url: string) => ({ title: 'Link', url, category: 'references' as const, scope: 'enterprise' as const, organisationId: ORG });

describe('checkExternalResourceUrl', () => {
  it('accepts https and returns the normal form', () => {
    expect(checkExternalResourceUrl(' https://www.cap.org/protocols ')).toEqual({ ok: true, url: 'https://www.cap.org/protocols' });
  });
  it('refuses http as insecure, in any letter case', () => {
    expect(checkExternalResourceUrl('http://intranet.local/lis')).toEqual({ ok: false, problem: 'insecure' });
    expect(checkExternalResourceUrl('HTTP://intranet.local')).toEqual({ ok: false, problem: 'insecure' });
  });
  it('refuses other schemes and text that is not a web address as invalid', () => {
    for (const bad of ['javascript:alert(1)', 'ftp://host/file', 'file:///etc/passwd', 'www.cap.org', '', 'https://']) {
      expect(checkExternalResourceUrl(bad), bad).toEqual({ ok: false, problem: 'invalid' });
    }
  });
  it('isSecureResourceUrl is true only for https', () => {
    expect(isSecureResourceUrl('https://a.example')).toBe(true);
    expect(isSecureResourceUrl('http://a.example')).toBe(false);
  });
});

describe('withSecureUrls on the service', () => {
  beforeEach(() => { store.clear(); });
  const service = () => withSecureUrls(mockExternalResourceService);

  it('create refuses an http link and stores nothing', async () => {
    await expect(service().create(input('http://example.com'))).rejects.toMatchObject({ name: 'ExternalResourceUrlError', problem: 'insecure' });
    expect(await mockExternalResourceService.listForOrganisation(ORG)).toHaveLength(0);
  });

  it('create accepts https', async () => {
    const r = await service().create(input('https://example.com'));
    expect(r.url).toBe('https://example.com');
  });

  it('update refuses changing a link to http but allows other changes without a link', async () => {
    const r = await service().create(input('https://example.com'));
    await expect(service().update(r.id, { url: 'http://example.com' })).rejects.toBeInstanceOf(ExternalResourceUrlError);
    const renamed = await service().update(r.id, { title: 'Renamed' });
    expect(renamed?.title).toBe('Renamed');
  });

  it('an http link saved earlier is kept, still listed, and flagged insecure for the Resources panel', async () => {
    const old = await mockExternalResourceService.create(input('http://legacy.example/lis'));
    const ok = await mockExternalResourceService.create(input('https://good.example'));
    expect((await service().listForOrganisation(ORG)).map(r => r.id).sort()).toEqual([old.id, ok.id].sort());
    const links = toQuickLinks(await service().resolveForViewer({ organisationId: ORG }));
    expect(links.references.find(l => l.url === old.url)?.insecure).toBe(true);
    expect(links.references.find(l => l.url === ok.url)?.insecure).toBe(false);
  });

  it('editing a legacy http link must change it to https', async () => {
    const old = await mockExternalResourceService.create(input('http://legacy.example'));
    await expect(service().update(old.id, { url: 'http://legacy.example/' })).rejects.toBeInstanceOf(ExternalResourceUrlError);
    expect((await service().update(old.id, { url: 'https://legacy.example' }))?.url).toBe('https://legacy.example');
  });
});
