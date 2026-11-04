import { describe, it, expect, beforeEach } from 'vitest';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; }, clear: () => undefined, key: () => null, length: 0,
  };
});

const user = { id: 'u1', name: 'Dr Test' };
const draft = (answers: string[]) => ({ provider: 'CAP', eventReference: 'PAP-2026-C', challenges: answers.map((a, i) => ({ slideId: `S${i + 1}`, labResponse: a as never })) });

describe('mockCytologyProficiencyPanelService (Batch 608, #77)', () => {
  it('refuses an incomplete panel', async () => {
    const { mockCytologyProficiencyPanelService: svc } = await import('./mockCytologyProficiencyPanelService');
    expect(await svc.submit(draft(['negative', '']), user)).toMatchObject({ ok: false, error: 'unanswered' });
  });
  it('submits, then applies a simulated result once: the result is marked simulated', async () => {
    const { mockCytologyProficiencyPanelService: svc } = await import('./mockCytologyProficiencyPanelService');
    const { mockCytologyProficiencyTestResultService: results } = await import('./mockCytologyProficiencyTestResultService');
    const { simulatedKeyFor } = await import('./proficiencyPanel');
    const sub = await svc.submit(draft([simulatedKeyFor('S1'), simulatedKeyFor('S2')]), user);
    if (!sub.ok) throw new Error('submit failed');
    expect(sub.data.status).toBe('submitted');
    const graded = await svc.applySimulatedResult(sub.data.id, user);
    expect(graded).toMatchObject({ ok: true, data: { status: 'graded_simulated', outcome: 'satisfactory', scorePercent: 100 } });
    const all = await results.getAll();
    expect(all.ok && all.data.some(r => r.simulated && r.challengeReferenceId === 'PAP-2026-C' && r.outcome === 'satisfactory')).toBe(true);
    expect(await svc.applySimulatedResult(sub.data.id, user)).toMatchObject({ ok: false, error: 'alreadyGraded' });
  });
});
