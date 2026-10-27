// @vitest-environment happy-dom
// Batch 645: the demo's lockbox storage: append-only, kept through mockStorage, and used by the shared logic.
import { describe, expect, it, beforeEach } from 'vitest';
import { mockLockboxStore, mockLockboxService } from './mockLockboxService';
import { createLockboxService } from './lockboxService';
import { storageGet } from '../mockStorage';
import type { LockboxReceipt, LockboxResolution } from './lockboxTypes';

const actor = { userId: 'u', userName: 'Night Tech' };
const receipt = (id: string): LockboxReceipt => ({ id, barcode: id.toUpperCase(), state: 'placeholder', receivedAt: '2026-10-21T02:00:00.000Z', receivedBy: actor, urgent: false, placeholderId: `LBX-PH-${id}` });
const resolution = (id: string, receiptId: string): LockboxResolution => ({ id, receiptId, kind: 'accessioned', at: '2026-10-21T06:00:00.000Z', by: actor });

describe('mock lockbox store', () => {
  beforeEach(() => { localStorage.clear(); });

  it('keeps receipts and resolutions in order and offers no update or delete', async () => {
    expect(Object.keys(mockLockboxStore).sort()).toEqual(['appendReceipt', 'appendResolution', 'receipts', 'resolutions']);
    const seedReceipts = (await mockLockboxStore.receipts()).length;
    const seedResolutions = (await mockLockboxStore.resolutions()).length;
    await mockLockboxStore.appendReceipt(receipt('a'));
    await mockLockboxStore.appendReceipt(receipt('b'));
    await mockLockboxStore.appendResolution(resolution('x', 'a'));
    expect((await mockLockboxStore.receipts()).map(r => r.id).slice(seedReceipts)).toEqual(['a', 'b']);
    expect((await mockLockboxStore.resolutions()).map(r => r.id).slice(seedResolutions)).toEqual(['x']);
    expect(storageGet<LockboxReceipt[]>('lockbox_receipts_v1', []).length).toBe(seedReceipts + 2);
  });

  it('starts with the demo seed cases (Batch 648), and a write before any read keeps them', async () => {
    const fresh = await mockLockboxStore.receipts();
    expect(fresh.length).toBeGreaterThan(0);
    localStorage.clear();
    await mockLockboxStore.appendReceipt(receipt('c'));
    const after = await mockLockboxStore.receipts();
    expect(after.length).toBe(fresh.length + 1);
    expect(after[after.length - 1].id).toBe('c');
  });

  it('runs the shared logic on top of it: a receipt written is read back, and a duplicate is a conflict', async () => {
    const svc = createLockboxService({
      authorization: { enforce: async (c: string) => ({ capability: c, allowed: true, grantedBy: [], missingRequirements: [], context: {} }) as never },
      store: mockLockboxStore, pendingOrders: async () => [], facilityName: async () => undefined, physicianName: async () => undefined,
      now: () => new Date('2026-10-21T02:00:00.000Z'), actor: () => actor, newId: () => 'id1', audit: async () => {},
    });
    expect((await svc.receiveSpecimen({ barcode: 'ab1' })).ok).toBe(true);
    expect(await svc.receiveSpecimen({ barcode: 'AB1' })).toEqual({ ok: false, error: 'CONFLICT' });
    const stored = await mockLockboxStore.receipts();
    expect(stored.filter(r => r.barcode === 'AB1').length).toBe(1);
  });
});

describe('mock lockbox service', () => {
  it('has every method of the interface', () => {
    expect(Object.keys(mockLockboxService).sort()).toEqual(['accessionReceiptForCase', 'getFolder', 'lookupBarcode', 'markAccessioned', 'receiveSpecimen', 'resolvePlaceholder']);
  });
});
