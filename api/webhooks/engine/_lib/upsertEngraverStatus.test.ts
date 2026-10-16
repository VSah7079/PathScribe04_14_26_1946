import { describe, it, expect, vi, beforeEach } from 'vitest';

const { txGet, txSet, txCreate, runTransaction } = vi.hoisted(() => {
  const txGet = vi.fn();
  const txSet = vi.fn();
  const txCreate = vi.fn();
  const runTransaction = vi.fn(async (cb: any) => cb({ get: txGet, set: txSet, create: txCreate }));
  return { txGet, txSet, txCreate, runTransaction };
});

vi.mock('./firebaseAdmin', () => ({
  getAdminFirestore: () => ({
    collection: (name: string) => ({ doc: (id: string) => ({ path: `${name}/${id}` }) }),
    runTransaction,
  }),
}));

import { upsertEngraverStatus } from './upsertEngraverStatus';

const baseInput = {
  deviceId: 'ENG-NY-04', organisationId: 'ORG-MFT', status: 'warning' as const,
  sourceSystem: 'CASSETTE_ENGINE', timestamp: '2026-01-01T12:00:00Z',
};

describe('upsertEngraverStatus', () => {
  beforeEach(() => {
    txGet.mockReset();
    txSet.mockReset();
    txCreate.mockReset();
  });

  it('applies the update when no prior state exists for this device', async () => {
    txGet.mockResolvedValue({ exists: false, data: () => undefined });
    const outcome = await upsertEngraverStatus(baseInput);
    expect(outcome).toBe('applied');
    expect(txSet).toHaveBeenCalledTimes(1);
  });

  it('applies the update when the new event is genuinely newer than current state', async () => {
    txGet.mockResolvedValue({ exists: true, data: () => ({ lastReportedAt: '2026-01-01T11:00:00Z' }) });
    const outcome = await upsertEngraverStatus(baseInput);
    expect(outcome).toBe('applied');
    expect(txSet).toHaveBeenCalledTimes(1);
  });

  it('ignores an out-of-order event older than the currently stored status, never writing', async () => {
    txGet.mockResolvedValue({ exists: true, data: () => ({ lastReportedAt: '2026-01-01T13:00:00Z' }) });
    const outcome = await upsertEngraverStatus(baseInput);
    expect(outcome).toBe('stale-ignored');
    expect(txSet).not.toHaveBeenCalled();
  });

  it('ignores an event with the exact same timestamp as current state (real, exact redelivery)', async () => {
    txGet.mockResolvedValue({ exists: true, data: () => ({ lastReportedAt: baseInput.timestamp }) });
    const outcome = await upsertEngraverStatus(baseInput);
    expect(outcome).toBe('stale-ignored');
    expect(txSet).not.toHaveBeenCalled();
  });

  it('Batch 549 (F10): with a claim, the messageId is claimed in the same transaction as the status', async () => {
    txGet.mockImplementation(async (ref: any) => ref.path.startsWith('processed_messages/') ? { exists: false } : { exists: false, data: () => undefined });
    expect(await upsertEngraverStatus(baseInput, { messageId: 'msg-9', eventType: 'engraver-status' })).toBe('applied');
    expect(txCreate).toHaveBeenCalledWith({ path: 'processed_messages/msg-9' }, expect.objectContaining({ eventType: 'engraver-status' }));
    expect(txSet).toHaveBeenCalledTimes(1);
  });

  it('Batch 549 (F10): a messageId already claimed changes nothing', async () => {
    txGet.mockImplementation(async (ref: any) => ref.path.startsWith('processed_messages/') ? { exists: true } : { exists: false, data: () => undefined });
    expect(await upsertEngraverStatus(baseInput, { messageId: 'msg-9', eventType: 'engraver-status' })).toBe('already-processed');
    expect(txSet).not.toHaveBeenCalled();
    expect(txCreate).not.toHaveBeenCalled();
  });
});
