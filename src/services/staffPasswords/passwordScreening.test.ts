// Batch 456 (Pete: "a common/breached-password block"): the password screening.
import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'crypto';
import {
  isCommonPassword, isPredictablePassword, containsContextWord, localScreeningProblem, rangeHasSuffix,
  createPwnedPasswordCheck, screenPassword, defaultPasswordScreeningDeps, PWNED_RANGE_URL,
} from './passwordScreening';

const COMMON = new Set(['password', 'iloveyou', 'qwertyuiop123']);

describe('the local checks', () => {
  it('a common password, any case, or one with digits and symbols on its ends', () => {
    expect(isCommonPassword('QwertyUIOP123', COMMON)).toBe(true);
    expect(isCommonPassword('iloveyou2026!!', COMMON)).toBe(true);
    expect(isCommonPassword('!!Password!!', COMMON)).toBe(true);
    expect(isCommonPassword('iloveyou and my dog', COMMON)).toBe(false);
  });
  it('a repeated short pattern or a straight run of characters', () => {
    for (const p of ['aaaaaaaaaaaa', 'abababababab', 'abcdabcdabcd', '123456789012', 'abcdefghijklm', '987654321098', 'zyxwvutsrqpo']) expect(isPredictablePassword(p), p).toBe(true);
    for (const p of ['correct horse battery', 'abcdefghijkx', 'blue kettle 42 maple']) expect(isPredictablePassword(p), p).toBe(false);
  });
  it('the service names and the person\'s email, or its name part of 4 characters or more', () => {
    expect(containsContextWord('My PathScribe 2026', {})).toBe(true);
    expect(containsContextWord('formedrix rules ok', {})).toBe(true);
    expect(containsContextWord('grace.liu forever', { email: 'Grace.Liu@demo.pathscribe.ai' })).toBe(true);
    expect(containsContextWord('jo is here today ok', { email: 'jo@lab.org' })).toBe(false);
    expect(containsContextWord('correct horse battery', { email: 'sam@lab.org' })).toBe(false);
  });
  it('checks in a fixed order: pattern, then context, then the list', () => {
    expect(localScreeningProblem('aaaaaaaaaaaa', {}, new Set(['aaaaaaaaaaaa']))).toBe('predictable');
    expect(localScreeningProblem('pathscribe!!', {}, new Set(['pathscribe']))).toBe('contextWord');
    expect(localScreeningProblem('correct horse battery', {}, COMMON)).toBeNull();
  });
  it('the bundled list loads, holds only lower-case entries, and catches well-known ones', async () => {
    const list = await defaultPasswordScreeningDeps.loadCommon();
    expect(list.size).toBeGreaterThan(9000);
    expect([...list].every(p => p === p.toLowerCase() && p.length >= 8)).toBe(true);
    for (const p of ['Password1234', 'qwertyuiop123', 'iloveyou12345']) expect(isCommonPassword(p, list), p).toBe(true);
    expect(isCommonPassword('correct horse battery', list)).toBe(false);
  });
  it('the breach check is off in tests (vitest.config.ts)', () => {
    expect(defaultPasswordScreeningDeps.breached).toBeNull();
  });
});

describe('Pwned Passwords range search', () => {
  const sha1 = (p: string) => createHash('sha1').update(p).digest('hex').toUpperCase();
  const response = (body: string, ok = true) => ({ ok, text: async () => body }) as Response;

  it('sends only the first 5 hash characters, with padding, and reads a real match', async () => {
    const pw = 'leaked passphrase';
    const h = sha1(pw);
    const fetch = vi.fn(async () => response(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${h.slice(5)}:42\r\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0`));
    expect(await createPwnedPasswordCheck({ fetch })(pw)).toBe('breached');
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${PWNED_RANGE_URL}${h.slice(0, 5)}`);
    expect(url).not.toContain(pw);
    expect(url).not.toContain(h.slice(5));
    expect((init.headers as Record<string, string>)['Add-Padding']).toBe('true');
  });
  it('a padding row (count 0) is not a match; no match is "clear"', async () => {
    const pw = 'not leaked at all';
    expect(rangeHasSuffix(`${sha1(pw).slice(5)}:0`, sha1(pw).slice(5))).toBe(false);
    expect(await createPwnedPasswordCheck({ fetch: async () => response('ABC:3') })(pw)).toBe('clear');
  });
  it('an error, a refusal or a timeout is "unavailable", never a block', async () => {
    expect(await createPwnedPasswordCheck({ fetch: async () => { throw new Error('offline'); } })('x')).toBe('unavailable');
    expect(await createPwnedPasswordCheck({ fetch: async () => response('', false) })('x')).toBe('unavailable');
    const hang = (_u: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_r, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    expect(await createPwnedPasswordCheck({ fetch: hang as typeof fetch, timeoutMs: 20 })('x')).toBe('unavailable');
  });
  it('the service is asked only when the local checks pass', async () => {
    const breached = vi.fn(async () => 'breached' as const);
    expect(await screenPassword('password12345', {}, { loadCommon: async () => COMMON, breached })).toEqual({ problem: 'common', breachCheck: 'off' });
    expect(breached).not.toHaveBeenCalled();
    expect(await screenPassword('correct horse battery', {}, { loadCommon: async () => COMMON, breached })).toEqual({ problem: 'breached', breachCheck: 'breached' });
    expect(await screenPassword('correct horse battery', {}, { loadCommon: async () => COMMON, breached: null })).toEqual({ problem: null, breachCheck: 'off' });
  });
});
