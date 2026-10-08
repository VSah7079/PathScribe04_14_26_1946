// PS-147 (Batch 442): the trend service — checked, audited, never a CAPA by itself.
import { describe, it, expect } from 'vitest';
import { createQaTrendService } from './qaTrendService';
import { DEFAULT_QA_TREND_POLICY_SETTINGS, type TrendRecord } from './qaTrendRules';
import type { QaTrendRecommendation } from '@/types/quality/QaTrend';

function setup(allowed: Record<string, boolean> = { 'qa:pathologist-trend:view': true, 'qa:pathologist-trend:decide': true }) {
  let store: QaTrendRecommendation[] = [];
  const audits: string[] = [];
  const now = new Date('2026-10-02T12:00:00Z');
  const records: TrendRecord[] = Array.from({ length: 20 }, (_, i) => ({
    record: { id: `r${i}`, outcome: i < 3 ? 'discordant' : 'concordant', severity: i < 3 ? 'high' : undefined, recordedAt: '2026-09-20T00:00:00Z', reviewedPathologist: { userId: 'P1', userName: 'Dr One' } },
  }));
  let n = 0;
  const svc = createQaTrendService({
    load: () => store, persist: all => { store = all; },
    trendRecords: async () => records, policy: async () => DEFAULT_QA_TREND_POLICY_SETTINGS,
    enforce: async c => ({ allowed: !!allowed[c] }),
    audit: async e => { audits.push(`${e.event}: ${e.detail}`); },
    actor: () => ({ userId: 'LD', userName: 'Lab Director' }),
    now: () => now, newId: () => `t${++n}`,
  });
  return { svc, audits, store: () => store };
}

describe('qaTrendService', () => {
  it('without the view capability nothing is listed or evaluated', async () => {
    const { svc, store } = setup({});
    expect(await svc.list()).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await svc.evaluate()).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(store()).toEqual([]);
  });
  it('evaluating adds one recommendation for a crossed pattern, audited; evaluating again adds none', async () => {
    const { svc, audits, store } = setup();
    const first = await svc.evaluate();
    expect(first.ok && first.data.added.map(r => [r.subjectName, r.majorCount, r.totalReviewed, r.status])).toEqual([['Dr One', 3, 20, 'recommended']]);
    expect(audits[0]).toMatch(/^QA_TREND_RECOMMENDED: Discordance pattern \(pathologist\): Dr One, 3 major of 20 reviewed \(15%\)/);
    await svc.evaluate();
    expect(store()).toHaveLength(1);
  });
  it('deciding needs its own capability; a review, then a CAPA with a note; audited', async () => {
    const viewOnly = setup({ 'qa:pathologist-trend:view': true });
    await viewOnly.svc.evaluate();
    expect(await viewOnly.svc.decide('t1', { kind: 'start-review' })).toEqual({ ok: false, error: 'NOT_PERMITTED' });

    const { svc, audits } = setup();
    await svc.evaluate();
    expect((await svc.decide('t1', { kind: 'open-capa', note: 'x' }))).toEqual({ ok: false, error: 'notUnderReview' });
    expect((await svc.decide('t1', { kind: 'start-review' })).ok).toBe(true);
    const done = await svc.decide('t1', { kind: 'open-capa', note: 'Focused professional practice evaluation agreed' });
    expect(done.ok && done.data.status).toBe('capa-opened');
    expect(audits[audits.length - 1]).toBe('QA_TREND_DECIDED: Discordance pattern (pathologist) for Dr One: capa-opened — Focused professional practice evaluation agreed.');
    expect(await svc.decide('nope', { kind: 'start-review' })).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
