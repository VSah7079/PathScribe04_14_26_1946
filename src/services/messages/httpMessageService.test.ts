import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpMessageService } from './httpMessageService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const svc = (f: ReturnType<typeof vi.fn>) =>
  createHttpMessageService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));
const call = (f: ReturnType<typeof vi.fn>, i = 0) => ({ url: f.mock.calls[i][0] as string, init: f.mock.calls[i][1] as RequestInit });
type Any = Record<string, (...a: unknown[]) => Promise<unknown>>;

describe('createHttpMessageService', () => {
  it('listRecipients: GET /api/messages/message/list-recipients', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).listRecipients();
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/messages/message/list-recipients');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('sendSecureEmail: POST /api/messages/message/send-secure-email', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).sendSecureEmail({"to": "a@b.c"});
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/messages/message/send-secure-email');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"to": "a@b.c"});
  });
  it('getInbox: GET /api/messages/message/get-inbox?userId=u%201', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getInbox("u 1");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/messages/message/get-inbox?userId=u%201');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('getById: GET /api/messages/message/get-by-id?id=a%20b', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).getById("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/messages/message/get-by-id?id=a%20b');
    expect(init.method).toBe('GET');
    expect(JSON.parse(String(init.body ?? '{}'))).toEqual({});
  });
  it('send: POST /api/messages/message/send', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).send({"text": "t"}, {"composedByPerson": true});
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/messages/message/send');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"message": {"text": "t"}, "options": {"composedByPerson": true}});
  });
  it('reply: POST /api/messages/message/reply', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).reply("a b", "u1", "Dr A", "ok", undefined);
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/messages/message/reply');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"messageId": "a b", "senderId": "u1", "senderName": "Dr A", "text": "ok"});
  });
  it('markRead: POST /api/messages/message/mark-read', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).markRead("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/messages/message/mark-read');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b"});
  });
  it('markAllRead: POST /api/messages/message/mark-all-read', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).markAllRead("u 1");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/messages/message/mark-all-read');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"userId": "u 1"});
  });
  it('softDelete: POST /api/messages/message/soft-delete', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).softDelete("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/messages/message/soft-delete');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b"});
  });
  it('restore: POST /api/messages/message/restore', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).restore("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/messages/message/restore');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b"});
  });
  it('permanentDelete: POST /api/messages/message/permanent-delete', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).permanentDelete("a b");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/messages/message/permanent-delete');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"id": "a b"});
  });
  it('emptyDeleted: POST /api/messages/message/empty-deleted', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, {"id": "r1"}));
    const r = await (svc(f) as unknown as Any).emptyDeleted("u 1");
    expect(r).toEqual({ ok: true, data: {"id": "r1"} });
    const { url, init } = call(f);
    expect(url).toBe('https://api.test/api/messages/message/empty-deleted');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({"userId": "u 1"});
  });
  it('a refusal or a missing item becomes the fixed answer for every method, never the server\'s text', async () => {
    const all: Array<[string, unknown[], string]> = [
      ["listRecipients", [], "result"],
      ["sendSecureEmail", [{"to": "a@b.c"}], "result"],
      ["getInbox", ["u 1"], "result"],
      ["getById", ["a b"], "result"],
      ["send", [{"text": "t"}, {"composedByPerson": true}], "result"],
      ["reply", ["a b", "u1", "Dr A", "ok", undefined], "result"],
      ["markRead", ["a b"], "result"],
      ["markAllRead", ["u 1"], "result"],
      ["softDelete", ["a b"], "result"],
      ["restore", ["a b"], "result"],
      ["permanentDelete", ["a b"], "result"],
      ["emptyDeleted", ["u 1"], "result"],
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
