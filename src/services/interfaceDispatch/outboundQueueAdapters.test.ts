// @vitest-environment happy-dom
// src/services/interfaceDispatch/outboundQueueAdapters.test.ts
// Batch 518 (PS-122): the seven queues' adapters read their real queue
// services, and the queues that store their message send it as stored.
import { describe, it, expect } from 'vitest';
import { loadOutboundQueueAdapters, OUTBOUND_QUEUE_TYPES } from './outboundQueueAdapters';

describe('outbound queue adapters (Batch 518, PS-122)', () => {
  it('there is one for each of the queues (seven, and report delivery since Batch 520), and each reads its queue', async () => {
    const adapters = await loadOutboundQueueAdapters();
    expect(Object.keys(adapters).sort()).toEqual([...OUTBOUND_QUEUE_TYPES].sort());
    for (const q of OUTBOUND_QUEUE_TYPES) expect((await adapters[q].getAll()).ok).toBe(true);
  });

  it('accession, referral and molecular orders send their stored message, with its own transaction type', async () => {
    const a = await loadOutboundQueueAdapters();
    const base = { id: 'x', status: 'FAILED' as const, queuedAt: '2026-10-10T00:00:00Z', retryCount: 0, maxRetriesExceeded: false };
    const acc = { ...base, caseId: 'c1', eventType: 'order.accessioned', organisationId: 'ORG-DVMC', payload: { messageId: 'm1' } };
    expect(a.accession.transactionType(acc)).toBe('ACCESSION_EVENT');
    expect(await a.accession.buildPayload(acc)).toEqual({ eventType: 'order.accessioned', organisationId: 'ORG-DVMC', messageId: 'm1' });
    const ref = { ...base, batchId: 'b1', payload: { masterBarcode: 'REF-1', priority: 'STAT' } };
    expect([a.referral.transactionType(ref), a.referral.identifier(ref), a.referral.kind(ref), a.referral.subjectId(ref)]).toEqual(['REFERRAL_MANIFEST', 'REF-1', 'STAT', 'b1']);
    const mol = { ...base, caseId: 'c2', eventType: 'order.molecular', payload: { accessionNumber: 'S26-1', specimenLetter: 'A', assayCode: 'HPV', orderReason: 'protocol_configured', priority: 'routine' } };
    expect([a.molecular_order.identifier(mol), a.molecular_order.kind(mol), a.molecular_order.transactionType(mol)]).toEqual(['S26-1-A', 'HPV', 'MOLECULAR_ORDER']);
    const inst = { ...base, eventType: 'order.instrument', payload: { masterBarcode: 'MB-9', instrumentVendor: 'Hologic' } };
    expect([a.molecular_order.identifier(inst), a.molecular_order.kind(inst), a.molecular_order.subjectId(inst)]).toEqual(['MB-9', 'order.instrument', 'x']);
  });

  it('a cytology result whose sign-out record is gone can\'t be rebuilt', async () => {
    const a = await loadOutboundQueueAdapters();
    const e = { id: 'x', status: 'FAILED' as const, queuedAt: '2026-10-10T00:00:00Z', retryCount: 0, maxRetriesExceeded: false, caseId: 'none', signOutRecordId: 'none', resultState: 'FINAL', organisationId: 'o' };
    expect(await a.cytology_result.buildPayload(e)).toBeNull();
  });

  it('Batch 532: a consolidated cytology case message is rebuilt from the case; with no such case it can\'t be', async () => {
    const a = await loadOutboundQueueAdapters();
    const e = { id: 'x', status: 'FAILED' as const, queuedAt: '2026-10-10T00:00:00Z', retryCount: 0, maxRetriesExceeded: false, caseId: 'none', signOutRecordId: 'none', resultState: 'FINAL', organisationId: 'o', scope: 'case' as const };
    expect(await a.cytology_result.buildPayload(e)).toBeNull();
  });

  it('Batch 533: an urgent cytology preliminary is rebuilt from the case; with no such case it can\'t be', async () => {
    const a = await loadOutboundQueueAdapters();
    const e = { id: 'x', status: 'FAILED' as const, queuedAt: '2026-10-10T00:00:00Z', retryCount: 0, maxRetriesExceeded: false, caseId: 'none', signOutRecordId: 'P1', resultState: 'PRELIMINARY' as const, organisationId: 'o', scope: 'preliminary' as const };
    expect(await a.cytology_result.buildPayload(e)).toBeNull();
  });

  it('Batch 520 (PS-280): a report delivery resends as REPORT_DELIVERY; without its signed PDF it is held, with the reason', async () => {
    const a = await loadOutboundQueueAdapters();
    const e = { id: 'rd1', status: 'FAILED' as const, queuedAt: '2026-10-10T00:00:00Z', retryCount: 0, maxRetriesExceeded: false, caseId: 'no-such-case', accession: 'S26-0001',
      reportType: 'FINAL', source: 'SURGPATH', channel: 'FILE_DROP', role: 'primary', releasedAt: '2026-10-10T20:00:00Z', documentName: 'S26-0001_FINAL_20261010T200000Z',
      fileDrop: { targetId: 'client-a' }, metadata: { accession: 'S26-0001' } };
    expect([a.report_delivery.transactionType(e), a.report_delivery.identifier(e), a.report_delivery.kind(e), a.report_delivery.subjectId(e)]).toEqual(['REPORT_DELIVERY', 'S26-0001', 'FILE_DROP · FINAL', 'no-such-case']);
    const built = await a.report_delivery.buildPayload(e) as { held?: string };
    expect(built.held).toContain('signed report PDF');
    expect(a.report_delivery.capaLabel(e)).toContain('file drop');
  });
});
