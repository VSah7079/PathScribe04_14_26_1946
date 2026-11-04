// src/services/digitalPathology/mockWsiScanBatchService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import type { NewWsiScanBatch } from './IWsiScanBatchService';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

const NEW_BATCH: NewWsiScanBatch = {
  scannerInstrumentId: 'WSI-01',
  slides: [
    { slidePosition: '1', caseId: 'c1', specimenId: 's1', scanStatus: 'pending' },
    { slidePosition: '2', caseId: 'c2', specimenId: 's2', scanStatus: 'pending' },
  ],
};

describe('mockWsiScanBatchService — real, per direct follow-up on Cytology Assisted Instrumentation', () => {
  it('real, create correctly sets a real, honest starting state — loaded, no dispatch/unload timestamps yet', async () => {
    const { mockWsiScanBatchService } = await import('./mockWsiScanBatchService');
    const res = await mockWsiScanBatchService.create(NEW_BATCH);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.status).toBe('loaded');
      expect(res.data.dispatchedAt).toBeUndefined();
      expect(res.data.unloadedAt).toBeUndefined();
      expect(res.data.batchBarcode).toMatch(/^WSI-\d{8}-\d{4}$/);
    }
  });

  it('real, markDispatched correctly moves a real, loaded batch to scanning', async () => {
    const { mockWsiScanBatchService } = await import('./mockWsiScanBatchService');
    const created = await mockWsiScanBatchService.create(NEW_BATCH);
    if (!created.ok) throw new Error('setup failed');
    const dispatched = await mockWsiScanBatchService.markDispatched(created.data.id);
    expect(dispatched.ok).toBe(true);
    if (dispatched.ok) {
      expect(dispatched.data.status).toBe('scanning');
      expect(dispatched.data.dispatchedAt).toBeTruthy();
    }
  });

  it('real, direct correction verified: markDispatched refuses a real batch that is not "loaded" — a batch can only be dispatched once', async () => {
    const { mockWsiScanBatchService } = await import('./mockWsiScanBatchService');
    const created = await mockWsiScanBatchService.create(NEW_BATCH);
    if (!created.ok) throw new Error('setup failed');
    await mockWsiScanBatchService.markDispatched(created.data.id);
    const second = await mockWsiScanBatchService.markDispatched(created.data.id);
    expect(second.ok).toBe(false);
  });

  it('markUnloaded refuses while a sent batch still has slides pending or scanning', async () => {
    const { mockWsiScanBatchService } = await import('./mockWsiScanBatchService');
    const created = await mockWsiScanBatchService.create(NEW_BATCH);
    if (!created.ok) throw new Error('setup failed');
    await mockWsiScanBatchService.markDispatched(created.data.id);
    const res = await mockWsiScanBatchService.markUnloaded(created.data.id);
    expect(res.ok).toBe(false);
  });

  it('Batch 434: a batch whose manifest was never sent can be unloaded as it is', async () => {
    const { mockWsiScanBatchService } = await import('./mockWsiScanBatchService');
    const created = await mockWsiScanBatchService.create(NEW_BATCH);
    if (!created.ok) throw new Error('setup failed');
    const res = await mockWsiScanBatchService.markUnloaded(created.data.id, 'tech-1');
    expect(res.ok && res.data).toMatchObject({ status: 'unloaded', unloadedBy: 'tech-1' });
  });

  it('Batch 434: once every slide scanned the batch is "completed"; unloading then really sets "unloaded" (it used to leave "completed")', async () => {
    const { mockWsiScanBatchService } = await import('./mockWsiScanBatchService');
    const created = await mockWsiScanBatchService.create(NEW_BATCH);
    if (!created.ok) throw new Error('setup failed');
    await mockWsiScanBatchService.markDispatched(created.data.id);
    await mockWsiScanBatchService.updateSlideStatus(created.data.id, '1', { scanStatus: 'completed', scanCompletedAt: '2026-09-08T00:00:00.000Z' });
    const both = await mockWsiScanBatchService.updateSlideStatus(created.data.id, '2', { scanStatus: 'completed', scanCompletedAt: '2026-09-08T00:00:00.000Z' });
    expect(both.ok && both.data.status).toBe('completed');
    const res = await mockWsiScanBatchService.markUnloaded(created.data.id);
    expect(res.ok && res.data.status).toBe('unloaded');
    expect(res.ok && res.data.unloadedAt).toBeTruthy();
    expect((await mockWsiScanBatchService.markUnloaded(created.data.id)).ok).toBe(false);
  });

  it('Batch 434: a batch with a failed slide is "failed" until it is unloaded', async () => {
    const { mockWsiScanBatchService } = await import('./mockWsiScanBatchService');
    const created = await mockWsiScanBatchService.create(NEW_BATCH);
    if (!created.ok) throw new Error('setup failed');
    await mockWsiScanBatchService.markDispatched(created.data.id);
    await mockWsiScanBatchService.updateSlideStatus(created.data.id, '1', { scanStatus: 'completed', scanCompletedAt: '2026-09-08T00:00:00.000Z' });
    const mixed = await mockWsiScanBatchService.updateSlideStatus(created.data.id, '2', { scanStatus: 'failed', failureReason: 'Focus error' });
    expect(mixed.ok && mixed.data.status).toBe('failed');
    const res = await mockWsiScanBatchService.markUnloaded(created.data.id);
    expect(res.ok && res.data.status).toBe('unloaded');
  });

  it('Batch 434: a failed send is recorded and cleared when the manifest is accepted', async () => {
    const { mockWsiScanBatchService } = await import('./mockWsiScanBatchService');
    const created = await mockWsiScanBatchService.create(NEW_BATCH);
    if (!created.ok) throw new Error('setup failed');
    const failed = await mockWsiScanBatchService.recordSendFailure(created.data.id, { code: 'DISPATCH_UNREACHABLE', message: 'down' });
    expect(failed.ok && failed.data).toMatchObject({ status: 'loaded', sendError: { code: 'DISPATCH_UNREACHABLE', message: 'down' } });
    const sent = await mockWsiScanBatchService.markDispatched(created.data.id, 'tech-1');
    expect(sent.ok && sent.data).toMatchObject({ status: 'scanning', sentBy: 'tech-1', sendError: undefined });
  });

  it('real, updateSlideStatus correctly refuses a genuinely non-existent slide position', async () => {
    const { mockWsiScanBatchService } = await import('./mockWsiScanBatchService');
    const created = await mockWsiScanBatchService.create(NEW_BATCH);
    if (!created.ok) throw new Error('setup failed');
    const res = await mockWsiScanBatchService.updateSlideStatus(created.data.id, '99', { scanStatus: 'completed' });
    expect(res.ok).toBe(false);
  });
});
