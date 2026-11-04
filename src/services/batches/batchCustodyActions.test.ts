// Batch 404: Batch Management's three overrides check their permission and
// their locked reason in the service.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { enforce } = vi.hoisted(() => ({ enforce: vi.fn(async (_key: string, _ctx?: unknown) => ({ allowed: true })) }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: (k: string, c?: unknown) => enforce(k, c) } }));

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; }, clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: () => null, length: 0,
  });
  enforce.mockClear();
  enforce.mockImplementation(async () => ({ allowed: true }));
});

async function newBatch() {
  const { mockBatchService } = await import('./mockBatchService');
  const created = await mockBatchService.create({ processingNode: 'Processing', protocol: 'Overnight', priority: 'Routine', createdByUserId: 'u1', createdByUserName: 'Tech A' } as never);
  if (!created.ok) throw new Error('setup');
  return { svc: mockBatchService, id: created.data.id };
}

describe('batch overrides (Batch 404)', () => {
  it('aborting needs a reason (no more "No reason given.") and batch:run:abort', async () => {
    const { svc, id } = await newBatch();
    const { BATCH_REASON_REQUIRED, BATCH_NOT_PERMITTED } = await import('./mockBatchService');
    expect(await svc.abort(id, 'u1', 'Tech A', '  ')).toEqual({ ok: false, error: BATCH_REASON_REQUIRED });
    enforce.mockImplementation(async () => ({ allowed: false }));
    expect(await svc.abort(id, 'u1', 'Tech A', 'Wrong protocol')).toEqual({ ok: false, error: BATCH_NOT_PERMITTED });
    expect(enforce).toHaveBeenCalledWith('batch:run:abort', undefined);
    enforce.mockImplementation(async () => ({ allowed: true }));
    const done = await svc.abort(id, 'u1', 'Tech A', 'Wrong protocol');
    expect(done.ok && done.data.abortReason).toBe('Wrong protocol');
  });

  it('forcing a reconciliation complete checks batch:reconciliation:override', async () => {
    const { svc, id } = await newBatch();
    const { BATCH_NOT_PERMITTED } = await import('./mockBatchService');
    await svc.startReconciliation(id, 'u1', 'Tech A');
    enforce.mockImplementation(async () => ({ allowed: false }));
    expect(await svc.overrideAndComplete(id, 'u1', 'Tech A', 'Counted by hand')).toEqual({ ok: false, error: BATCH_NOT_PERMITTED });
    expect(enforce).toHaveBeenCalledWith('batch:reconciliation:override', undefined);
  });

  it('acknowledging a cold-chain excursion checks its permission and needs a note', async () => {
    const { svc, id } = await newBatch();
    const { BATCH_NOT_PERMITTED, BATCH_REASON_REQUIRED } = await import('./mockBatchService');
    await svc.setColdChainExcursion(id, 'r1', 9.5, '2026-09-30T10:00:00Z');
    expect(await svc.acknowledgeColdChainExcursion(id, 'u1', 'Tech A', '')).toEqual({ ok: false, error: BATCH_REASON_REQUIRED });
    enforce.mockImplementation(async () => ({ allowed: false }));
    expect(await svc.acknowledgeColdChainExcursion(id, 'u1', 'Tech A', 'Probe moved')).toEqual({ ok: false, error: BATCH_NOT_PERMITTED });
    expect(enforce).toHaveBeenCalledWith('batch:cold-chain-excursion:acknowledge', undefined);
  });
});
