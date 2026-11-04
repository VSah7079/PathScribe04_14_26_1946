// Batch 621: stored extractions and "flag as wrong": one per case, capability checks, accuracy counts.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const auth = vi.hoisted(() => ({ denied: new Set<string>(), asked: [] as string[] }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (cap: string) => { auth.asked.push(cap); return { allowed: !auth.denied.has(cap) }; },
    evaluate: async () => ({ allowed: true }),
    grantedCapabilities: async () => new Set<string>(),
  },
}));
import { mockHistoryExtractionService as svc } from './mockHistoryExtractionService';
import type { HistoryExtraction } from './historyExtraction';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; },
  };
  auth.denied = new Set();
  auth.asked = [];
});

const x = (over: Partial<HistoryExtraction> = {}): HistoryExtraction =>
  ({ sourceCaseId: 'S26-1', sourceTextHash: 'h1', status: 'extracted', fields: [{ fieldId: 'g', label: 'G', value: '2', display: '2' }], extractedAt: 't', verification: 'ai-unverified', ...over });
const flag = { sourceCaseId: 'S26-1', fieldId: 'g', templateId: 'breast', sourceTextHash: 'h1', flaggedBy: 'Dr A' };

describe('history extractions (mock)', () => {
  it('stores one extraction per case, replacing the earlier one, and needs ai:history-extraction:run', async () => {
    expect((await svc.getForCase('S26-1'))).toEqual({ ok: true, data: null });
    await svc.save(x());
    await svc.save(x({ sourceTextHash: 'h2' }));
    await svc.save(x({ sourceCaseId: 'S26-2' }));
    const r = await svc.getForCase('S26-1');
    expect(r.ok && r.data?.sourceTextHash).toBe('h2');
    expect(auth.asked).toContain('ai:history-extraction:run');
  });
  it('saves nothing without the run capability', async () => {
    auth.denied.add('ai:history-extraction:run');
    expect((await svc.save(x())).ok).toBe(false);
    auth.denied.clear();
    expect(await svc.getForCase('S26-1')).toEqual({ ok: true, data: null });
  });
  it('records a flag (needs ai:history-extraction:flag), once per user, field and text', async () => {
    const a = await svc.flagAsWrong(flag);
    const b = await svc.flagAsWrong(flag);
    expect(a.ok && b.ok && a.data.id === b.data.id).toBe(true);
    await svc.flagAsWrong({ ...flag, fieldId: null });
    const all = await svc.getFlags('S26-1');
    expect(all.ok && all.data.map(f => f.fieldId)).toEqual(['g', null]);
    expect(auth.asked).toContain('ai:history-extraction:flag');
    expect((await svc.getFlags('S26-9'))).toEqual({ ok: true, data: [] });
  });
  it('flagging without the capability records nothing', async () => {
    auth.denied.add('ai:history-extraction:flag');
    expect((await svc.flagAsWrong(flag)).ok).toBe(false);
    expect(await svc.getFlags()).toEqual({ ok: true, data: [] });
  });
  it('counts extractions, fields and flags for accuracy', async () => {
    await svc.save(x());
    await svc.save(x({ sourceCaseId: 'S26-2', status: 'failed', failure: 'aiError', fields: [] }));
    await svc.flagAsWrong(flag);
    expect(await svc.getAccuracy()).toEqual({ ok: true, data: { extractions: 1, fieldsExtracted: 1, flagged: 1 } });
  });
});
