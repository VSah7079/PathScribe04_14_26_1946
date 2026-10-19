import { describe, expect, it, vi } from 'vitest';
import { createApiHttpClient } from '../apiServer/apiHttpClient';
import { createHttpIntraoperativeService } from './httpIntraoperativeService';

const reply = (status: number, body?: unknown): Response => new Response(body === undefined ? null : JSON.stringify(body), { status });
const make = (f: ReturnType<typeof vi.fn>) =>
  createHttpIntraoperativeService(createApiHttpClient({ baseUrl: 'https://api.test', fetch: f as unknown as typeof fetch, accessToken: async () => 't' }));

// verb, path and body for every method of the interface (the table in the contract doc).
const CALLS: Array<[string, unknown[], string, string, unknown]> = [
  ["lookupAdtRecord", ["a b"], "POST", "https://api.test/api/intraop/intraoperative/lookup-adt-record", {"mrn": "a b"}],
  ["getAll", [], "GET", "https://api.test/api/intraop/intraoperative/get-all", null],
  ["getPending", [], "GET", "https://api.test/api/intraop/intraoperative/get-pending", null],
  ["createSession", [{"k": 1}], "POST", "https://api.test/api/intraop/intraoperative/create-session", {"k": 1}],
  ["addSpecimen", ["a b", "a b"], "POST", "https://api.test/api/intraop/intraoperative/add-specimen", {"sessionId": "a b", "specimenLabel": "a b"}],
  ["findMatchesForNewCase", [{"k": 1}], "POST", "https://api.test/api/intraop/intraoperative/find-matches-for-new-case", {"k": 1}],
  ["getMatchCandidates", ["a b"], "GET", "https://api.test/api/intraop/intraoperative/get-match-candidates?entryId=a%20b", null],
  ["addMilestone", ["a b", "a b", "a b", "a b", "a b", "a b"], "POST", "https://api.test/api/intraop/intraoperative/add-milestone", {"sessionId": "a b", "specimenId": "a b", "milestone": "a b", "skipReason": "a b", "skipReasonNote": "a b", "quickGrossText": "a b"}],
  ["addDigitalAsset", ["a b", "a b", {"k": 1}], "POST", "https://api.test/api/intraop/intraoperative/add-digital-asset", {"sessionId": "a b", "specimenId": "a b", "asset": {"k": 1}}],
  ["setFrozenSectionDiagnosis", ["a b", "a b", "a b", "a b"], "POST", "https://api.test/api/intraop/intraoperative/set-frozen-section-diagnosis", {"sessionId": "a b", "specimenId": "a b", "diagnosis": "a b", "category": "a b"}],
  ["setSpecimenUrgency", ["a b", "a b", "a b"], "POST", "https://api.test/api/intraop/intraoperative/set-specimen-urgency", {"sessionId": "a b", "specimenId": "a b", "urgency": "a b"}],
  ["dismissFromBoard", ["a b", "a b", "a b", "a b", true], "POST", "https://api.test/api/intraop/intraoperative/dismiss-from-board", {"sessionId": "a b", "specimenId": "a b", "dismissedByUserId": "a b", "dismissedByUserName": "a b", "surgeonReadbackConfirmed": true}],
  ["addPreparationOutput", ["a b", "a b", "a b", "a b"], "POST", "https://api.test/api/intraop/intraoperative/add-preparation-output", {"sessionId": "a b", "specimenId": "a b", "type": "a b", "identifier": "a b"}],
  ["merge", ["a b", "a b", {"k": 1}], "POST", "https://api.test/api/intraop/intraoperative/merge", {"entryId": "a b", "caseId": "a b", "resolution": {"k": 1}}],
  ["recordVerbalReport", ["a b", {"k": 1}], "POST", "https://api.test/api/intraop/intraoperative/record-verbal-report", {"sessionId": "a b", "input": {"k": 1}}],
];

describe('createHttpIntraoperativeService' + ' (server version)', () => {
  it.each(CALLS)('%s: %s', async (name, args, verb, url, body) => {
    const f = vi.fn().mockResolvedValue(reply(200, { ok: 1 }));
    const r = await (make(f) as unknown as Record<string, (...a: unknown[]) => Promise<{ ok: boolean }>>)[name](...args);
    expect(r.ok).toBe(true);
    expect(f.mock.calls[0][0]).toBe(url);
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe(verb);
    if (body === null) expect([null, '{}']).toContain(init.body ?? null);
    else expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it('turns a refusal into a fixed code, never the server text', async () => {
    const f = vi.fn().mockResolvedValue(reply(403, { message: 'Smith, John 12345' }));
    const r = await (make(f) as unknown as Record<string, (...a: unknown[]) => Promise<{ ok: boolean; error?: string }>>)["lookupAdtRecord"](...["a b"]);
    expect(r).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(JSON.stringify(r)).not.toContain('Smith');
  });

  it('lookupAdtRecord gives null, not an error, when the server has none', async () => {
    const f = vi.fn().mockResolvedValue(reply(404, {}));
    const r = await (make(f) as unknown as Record<string, (...a: unknown[]) => Promise<{ ok: boolean; data?: unknown }>>)["lookupAdtRecord"](...["a b"]);
    expect(r).toEqual({ ok: true, data: null });
  });

  it('seedOrBoardDemoData is demo-only: no server call, a fixed code' + '', async () => {
    const f = vi.fn();
    const r = await (make(f) as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)["seedOrBoardDemoData"](...["a b", "a b", "a b"]);
    expect(r).toEqual({ ok: false, error: 'NOT_SUPPORTED' });
    expect(f).not.toHaveBeenCalled();
  });

  it('advanceDemoSpecimen is demo-only: no server call, a fixed code' + '', async () => {
    const f = vi.fn();
    const r = await (make(f) as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)["advanceDemoSpecimen"](...["a b", "a b"]);
    expect(r).toEqual({ ok: false, error: 'NOT_SUPPORTED' });
    expect(f).not.toHaveBeenCalled();
  });
});
