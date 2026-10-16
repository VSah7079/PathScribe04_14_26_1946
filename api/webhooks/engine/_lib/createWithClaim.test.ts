// Batch 549 (PS-539, finding F10): the record and the messageId claim are written in one transaction.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { txGet, txCreate, runTransaction } = vi.hoisted(() => {
  const txGet = vi.fn();
  const txCreate = vi.fn();
  const runTransaction = vi.fn(async (cb: any) => cb({ get: txGet, create: txCreate }));
  return { txGet, txCreate, runTransaction };
});

vi.mock('./firebaseAdmin', () => ({
  getAdminFirestore: () => ({
    collection: (name: string) => ({ doc: (id: string) => ({ path: `${name}/${id}` }) }),
    runTransaction,
  }),
}));

import { createWithClaim } from './idempotency';

describe('createWithClaim (Batch 549, F10)', () => {
  beforeEach(() => { txGet.mockReset(); txCreate.mockReset(); });

  it('writes the record and the claim together, in one transaction', async () => {
    txGet.mockResolvedValue({ exists: false });
    expect(await createWithClaim('m1', 'cassette-dispatch-outcome', 'pending_engine_notifications', 'm1', { caseId: 'C1' })).toEqual({ alreadyProcessed: false });
    expect(runTransaction).toHaveBeenCalled();
    expect(txGet).toHaveBeenCalledWith({ path: 'processed_messages/m1' });
    expect(txGet).toHaveBeenCalledWith({ path: 'pending_engine_notifications/m1' });
    expect(txCreate).toHaveBeenCalledWith({ path: 'pending_engine_notifications/m1' }, { caseId: 'C1' });
    expect(txCreate).toHaveBeenCalledWith({ path: 'processed_messages/m1' }, expect.objectContaining({ eventType: 'cassette-dispatch-outcome' }));
  });

  it('a messageId already claimed writes nothing', async () => {
    txGet.mockResolvedValue({ exists: true });
    expect(await createWithClaim('m1', 'cassette-dispatch-outcome', 'pending_engine_notifications', 'm1', {})).toEqual({ alreadyProcessed: true });
    expect(txCreate).not.toHaveBeenCalled();
  });

  it('a record already there with no claim is the same message: it is claimed and answered as already processed', async () => {
    txGet.mockImplementation(async (ref: { path: string }) => ({ exists: ref.path.startsWith('pending_engine_notifications/') }));
    expect(await createWithClaim('m1', 'cassette-dispatch-outcome', 'pending_engine_notifications', 'm1', { caseId: 'C1' })).toEqual({ alreadyProcessed: true });
    expect(txCreate).toHaveBeenCalledTimes(1);
    expect(txCreate).toHaveBeenCalledWith({ path: 'processed_messages/m1' }, expect.objectContaining({ eventType: 'cassette-dispatch-outcome' }));
  });

  it('a failure inside the transaction is not reported as already processed (nothing is committed)', async () => {
    txGet.mockRejectedValue(new Error('unavailable'));
    await expect(createWithClaim('m1', 'x', 'c', 'm1', {})).rejects.toThrow('unavailable');
  });
});
