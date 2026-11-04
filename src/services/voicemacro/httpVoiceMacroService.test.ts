import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpVoiceMacroService } from './httpVoiceMacroService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpVoiceMacroService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
const call = (f: ReturnType<typeof vi.fn>, i = 0) => ({ url: f.mock.calls[i][0] as string, init: f.mock.calls[i][1] as RequestInit });
type Any = Record<string, (...a: unknown[]) => Promise<unknown>>;

describe('createHttpVoiceMacroService', () => {
  it('getMacros: GET /api/voicemacro/voice-macro/get-macros', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, [{"id": "r1"}]));
    const r = await (svc(f) as unknown as Any).getMacros();
    expect(r).toEqual([{"id": "r1"}]);
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/voicemacro/voice-macro/get-macros');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('addMacro: POST /api/voicemacro/voice-macro/add-macro', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "v1"}));
    const r = await (svc(f) as unknown as Any).addMacro({"phrase": "p"});
    expect(r).toEqual("v1");
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/voicemacro/voice-macro/add-macro');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"phrase": "p"});
  });
  it('updateMacro: POST /api/voicemacro/voice-macro/update-macro', async () => {
    const f = vi.fn().mockResolvedValue(reply(204, undefined));
    const r = await (svc(f) as unknown as Any).updateMacro("a b", {"phrase": "q"});
    expect(r).toBeUndefined();
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/voicemacro/voice-macro/update-macro');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b", "updates": {"phrase": "q"}});
  });
  it('deleteMacro: POST /api/voicemacro/voice-macro/delete-macro', async () => {
    const f = vi.fn().mockResolvedValue(reply(204, undefined));
    const r = await (svc(f) as unknown as Any).deleteMacro("a b");
    expect(r).toBeUndefined();
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/voicemacro/voice-macro/delete-macro');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b"});
  });
  it('bulkImport: POST /api/voicemacro/voice-macro/bulk-import', async () => {
    const f = vi.fn().mockResolvedValue(reply(204, undefined));
    const r = await (svc(f) as unknown as Any).bulkImport([{"phrase": "a"}]);
    expect(r).toBeUndefined();
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/voicemacro/voice-macro/bulk-import');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"macros": [{"phrase": "a"}]});
  });
  it('getMacrosForCurrentUser: GET /api/voicemacro/voice-macro/get-macros-for-current-user', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, [{"id": "r1"}]));
    const r = await (svc(f) as unknown as Any).getMacrosForCurrentUser();
    expect(r).toEqual([{"id": "r1"}]);
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/voicemacro/voice-macro/get-macros-for-current-user');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('addPersonalMacro: POST /api/voicemacro/voice-macro/add-personal-macro', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "v2"}));
    const r = await (svc(f) as unknown as Any).addPersonalMacro({"phrase": "p"});
    expect(r).toEqual("v2");
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/voicemacro/voice-macro/add-personal-macro');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"phrase": "p"});
  });
  it('importPersonalMacros: POST /api/voicemacro/voice-macro/import-personal-macros', async () => {
    const f = vi.fn().mockResolvedValue(reply(204, undefined));
    const r = await (svc(f) as unknown as Any).importPersonalMacros([{"phrase": "a"}]);
    expect(r).toBeUndefined();
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/voicemacro/voice-macro/import-personal-macros');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"macros": [{"phrase": "a"}]});
  });
  it('a refusal or a missing item becomes the fixed answer for every method, never the server\'s text', async () => {
    const all: Array<[string, unknown[], string]> = [
      ["getMacros", [], "list"],
      ["addMacro", [{"phrase": "p"}], "value"],
      ["updateMacro", ["a b", {"phrase": "q"}], "done"],
      ["deleteMacro", ["a b"], "done"],
      ["bulkImport", [[{"phrase": "a"}]], "done"],
      ["getMacrosForCurrentUser", [], "list"],
      ["addPersonalMacro", [{"phrase": "p"}], "value"],
      ["importPersonalMacros", [[{"phrase": "a"}]], "done"],
    ];
    for (const [name, args, kind] of all) {
      const f = vi.fn().mockResolvedValue(reply(403, { message: 'Patient Jane Doe' }));
      const run = (svc(f) as unknown as Any)[name](...args);
      if (kind === 'result') expect(await run).toEqual({ ok: false, error: 'NOT_PERMITTED' });
      else if (kind === 'list') expect(await run).toEqual([]);
      else if (kind === 'done') await expect(run).rejects.toMatchObject({ code: 'NOT_PERMITTED' });
      else await run;
      const g = vi.fn().mockResolvedValue(reply(404, {}));
      const miss = (svc(g) as unknown as Any)[name](...args);
      if (kind === 'result') expect(await miss).toEqual({ ok: false, error: 'NOT_FOUND' });
      else if (kind === 'list') expect(await miss).toEqual([]);
      else if (kind === 'done') await expect(miss).rejects.toMatchObject({ code: 'NOT_FOUND' });
      else await miss;
    }
  });
});
