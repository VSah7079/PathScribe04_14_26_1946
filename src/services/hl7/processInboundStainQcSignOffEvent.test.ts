// Batch 763 (Option A): a stainer's own QC sign-off from the interface engine.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getByMasterBarcode, openRun, vendorRunResult } = vi.hoisted(() => ({ getByMasterBarcode: vi.fn(), openRun: vi.fn(async (_r: unknown) => ({})), vendorRunResult: vi.fn() }));
vi.mock('../batches/batchServiceInstance', () => ({ batchService: { getByMasterBarcode: (b: string) => getByMasterBarcode(b) } }));
vi.mock('../stainQc/stainQcServiceInstance', () => ({ stainQcSystem: { openRun: (r: unknown) => openRun(r), vendorRunResult: (r: unknown) => vendorRunResult(r) } }));

import { processInboundStainQcSignOffEvent, _resetProcessedStainQcSignOffMessageIdsForTests } from './processInboundStainQcSignOffEvent';

const batch = { id: 'b1', masterBarcode: 'RACK-01', processingNode: 'Staining', items: [{ displayId: 'S26-4403-A1-H&E', caseAccession: 'S26-4403', materialType: 'slide' }, { displayId: 'S26-4403-A1', caseAccession: 'S26-4403', materialType: 'block' }] };
const msg = (over: Record<string, unknown> = {}) => ({ messageId: 'm1', masterBarcode: 'RACK-01', result: 'pass', instrumentCode: 'VENTANA_HE600_01', ...over }) as never;

beforeEach(() => {
  _resetProcessedStainQcSignOffMessageIdsForTests();
  getByMasterBarcode.mockResolvedValue({ ok: true, data: batch });
  vendorRunResult.mockResolvedValue({ ok: true, data: {} });
  openRun.mockClear();
});

describe('processInboundStainQcSignOffEvent', () => {
  it('opens the run with its slides and applies the result, once per message', async () => {
    expect(await processInboundStainQcSignOffEvent(msg())).toEqual({ messageId: 'm1', outcome: 'applied', batchId: 'b1' });
    expect(openRun).toHaveBeenCalledWith({ batchId: 'b1', masterBarcode: 'RACK-01', stainerIdOrCode: 'VENTANA_HE600_01', slides: [{ slideId: 'S26-4403-A1-H&E', caseAccession: 'S26-4403' }] });
    expect((await processInboundStainQcSignOffEvent(msg())).outcome).toBe('already-applied');
  });

  it('refuses a bad message, an unknown rack, and a rack no longer staining', async () => {
    expect((await processInboundStainQcSignOffEvent(msg({ result: 'maybe' }))).outcome).toBe('invalid-payload');
    getByMasterBarcode.mockResolvedValueOnce({ ok: false, error: 'notFound' });
    expect((await processInboundStainQcSignOffEvent(msg({ messageId: 'm2' }))).outcome).toBe('batch-not-found');
    getByMasterBarcode.mockResolvedValueOnce({ ok: true, data: { ...batch, processingNode: 'Checkout' } });
    expect((await processInboundStainQcSignOffEvent(msg({ messageId: 'm3' }))).outcome).toBe('wrong-node');
  });

  it('reports a run signed off in PathScribe, or already decided', async () => {
    vendorRunResult.mockResolvedValueOnce({ ok: false, error: 'NOT_VENDOR_MODE' });
    expect((await processInboundStainQcSignOffEvent(msg({ messageId: 'm4' }))).outcome).toBe('not-vendor-mode');
    vendorRunResult.mockResolvedValueOnce({ ok: false, error: 'ALREADY_DECIDED' });
    expect((await processInboundStainQcSignOffEvent(msg({ messageId: 'm5' }))).outcome).toBe('already-decided');
  });
});
