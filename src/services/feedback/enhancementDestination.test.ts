// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { deliverToDestination, effectiveEnhancementUrl, destinationHost, enhancementDeliveryBody } from './enhancementDestination';
import { enhancementUrlProblem, feedbackSettingsProblem, feedbackSettingsChange, DEFAULT_FEEDBACK_SETTINGS as D } from './feedbackSettingsRules';
import { parseRuntimeConfig } from '../runtimeConfig/runtimeSettings';

const reply = (status: number, body?: unknown) => vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('which address is used', () => {
  it('the administrator\'s entry wins over the deployment\'s default; both must be https', () => {
    expect(effectiveEnhancementUrl('https://admin.test/a', 'https://default.test/b')).toBe('https://admin.test/a');
    expect(effectiveEnhancementUrl('', 'https://default.test/b')).toBe('https://default.test/b');
    expect(effectiveEnhancementUrl('http://admin.test/a', 'https://default.test/b')).toBe('https://default.test/b');
    expect(effectiveEnhancementUrl('', 'http://default.test/b')).toBe('');
    expect(effectiveEnhancementUrl('', undefined)).toBe('');
  });
  it('shows the host only', () => {
    expect(destinationHost('https://site.test/x?y=1')).toBe('site.test');
    expect(destinationHost('nonsense')).toBe('');
  });
  it('config.json can pre-seed it (an https address); the demo build accepts it too, and plain http is refused', () => {
    expect(parseRuntimeConfig({ VITE_ENHANCEMENT_REQUEST_URL: 'https://site.test/in' }, { demoBuild: true }).problems).toEqual([]);
    expect(parseRuntimeConfig({ VITE_ENHANCEMENT_REQUEST_URL: 'http://site.test/in' }, { demoBuild: true, isProduction: true }).problems).toEqual([{ key: 'VITE_ENHANCEMENT_REQUEST_URL', code: 'NOT_HTTPS' }]);
  });
});

describe('the setting', () => {
  it.each(['http://x.test/a', 'https://user:pw@x.test/', 'https://x.test/#frag', 'not a url', 'https://localhost/a'])('refuses %s', u => {
    expect(enhancementUrlProblem(u)).toBe('invalidEnhancementUrl');
  });
  it('accepts an https address with a path and a query, and an empty one', () => {
    expect(enhancementUrlProblem('https://x.test/requests?form=7')).toBeNull();
    expect(enhancementUrlProblem('')).toBeNull();
  });
  it('saving checks it and the validation recipients; the audit text names them', () => {
    const ok = { ...D, qaRecipients: ['qa@x.org'] };
    expect(feedbackSettingsProblem({ ...ok, enhancementUrl: 'http://x.test' }, 'validation')).toBe('invalidEnhancementUrl');
    expect(feedbackSettingsProblem({ ...ok, validationRecipients: ['nope'] }, 'validation')).toBe('invalidValidationRecipient');
    expect(feedbackSettingsChange(ok, { ...ok, validationRecipients: ['v@x.org'], enhancementUrl: 'https://x.test/in' }))
      .toBe('Feedback settings changed. Validation recipients: (none) → v@x.org; Enhancement request destination: (deployment default) → https://x.test/in.');
  });
  it('old stored settings without the new fields still read as empty', () => {
    expect(D.validationRecipients).toEqual([]);
    expect(D.enhancementUrl).toBe('');
  });
});

describe('delivery', () => {
  it('POSTs JSON to the address (path and query kept) with NO Authorization header', async () => {
    const fetchMock = reply(204);
    const r = await deliverToDestination('https://site.test/requests?form=7', { title: 't' }, { fetch: fetchMock as never });
    expect(r).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://site.test/requests?form=7');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ title: 't' });
    expect(Object.keys(init.headers as object).map(h => h.toLowerCase())).not.toContain('authorization');
  });
  it('keeps a ticket link only if it is https', async () => {
    expect(await deliverToDestination('https://site.test/in', {}, { fetch: reply(200, { ticketUrl: 'https://site.test/t/1' }) as never })).toEqual({ ok: true, ticketUrl: 'https://site.test/t/1' });
    expect(await deliverToDestination('https://site.test/in', {}, { fetch: reply(200, { ticketUrl: 'javascript:alert(1)' }) as never })).toEqual({ ok: true });
  });
  it('a server refusal, a network failure and a bad address are all just "not delivered"', async () => {
    expect(await deliverToDestination('https://site.test/in', {}, { fetch: reply(500, { message: 'secret stack trace' }) as never })).toEqual({ ok: false });
    expect(await deliverToDestination('https://site.test/in', {}, { fetch: (async () => { throw new TypeError('Failed to fetch'); }) as never })).toEqual({ ok: false });
    const f = reply(204);
    expect(await deliverToDestination('http://site.test/in', {}, { fetch: f as never })).toEqual({ ok: false });
    expect(f).not.toHaveBeenCalled();
  });
  it('the body leaves out the user id and files, and carries the screenshot only when there is one', () => {
    const p = { title: 't', description: 'd', category: 'UI' as const, attachments: [new File(['x'], 'a.png')], includeSystem: true,
      metadata: { userId: 'PATH-001', userName: 'P', userRole: 'r', timestamp: '', appVersion: '1', browser: 'b', os: 'o', currentPage: '/x' } };
    const body = enhancementDeliveryBody(p, '2026-10-28T00:00:00Z');
    expect(JSON.stringify(body)).not.toContain('PATH-001');
    expect(body).not.toHaveProperty('attachments');
    expect(body).not.toHaveProperty('screenshotDataUrl');
    expect(enhancementDeliveryBody({ ...p, screenshotDataUrl: 'data:image/jpeg;base64,AA==' }, '')).toHaveProperty('screenshotDataUrl');
  });
});
