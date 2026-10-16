// src/services/printing/mockPrintQueueService.test.ts
// Real, per direct precedent (resolveRetentionEligibility.test.ts) —
// '@/services' is mocked rather than imported for real: its own
// index.ts eagerly pulls in mockUserService.ts, which runs real,
// top-level module code referencing the global `localStorage`
// directly at IMPORT time (before any test file's own beforeEach ever
// runs), unrelated to anything this file actually tests. Only
// auditService.logEvent is a real dependency mockPrintQueueService.ts
// itself calls.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services', () => ({
  auditService: { logEvent: vi.fn() },
}));
// Batch 515: the user actions check their capability; `allowed` switches the answer.
const auth = vi.hoisted(() => ({ allowed: true, asked: [] as string[] }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async (capability: string) => { auth.asked.push(capability); return { allowed: auth.allowed }; } },
}));

import { mockPrintQueueService, PRINT_JOB_BAD_DESTINATION, PRINT_JOB_NOT_PERMITTED, PRINT_JOB_WRONG_SITE } from './mockPrintQueueService';
import type { PrintJob } from '@/types/printing/PrintJob';

beforeEach(() => {
  auth.allowed = true; auth.asked = [];
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

const entry = (): Omit<PrintJob, 'id' | 'status' | 'queuedAt' | 'retryCount' | 'maxRetriesExceeded'> => ({
  caseId: 'S26-1001', reportType: 'FINAL', mode: 'NATIVE_QZ_TRAY', printerName: 'Front-Desk', priority: 'Routine',
});

describe('mockPrintQueueService — real, per PS-279 additions', () => {
  it('getById returns the real, matching job, and a real, honest error for an id that does not exist', async () => {
    const created = await mockPrintQueueService.enqueue(entry());
    if (!created.ok) throw new Error('setup failed');
    const found = await mockPrintQueueService.getById(created.data.id);
    if (!found.ok) throw new Error('expected ok');
    expect(found.data.id).toBe(created.data.id);
    const missing = await mockPrintQueueService.getById('does-not-exist');
    expect(missing.ok).toBe(false);
  });

  it('persistRenderedPdf writes pdfBase64 onto the real job record without touching its status', async () => {
    const created = await mockPrintQueueService.enqueue(entry());
    if (!created.ok) throw new Error('setup failed');
    const updated = await mockPrintQueueService.persistRenderedPdf(created.data.id, 'BASE64DATA');
    if (!updated.ok) throw new Error('expected ok');
    expect(updated.data.pdfBase64).toBe('BASE64DATA');
    expect(updated.data.status).toBe('QUEUED');
  });

  describe('hold / release', () => {
    it('holdPrintJob genuinely transitions to HOLD, recording statusBeforeHold, heldBy, holdReason', async () => {
      const created = await mockPrintQueueService.enqueue(entry());
      if (!created.ok) throw new Error('setup failed');
      const held = await mockPrintQueueService.holdPrintJob(created.data.id, 'admin1', 'Awaiting client confirmation');
      if (!held.ok) throw new Error('expected ok');
      expect(held.data.status).toBe('HOLD');
      expect(held.data.statusBeforeHold).toBe('QUEUED');
      expect(held.data.heldBy).toBe('admin1');
      expect(held.data.holdReason).toBe('Awaiting client confirmation');
      expect(held.data.heldAt).toBeTruthy();
    });

    it('a real, already-PRINTED job cannot be held — holding a job that already happened has no real effect', async () => {
      const created = await mockPrintQueueService.enqueue(entry());
      if (!created.ok) throw new Error('setup failed');
      await mockPrintQueueService.markPrinted(created.data.id);
      const held = await mockPrintQueueService.holdPrintJob(created.data.id, 'admin1');
      expect(held.ok).toBe(false);
    });

    it('releaseHold genuinely restores the exact real status recorded in statusBeforeHold, never a hardcoded QUEUED guess', async () => {
      const created = await mockPrintQueueService.enqueue(entry());
      if (!created.ok) throw new Error('setup failed');
      await mockPrintQueueService.markFailed(created.data.id, { errorCode: 'PRINTER_OFFLINE', errorMessage: 'offline', maxRetriesExceeded: false });
      const held = await mockPrintQueueService.holdPrintJob(created.data.id, 'admin1');
      if (!held.ok) throw new Error('setup failed');
      expect(held.data.statusBeforeHold).toBe('FAILED');

      const released = await mockPrintQueueService.releaseHold(created.data.id, 'admin2');
      if (!released.ok) throw new Error('expected ok');
      expect(released.data.status).toBe('FAILED');
      expect(released.data.statusBeforeHold).toBeUndefined();
      expect(released.data.heldBy).toBeUndefined();
      expect(released.data.releasedBy).toBe('admin2');
      expect(released.data.releasedAt).toBeTruthy();
    });

    it('releasing a job that is not currently on HOLD fails honestly', async () => {
      const created = await mockPrintQueueService.enqueue(entry());
      if (!created.ok) throw new Error('setup failed');
      const released = await mockPrintQueueService.releaseHold(created.data.id, 'admin1');
      expect(released.ok).toBe(false);
    });
  });

  describe('cancel', () => {
    it('cancelPrintJob genuinely transitions to CANCELLED, recording cancelledBy/cancelReason', async () => {
      const created = await mockPrintQueueService.enqueue(entry());
      if (!created.ok) throw new Error('setup failed');
      const cancelled = await mockPrintQueueService.cancelPrintJob(created.data.id, 'admin1', 'Duplicate order');
      if (!cancelled.ok) throw new Error('expected ok');
      expect(cancelled.data.status).toBe('CANCELLED');
      expect(cancelled.data.cancelledBy).toBe('admin1');
      expect(cancelled.data.cancelReason).toBe('Duplicate order');
    });

    it('a real, already-PRINTED job cannot be cancelled — it already happened', async () => {
      const created = await mockPrintQueueService.enqueue(entry());
      if (!created.ok) throw new Error('setup failed');
      await mockPrintQueueService.markPrinted(created.data.id);
      const cancelled = await mockPrintQueueService.cancelPrintJob(created.data.id, 'admin1');
      expect(cancelled.ok).toBe(false);
    });

    it('a real, already-CANCELLED job cannot be cancelled twice', async () => {
      const created = await mockPrintQueueService.enqueue(entry());
      if (!created.ok) throw new Error('setup failed');
      await mockPrintQueueService.cancelPrintJob(created.data.id, 'admin1');
      const secondCancel = await mockPrintQueueService.cancelPrintJob(created.data.id, 'admin1');
      expect(secondCancel.ok).toBe(false);
    });

    it('a real HOLD job can still be cancelled directly, without first requiring a release', async () => {
      const created = await mockPrintQueueService.enqueue(entry());
      if (!created.ok) throw new Error('setup failed');
      await mockPrintQueueService.holdPrintJob(created.data.id, 'admin1');
      const cancelled = await mockPrintQueueService.cancelPrintJob(created.data.id, 'admin2', 'No longer needed');
      if (!cancelled.ok) throw new Error('expected ok');
      expect(cancelled.data.status).toBe('CANCELLED');
    });
  });

  describe('redirect', () => {
    it('redirectPrintJob records a real, explicit override destination without changing status', async () => {
      const created = await mockPrintQueueService.enqueue({ ...entry(), mode: 'DIRECT_NETWORK_PRINT' });
      if (!created.ok) throw new Error('setup failed');
      await mockPrintQueueService.markFailed(created.data.id, { errorCode: 'PRINTER_UNREACHABLE', errorMessage: 'unreachable', maxRetriesExceeded: false });
      const destination = { protocol: 'IPP' as const, ipAddress: '10.0.0.9' };
      const redirected = await mockPrintQueueService.redirectPrintJob(created.data.id, destination, 'admin1');
      if (!redirected.ok) throw new Error('expected ok');
      expect(redirected.data.redirectedToDestination).toEqual(destination);
      expect(redirected.data.redirectedBy).toBe('admin1');
      expect(redirected.data.status).toBe('FAILED'); // unchanged by redirect itself
    });

    it("Batch 553: an agent printer must be on the job's own site; a destination with a problem is refused", async () => {
      const created = await mockPrintQueueService.enqueue({ ...entry(), mode: 'DIRECT_NETWORK_PRINT', performingFacilityId: 'S1' });
      if (!created.ok) throw new Error('setup failed');
      const other = await mockPrintQueueService.redirectPrintJob(created.data.id, { agentPrinter: { siteId: 'S2', destinationId: 'rep-1' } }, 'admin1');
      expect(other).toEqual({ ok: false, error: PRINT_JOB_WRONG_SITE });
      const bad = await mockPrintQueueService.redirectPrintJob(created.data.id, { protocol: 'RAW_9100', ipAddress: 'http://x/y' }, 'admin1');
      expect(bad).toEqual({ ok: false, error: PRINT_JOB_BAD_DESTINATION });
      const own = await mockPrintQueueService.redirectPrintJob(created.data.id, { agentPrinter: { siteId: 'S1', destinationId: 'rep-1' }, displayName: 'Front desk' }, 'admin1');
      expect(own.ok && own.data.redirectedToDestination).toEqual({ agentPrinter: { siteId: 'S1', destinationId: 'rep-1' }, displayName: 'Front desk' });
    });

    it('Batch 553: a job with no site (queued before Batch 553) can be redirected to a printer address only', async () => {
      const created = await mockPrintQueueService.enqueue({ ...entry(), mode: 'DIRECT_NETWORK_PRINT' });
      if (!created.ok) throw new Error('setup failed');
      expect(await mockPrintQueueService.redirectPrintJob(created.data.id, { agentPrinter: { siteId: 'S1', destinationId: 'rep-1' } }, 'admin1')).toEqual({ ok: false, error: PRINT_JOB_WRONG_SITE });
      expect((await mockPrintQueueService.redirectPrintJob(created.data.id, { protocol: 'IPP', ipAddress: '10.0.0.9' }, 'admin1')).ok).toBe(true);
    });
  });

  describe('bulk operations', () => {
    it('holdMany holds every real, holdable job and reports per-id success/failure honestly', async () => {
      const a = await mockPrintQueueService.enqueue(entry());
      const b = await mockPrintQueueService.enqueue(entry());
      if (!a.ok || !b.ok) throw new Error('setup failed');
      await mockPrintQueueService.markPrinted(b.data.id); // makes b un-holdable

      const result = await mockPrintQueueService.holdMany([a.data.id, b.data.id, 'missing-id'], 'admin1');
      if (!result.ok) throw new Error('expected ok');
      expect(result.data.succeededIds).toEqual([a.data.id]);
      expect(result.data.failed.map(f => f.id).sort()).toEqual(['missing-id', b.data.id].sort());
    });

    it('cancelMany cancels every real, cancellable job in the given list', async () => {
      const a = await mockPrintQueueService.enqueue(entry());
      const b = await mockPrintQueueService.enqueue(entry());
      if (!a.ok || !b.ok) throw new Error('setup failed');
      const result = await mockPrintQueueService.cancelMany([a.data.id, b.data.id], 'admin1', 'Batch cleanup');
      if (!result.ok) throw new Error('expected ok');
      expect(result.data.succeededIds.sort()).toEqual([a.data.id, b.data.id].sort());
      const aAfter = await mockPrintQueueService.getById(a.data.id);
      expect(aAfter.ok && aAfter.data.status).toBe('CANCELLED');
    });
  });

  describe('tagBatch', () => {
    it('tags every real, given job id with the real batchId, leaving others untouched', async () => {
      const a = await mockPrintQueueService.enqueue(entry());
      const b = await mockPrintQueueService.enqueue(entry());
      if (!a.ok || !b.ok) throw new Error('setup failed');
      const result = await mockPrintQueueService.tagBatch([a.data.id], 'batch-clientAccount-CLIENT-A-seed1');
      if (!result.ok) throw new Error('expected ok');
      expect(result.data.succeededIds).toEqual([a.data.id]);
      const aAfter = await mockPrintQueueService.getById(a.data.id);
      const bAfter = await mockPrintQueueService.getById(b.data.id);
      expect(aAfter.ok && aAfter.data.batchId).toBe('batch-clientAccount-CLIENT-A-seed1');
      expect(bAfter.ok && bAfter.data.batchId).toBeUndefined();
    });
  });
});

describe('mockPrintQueueService — permissions (Batch 515, PS-283)', () => {
  it('each action checks its own capability', async () => {
    const created = await mockPrintQueueService.enqueue(entry());
    if (!created.ok) throw new Error('setup failed');
    const id = created.data.id;
    await mockPrintQueueService.holdPrintJob(id, 'admin');
    await mockPrintQueueService.releaseHold(id, 'admin');
    await mockPrintQueueService.redirectPrintJob(id, { protocol: 'RAW_9100', ipAddress: '10.0.0.9' }, 'admin');
    await mockPrintQueueService.cancelPrintJob(id, 'admin');
    expect(auth.asked).toEqual(['print:job:hold', 'print:job:hold', 'print:job:redirect', 'print:job:cancel']);
  });

  it('a refused action changes nothing', async () => {
    const created = await mockPrintQueueService.enqueue(entry());
    if (!created.ok) throw new Error('setup failed');
    auth.allowed = false;
    const held = await mockPrintQueueService.holdPrintJob(created.data.id, 'someone');
    expect(held).toEqual({ ok: false, error: PRINT_JOB_NOT_PERMITTED });
    const cancelled = await mockPrintQueueService.cancelMany([created.data.id], 'someone');
    expect(cancelled.ok && cancelled.data).toEqual({ succeededIds: [], failed: [{ id: created.data.id, error: PRINT_JOB_NOT_PERMITTED }] });
    const after = await mockPrintQueueService.getById(created.data.id);
    expect(after.ok && after.data.status).toBe('QUEUED');
  });

  it('a bulk action checks once for the whole selection', async () => {
    const a = await mockPrintQueueService.enqueue(entry());
    const b = await mockPrintQueueService.enqueue(entry());
    if (!a.ok || !b.ok) throw new Error('setup failed');
    auth.asked = [];
    await mockPrintQueueService.holdMany([a.data.id, b.data.id], 'admin');
    expect(auth.asked).toEqual(['print:job:hold']);
  });

  it('the system steps (queue, mark printed or failed) are not checked', async () => {
    const created = await mockPrintQueueService.enqueue(entry());
    if (!created.ok) throw new Error('setup failed');
    await mockPrintQueueService.markPrinted(created.data.id);
    expect(auth.asked).toEqual([]);
  });
});
