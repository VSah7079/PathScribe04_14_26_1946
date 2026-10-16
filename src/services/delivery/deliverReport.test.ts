// src/services/delivery/deliverReport.test.ts
// Batch 520 (PS-280): a release sent by e-fax or file drop — queued, sent to the interface server
// as REPORT_DELIVERY with the PDF and metadata, and marked sent or failed with the reason.
import { describe, expect, it, vi } from 'vitest';
import { buildReportDeliveryPayload, deliverReport, NO_FAX_NUMBER, sendReportDelivery, type ReportDeliveryDeps } from './deliverReport';
import type { ReportDeliveryQueueEntry } from '@/types/delivery/ReportDeliveryQueueEntry';
import type { IReportDeliveryQueueService } from './IReportDeliveryQueueService';

function memoryQueue(): IReportDeliveryQueueService & { all: ReportDeliveryQueueEntry[] } {
  const all: ReportDeliveryQueueEntry[] = [];
  const upd = (id: string, f: (e: ReportDeliveryQueueEntry) => ReportDeliveryQueueEntry) => {
    const i = all.findIndex(e => e.id === id);
    all[i] = f(all[i]);
    return { ok: true as const, data: all[i] };
  };
  return {
    all,
    getAll: async () => ({ ok: true, data: all }),
    getByCaseId: async id => ({ ok: true, data: all.filter(e => e.caseId === id) }),
    getFailed: async () => ({ ok: true, data: all.filter(e => e.status === 'FAILED') }),
    enqueue: async e => { const n = { ...e, id: `q${all.length + 1}`, status: 'QUEUED' as const, queuedAt: 'now', retryCount: 0, maxRetriesExceeded: false }; all.push(n); return { ok: true, data: n }; },
    markFailed: async (id, f) => upd(id, e => ({ ...e, status: 'FAILED', errorCode: f.errorCode, errorMessage: f.errorMessage })),
    retryDispatch: async id => upd(id, e => ({ ...e, status: 'QUEUED', retryCount: e.retryCount + 1 })),
    markSent: async id => upd(id, e => ({ ...e, status: 'SENT' })),
    setFaxRecipient: async (id, fax) => upd(id, e => ({ ...e, fax })),
    setTransmission: async (id, transmission) => upd(id, e => ({ ...e, transmission })),
  };
}

const CASE = { id: 'c1', accession: { fullAccession: 'S26-0001' }, patient: { mrn: 'MRN-9' }, order: { orderingPhysicianId: 'p1', facilityId: 'f1' } };

function deps(over: Partial<ReportDeliveryDeps> = {}, physicianFax = '520-555-0101') {
  const queue = memoryQueue();
  const d: ReportDeliveryDeps = {
    getCase: async () => CASE as never,
    getPhysician: async () => ({ fax: physicianFax, firstName: 'Ana', lastName: 'Ruiz' }),
    getFacility: async () => ({ fax: '', name: 'Desert Clinic' }),
    reportPdf: () => async () => ({ pdfBase64: 'U0lHTkVE' }),
    queue,
    send: vi.fn(async () => ({ ok: true })),
    ...over,
  };
  return { d, queue };
}

const base = { caseId: 'c1', reportType: 'FINAL' as const, source: 'SURGPATH' as const, releasedAt: '2026-10-10T20:00:00Z', role: 'secondary' as const };

describe('deliverReport', () => {
  it('a fax: queued with the physician as recipient, sent as REPORT_DELIVERY with the release PDF and metadata, marked sent', async () => {
    const { d, queue } = deps();
    const outcome = await deliverReport({ ...base, channel: 'FAX', generatePdf: async () => ({ pdfBase64: 'UkVMRUFTRQ==' }) }, d);
    expect(outcome).toBe('sent');
    expect(queue.all[0]).toMatchObject({ channel: 'FAX', role: 'secondary', accession: 'S26-0001', status: 'SENT', documentName: 'S26-0001_FINAL_20261010T200000Z', fax: { number: '5205550101', recipientName: 'Ana Ruiz' } });
    expect(d.send).toHaveBeenCalledWith('q1', {
      channel: 'FAX', caseId: 'c1', reportType: 'FINAL', releasedAt: '2026-10-10T20:00:00Z', documentName: 'S26-0001_FINAL_20261010T200000Z',
      pdfBase64: 'UkVMRUFTRQ==', metadata: { accession: 'S26-0001', mrn: 'MRN-9', orderingPhysician: 'Ana Ruiz', orderingFacility: 'Desert Clinic' },
      fax: { number: '5205550101', recipientName: 'Ana Ruiz' },
    });
  });

  it('the rule\'s own fax number wins over the physician\'s', async () => {
    const { d, queue } = deps();
    await deliverReport({ ...base, channel: 'FAX', ruleFaxNumber: '+1 520 555 0177' }, d);
    expect(queue.all[0].fax).toEqual({ number: '+15205550177' });
  });

  it('no fax number anywhere: the entry fails saying so; once the physician has one, a resend finds it', async () => {
    const noFax = deps({}, '');
    expect(await deliverReport({ ...base, channel: 'FAX' }, noFax.d)).toBe('failed');
    expect(noFax.queue.all[0]).toMatchObject({ status: 'FAILED', errorMessage: NO_FAX_NUMBER });
    expect(noFax.d.send).not.toHaveBeenCalled();
    const fixed = { ...noFax.d, getPhysician: async () => ({ fax: '520 555 0102' }) };
    const built = await buildReportDeliveryPayload(noFax.queue.all[0], fixed);
    expect('payload' in built && built.payload.fax).toEqual({ number: '5205550102' });
    expect(noFax.queue.all[0].fax).toEqual({ number: '5205550102' });
  });

  it('a file drop: the target is carried, never a path or credentials; without a target nothing is queued', async () => {
    const { d, queue } = deps();
    expect(await deliverReport({ ...base, channel: 'FILE_DROP', fileDropTargetId: ' client-a ' }, d)).toBe('sent');
    expect(queue.all[0].fileDrop).toEqual({ targetId: 'client-a' });
    const sent = vi.mocked(d.send).mock.calls[0][1] as Record<string, unknown>;
    expect(sent.fileDrop).toEqual({ targetId: 'client-a' });
    expect(sent.fax).toBeUndefined();
    expect(sent.pdfBase64).toBe('U0lHTkVE');
    const none = deps();
    expect(await deliverReport({ ...base, channel: 'FILE_DROP' }, none.d)).toBe('not_configured');
    expect(none.queue.all).toEqual([]);
  });

  it('the server refusing (not set up, gateway down) marks it failed with the server\'s reason', async () => {
    const { d, queue } = deps({ send: vi.fn(async () => ({ ok: false, errorCode: 'DISPATCH_REJECTED' as const, error: 'The interface engine rejected this message: Fax is not set up on the interface server' })) });
    expect(await deliverReport({ ...base, channel: 'FAX' }, d)).toBe('failed');
    expect(queue.all[0]).toMatchObject({ status: 'FAILED', errorCode: 'DISPATCH_REJECTED', errorMessage: expect.stringContaining('Fax is not set up') });
  });

  it('no signed PDF yet: failed with that reason, nothing sent; a resend reads the signed PDF again', async () => {
    const { d, queue } = deps({ reportPdf: () => async () => ({ generationError: 'no signed report PDF has been saved for this case' }) });
    expect(await deliverReport({ ...base, channel: 'FAX' }, d)).toBe('failed');
    expect(queue.all[0].errorMessage).toContain('no signed report PDF');
    expect(d.send).not.toHaveBeenCalled();
    const later = { ...d, reportPdf: () => async () => ({ pdfBase64: 'U0lHTkVE' }) };
    expect(await sendReportDelivery(queue.all[0], later)).toBe('sent');
  });
});
