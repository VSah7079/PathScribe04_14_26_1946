// src/services/deficiencies/qaDeficiencyActions.test.ts
// Batch 649: the Quality Assurance deficiency actions each need their capability.
import { describe, expect, it, vi } from 'vitest';
import { containQaDeficiency, escalateQaDeficiency, raiseQaDeficiency, verifyQaDeficiency, type QaDeficiencyDeps } from './qaDeficiencyActions';

const deps = (allowed: boolean) => ({
  enforce: vi.fn(async (_capability: string) => ({ allowed })),
  deficiencies: { raise: vi.fn(async () => ({ ok: true }) as never), resolve: vi.fn(async () => ({ ok: true }) as never), containImmediately: vi.fn(async () => ({ ok: true }) as never), verifyEffectiveness: vi.fn(async () => ({ ok: true }) as never) },
  post: vi.fn(async () => undefined),
}) satisfies QaDeficiencyDeps;

const escalation = { resolutionTypeId: 'r', correctiveAction: 'ca', rootCause: 'rc', preventiveAction: '', resolvedBy: 'U1', verificationDueDate: '2026-11-01' };

describe('qaDeficiencyActions (Batch 649)', () => {
  it('each action checks its own capability, then acts', async () => {
    const d = deps(true);
    await raiseQaDeficiency({ caseId: 'C1', deficiencyTypeId: 't', comment: 'c', raisedBy: 'U1' }, d);
    await escalateQaDeficiency('D1', escalation, false, d);
    await containQaDeficiency('D1', { resolutionTypeId: 'r', resolutionComment: 'done', resolvedBy: 'U1' }, false, d);
    await verifyQaDeficiency('D1', { outcome: 'effective', comment: '', verifiedBy: 'U1' }, false, d);
    expect(d.enforce.mock.calls.map(c => c[0])).toEqual(['qa:deficiency:raise', 'qa:deficiency:escalate', 'qa:deficiency:contain', 'qa:deficiency:verify']);
    expect(d.deficiencies.raise).toHaveBeenCalled();
    expect(d.deficiencies.resolve).toHaveBeenCalledWith('D1', { ...escalation, preventiveAction: undefined });
    expect(d.deficiencies.containImmediately).toHaveBeenCalled();
    expect(d.deficiencies.verifyEffectiveness).toHaveBeenCalled();
  });

  it('an Engine-raised deficiency goes to its endpoint', async () => {
    const d = deps(true);
    await verifyQaDeficiency('D9', { outcome: 'recurred', comment: 'x', verifiedBy: 'U1' }, true, d);
    expect(d.post).toHaveBeenCalledWith('/api/qa/deficiencies/verify', { deficiencyId: 'D9', outcome: 'recurred', comment: 'x', verifiedBy: 'U1' });
    expect(d.deficiencies.verifyEffectiveness).not.toHaveBeenCalled();
  });

  it('refused: nothing changes, and the reason comes back', async () => {
    const d = deps(false);
    const outcomes = [
      await raiseQaDeficiency({ caseId: 'C1', deficiencyTypeId: 't', comment: 'c', raisedBy: 'U1' }, d),
      await escalateQaDeficiency('D1', escalation, true, d),
      await containQaDeficiency('D1', { resolutionTypeId: 'r', resolutionComment: 'done', resolvedBy: 'U1' }, false, d),
      await verifyQaDeficiency('D1', { outcome: 'effective', comment: '', verifiedBy: 'U1' }, false, d),
    ];
    for (const o of outcomes) expect(o).toMatchObject({ ok: false, error: 'notPermitted' });
    expect(d.post).not.toHaveBeenCalled();
    expect(Object.values(d.deficiencies).every(f => f.mock.calls.length === 0)).toBe(true);
  });
});

// Batch 651: successes are audited (ids and outcome only); refusals and failed changes write nothing.
describe('qaDeficiencyActions audit (Batch 651)', () => {
  const audited = (allowed = true, storeResult: unknown = { ok: true, data: { id: 'D-new' } }) => {
    const auditService = { logEvent: vi.fn(async () => ({ ok: true }) as never) };
    const d = {
      ...deps(allowed),
      auditService,
      actorName: async () => 'QA Lead',
      contextOf: async (ref: { deficiencyId?: string; caseId?: string }) => ({ caseId: ref.caseId ?? 'C-of-D', facilityId: 'F1' }),
    };
    d.deficiencies = { raise: vi.fn(async () => storeResult as never), resolve: vi.fn(async () => storeResult as never), containImmediately: vi.fn(async () => storeResult as never), verifyEffectiveness: vi.fn(async () => storeResult as never) };
    return { d, auditService };
  };
  const events = (a: { auditService: { logEvent: ReturnType<typeof vi.fn> } }) => a.auditService.logEvent.mock.calls.map((c: unknown[]) => c[0] as Record<string, unknown>);

  it('raise, escalate, contain and verify each write one entry with actor, case and facility, and no free text', async () => {
    const a = audited();
    const secret = 'Mary Smith 1/2/1950';
    await raiseQaDeficiency({ caseId: 'C1', specimenId: 'SP1', deficiencyTypeId: 't', comment: secret, raisedBy: 'U1' }, a.d);
    await escalateQaDeficiency('D1', { ...escalation, rootCause: secret, correctiveAction: secret }, false, a.d);
    await containQaDeficiency('D2', { resolutionTypeId: 'r', resolutionComment: secret, resolvedBy: 'U1' }, false, a.d);
    await verifyQaDeficiency('D1', { outcome: 'effective', comment: secret, verifiedBy: 'U1' }, false, a.d);
    await verifyQaDeficiency('D1', { outcome: 'recurred', comment: secret, verifiedBy: 'U1' }, true, a.d);
    const written = events(a);
    expect(written.map(e => e.event)).toEqual(['Deficiency raised', 'Deficiency escalated to CAPA', 'Deficiency contained', 'Deficiency effectiveness verified', 'Deficiency reopened as recurred']);
    for (const e of written) expect(e).toMatchObject({ type: 'user', user: 'QA Lead', facilityId: 'F1' });
    expect(written[0]).toMatchObject({ caseId: 'C1' });
    expect(written[1]).toMatchObject({ caseId: 'C-of-D' });
    expect(String(written[1].detail)).toContain('2026-11-01');
    expect(JSON.stringify(written)).not.toMatch(/Mary|Smith|1950/);
  });

  it('refused writes nothing; a change the store reports as failed writes nothing', async () => {
    const refused = audited(false);
    await raiseQaDeficiency({ caseId: 'C1', deficiencyTypeId: 't', comment: 'c', raisedBy: 'U1' }, refused.d);
    await escalateQaDeficiency('D1', escalation, false, refused.d);
    await containQaDeficiency('D1', { resolutionTypeId: 'r', resolutionComment: 'x', resolvedBy: 'U1' }, false, refused.d);
    await verifyQaDeficiency('D1', { outcome: 'effective', comment: '', verifiedBy: 'U1' }, false, refused.d);
    expect(refused.auditService.logEvent).not.toHaveBeenCalled();
    const failedStore = audited(true, { ok: false, error: 'x' });
    await containQaDeficiency('D1', { resolutionTypeId: 'r', resolutionComment: 'x', resolvedBy: 'U1' }, false, failedStore.d);
    expect(failedStore.auditService.logEvent).not.toHaveBeenCalled();
  });

  it('Batch 655: a change the store reports as failed, or that throws, comes back as failed, never as done', async () => {
    const failing = { ok: false, error: 'x' } as never;
    const mk = (fail: 'result' | 'throw' | 'endpoint') => {
      const d = deps(true);
      const boom = async () => { throw new Error('store down'); };
      if (fail === 'result') { d.deficiencies.raise = vi.fn(async () => failing); d.deficiencies.resolve = vi.fn(async () => failing); d.deficiencies.containImmediately = vi.fn(async () => failing); d.deficiencies.verifyEffectiveness = vi.fn(async () => failing); }
      if (fail === 'throw') { d.deficiencies.raise = vi.fn(boom as never); d.deficiencies.resolve = vi.fn(boom as never); d.deficiencies.containImmediately = vi.fn(boom as never); d.deficiencies.verifyEffectiveness = vi.fn(boom as never); }
      if (fail === 'endpoint') d.post = vi.fn(async () => ({ ok: false, status: 500 }) as never);
      return d;
    };
    for (const kind of ['result', 'throw'] as const) {
      const d = mk(kind);
      const outcomes = [
        await raiseQaDeficiency({ caseId: 'C1', deficiencyTypeId: 't', comment: 'c', raisedBy: 'U1' }, d),
        await escalateQaDeficiency('D1', escalation, false, d),
        await containQaDeficiency('D1', { resolutionTypeId: 'r', resolutionComment: 'x', resolvedBy: 'U1' }, false, d),
        await verifyQaDeficiency('D1', { outcome: 'effective', comment: '', verifiedBy: 'U1' }, false, d),
      ];
      for (const o of outcomes) expect(o).toMatchObject({ ok: false, error: 'failed' });
    }
    const e = mk('endpoint');
    expect(await verifyQaDeficiency('D9', { outcome: 'recurred', comment: 'x', verifiedBy: 'U1' }, true, e)).toMatchObject({ ok: false, error: 'failed' });
  });
});

describe('submitManagementReview (Batch 659)', () => {
  const review = { reviewedBy: 'U1', deficiencyIds: ['D1', 'D2'], findings: 'Pattern in grossing' };
  it('checks its capability, saves, and audits without the free text', async () => {
    const { submitManagementReview } = await import('./qaDeficiencyActions');
    const create = vi.fn(async () => ({ ok: true }) as never);
    const logEvent = vi.fn(async () => undefined as never);
    const d = { ...deps(true), reviews: { create }, auditService: { logEvent } };
    expect((await submitManagementReview(review, d)).ok).toBe(true);
    expect(d.enforce).toHaveBeenCalledWith('qa:management-review:submit', {});
    expect(create).toHaveBeenCalledWith(review);
    expect(JSON.stringify(logEvent.mock.calls)).not.toContain('Pattern in grossing');
  });
  it('refused: nothing is saved. A store that did not save is reported as not saved.', async () => {
    const { submitManagementReview } = await import('./qaDeficiencyActions');
    const create = vi.fn(async () => ({ ok: false, error: 'x' }) as never);
    expect((await submitManagementReview(review, { ...deps(false), reviews: { create } })).ok).toBe(false);
    expect(create).not.toHaveBeenCalled();
    const out = await submitManagementReview(review, { ...deps(true), reviews: { create } });
    expect(out).toMatchObject({ ok: false, error: 'failed' });
  });
});
