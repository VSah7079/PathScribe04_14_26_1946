// Batch 669 (mol-9): Clone & Supersede with the plate's orders.
import { describe, it, expect, vi } from 'vitest';
import { supersedeMolecularBatch } from './supersedeMolecularBatch';
import type { MolecularBatch } from './IMolecularBatchService';

const original = { id: 'mb-1', batchUuid: 'uuid-1' } as MolecularBatch;
const clone = { id: 'mb-2', batchUuid: 'uuid-2' } as MolecularBatch;

describe('supersedeMolecularBatch', () => {
  it('makes the clone, then moves the orders from the old plate to it', async () => {
    const moveOrders = vi.fn(async () => 2);
    const r = await supersedeMolecularBatch('mb-1', 'Mis-scan', 'u', 'U', {
      batchService: { getById: async () => ({ ok: true, data: original }), cloneAndSupersede: async () => ({ ok: true, data: clone }) }, moveOrders,
    });
    expect(r).toEqual({ ok: true, data: { clone, ordersMoved: 2 } });
    expect(moveOrders).toHaveBeenCalledWith('uuid-1', clone);
  });

  it('a refusal passes through and no order is touched', async () => {
    const moveOrders = vi.fn(async () => 1);
    const r = await supersedeMolecularBatch('mb-1', 'x', 'u', 'U', {
      batchService: { getById: async () => ({ ok: true, data: original }), cloneAndSupersede: async () => ({ ok: false, error: 'lotGatingFailed' }) }, moveOrders,
    });
    expect(r).toEqual({ ok: false, error: 'lotGatingFailed' });
    expect(moveOrders).not.toHaveBeenCalled();
  });

  it('an order engine that fails does not undo the supersede; it reads as none moved', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await supersedeMolecularBatch('mb-1', 'x', 'u', 'U', {
      batchService: { getById: async () => ({ ok: true, data: original }), cloneAndSupersede: async () => ({ ok: true, data: clone }) },
      moveOrders: async () => { throw new Error('down'); },
    });
    expect(r).toEqual({ ok: true, data: { clone, ordersMoved: 0 } });
    spy.mockRestore();
  });
});
