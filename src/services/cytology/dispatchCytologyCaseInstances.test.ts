// src/services/cytology/dispatchCytologyCaseInstances.test.ts
// Batch 532 (Pete, Oct 12, 2026): one consolidated FINAL message per accession,
// sent once the case is released. The message itself is built by
// cytologyCaseReportMessage (tested in its own file); here it is a fake.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../cases/CaseRouter', () => ({
  caseRouter: { getCase: vi.fn() },
}));
vi.mock('../patients/mockPatientIndexService', () => ({
  mockPatientIndexService: { getById: vi.fn() },
}));
vi.mock('./mockCytologySignOutRecordService', () => ({
  mockCytologySignOutRecordService: { getByCaseId: vi.fn() },
}));
vi.mock('./mockCytologyOutboundResultQueueService', () => ({
  mockCytologyOutboundResultQueueService: { getByCaseId: vi.fn(), enqueue: vi.fn(), markSent: vi.fn(), markFailed: vi.fn() },
}));
vi.mock('./cytologyCaseReportMessage', async importOriginal => ({
  ...(await importOriginal<typeof import('./cytologyCaseReportMessage')>()),
  buildCytologyCaseReportMessage: vi.fn(),
}));
vi.mock('../interfaceDispatch/dispatchInterfaceMessage', () => ({
  dispatchInterfaceMessage: vi.fn(),
}));

import { caseRouter } from '../cases/CaseRouter';
import { mockPatientIndexService } from '../patients/mockPatientIndexService';
import { mockCytologySignOutRecordService } from './mockCytologySignOutRecordService';
import { mockCytologyOutboundResultQueueService } from './mockCytologyOutboundResultQueueService';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import { dispatchCytologyCaseInstances } from './dispatchCytologyCaseInstances';
import { buildCytologyCaseReportMessage } from './cytologyCaseReportMessage';

const released = { id: 'CASE-1', status: 'finalized', patient: { id: 'PT-1' } };

beforeEach(() => {
  vi.mocked(caseRouter.getCase).mockReset();
  vi.mocked(caseRouter.getCase).mockResolvedValue(released as any);
  vi.mocked(mockPatientIndexService.getById).mockReset();
  vi.mocked(mockPatientIndexService.getById).mockResolvedValue({ organisationId: 'ORG-1' } as any);
  vi.mocked(mockCytologySignOutRecordService.getByCaseId).mockReset();
  vi.mocked(mockCytologySignOutRecordService.getByCaseId).mockResolvedValue({ ok: true, data: [
    { id: 'REC-1', signedAt: '2026-10-12T09:00:00Z' }, { id: 'REC-2', signedAt: '2026-10-12T10:00:00Z' },
  ] } as any);
  vi.mocked(mockCytologyOutboundResultQueueService.getByCaseId).mockReset();
  vi.mocked(mockCytologyOutboundResultQueueService.getByCaseId).mockResolvedValue({ ok: true, data: [] } as any);
  vi.mocked(mockCytologyOutboundResultQueueService.enqueue).mockReset();
  vi.mocked(mockCytologyOutboundResultQueueService.enqueue).mockResolvedValue({ ok: true, data: { id: 'q-1' } } as any);
  vi.mocked(mockCytologyOutboundResultQueueService.markSent).mockReset();
  vi.mocked(mockCytologyOutboundResultQueueService.markFailed).mockReset();
  vi.mocked(buildCytologyCaseReportMessage).mockReset();
  vi.mocked(buildCytologyCaseReportMessage).mockResolvedValue({ payload: { messageId: 'msg-1', scope: 'case' } } as any);
  vi.mocked(dispatchInterfaceMessage).mockReset();
  vi.mocked(dispatchInterfaceMessage).mockResolvedValue({ ok: true } as any);
});

describe('dispatchCytologyCaseInstances', () => {
  it('an unknown case is a no-op, never throws', async () => {
    vi.mocked(caseRouter.getCase).mockResolvedValue(undefined);
    await expect(dispatchCytologyCaseInstances('CASE-X')).resolves.toBeUndefined();
    expect(mockCytologySignOutRecordService.getByCaseId).not.toHaveBeenCalled();
  });

  it('no patient record (no organisationId to enqueue against) is a non-blocking skip', async () => {
    vi.mocked(mockPatientIndexService.getById).mockResolvedValue(null);
    await dispatchCytologyCaseInstances('CASE-1');
    expect(mockCytologyOutboundResultQueueService.enqueue).not.toHaveBeenCalled();
  });

  it('Batch 532: before the case is released (specimens still to sign out), nothing is sent', async () => {
    vi.mocked(caseRouter.getCase).mockResolvedValue({ ...released, status: 'in-progress' } as any);
    await dispatchCytologyCaseInstances('CASE-1');
    expect(mockCytologyOutboundResultQueueService.enqueue).not.toHaveBeenCalled();
    expect(dispatchInterfaceMessage).not.toHaveBeenCalled();
  });

  it('Batch 532: a case finalized early counts as released', async () => {
    vi.mocked(caseRouter.getCase).mockResolvedValue({ ...released, status: 'in-progress', cytologyEarlyFinalization: { reason: 'Inadequate' } } as any);
    await dispatchCytologyCaseInstances('CASE-1');
    expect(dispatchInterfaceMessage).toHaveBeenCalledTimes(1);
  });

  it('Batch 532: one consolidated FINAL message for the whole multi-specimen case, queued against the closing record', async () => {
    await dispatchCytologyCaseInstances('CASE-1');
    expect(mockCytologyOutboundResultQueueService.enqueue).toHaveBeenCalledTimes(1);
    expect(mockCytologyOutboundResultQueueService.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      caseId: 'CASE-1', signOutRecordId: 'REC-2', resultState: 'FINAL', scope: 'case', organisationId: 'ORG-1',
    }));
    const [, records, state, options] = vi.mocked(buildCytologyCaseReportMessage).mock.calls[0];
    expect((records as any[]).map(r => r.id)).toEqual(['REC-1', 'REC-2']);
    expect(state).toBe('FINAL');
    expect(options).toEqual({});
    // Batch 538: without a release document, the builder makes the case report itself (as before).
    expect(dispatchInterfaceMessage).toHaveBeenCalledTimes(1);
    expect(dispatchInterfaceMessage).toHaveBeenCalledWith('q-1', 'ORU_R01', expect.objectContaining({ messageId: 'msg-1' }));
    expect(mockCytologyOutboundResultQueueService.markSent).toHaveBeenCalledWith('q-1');
  });

  it('Batch 538: the release\'s report document is the message\'s PDF (the same bytes print and fax get), recorded on the entry', async () => {
    const doc = { pdfBase64: 'UERG', documentId: 'rdoc-7', sha256: 'abc123' };
    await dispatchCytologyCaseInstances('CASE-1', async () => doc);
    expect(mockCytologyOutboundResultQueueService.enqueue).toHaveBeenCalledWith(expect.objectContaining({ reportDocumentId: 'rdoc-7', pdfSha256: 'abc123' }));
    const options = vi.mocked(buildCytologyCaseReportMessage).mock.calls[0][3] as { pdf?: () => Promise<unknown> };
    expect(await options.pdf!()).toEqual(doc);
  });

  it('a dispatch failure marks the queue entry failed, never throws', async () => {
    vi.mocked(dispatchInterfaceMessage).mockResolvedValue({ ok: false, error: 'unreachable' } as any);
    await dispatchCytologyCaseInstances('CASE-1');
    expect(mockCytologyOutboundResultQueueService.markFailed).toHaveBeenCalledWith('q-1', expect.objectContaining({ errorMessage: 'unreachable' }));
  });

  it('a FINAL already queued for the case (including per-specimen ones sent before Batch 532) is not sent again', async () => {
    vi.mocked(mockCytologyOutboundResultQueueService.getByCaseId).mockResolvedValue({ ok: true, data: [{ resultState: 'FINAL' }] } as any);
    await dispatchCytologyCaseInstances('CASE-1');
    expect(mockCytologyOutboundResultQueueService.enqueue).not.toHaveBeenCalled();
  });

  it('a correction or addendum already queued does not stop the FINAL', async () => {
    vi.mocked(mockCytologyOutboundResultQueueService.getByCaseId).mockResolvedValue({ ok: true, data: [{ resultState: 'CORRECTED' }] } as any);
    await dispatchCytologyCaseInstances('CASE-1');
    expect(dispatchInterfaceMessage).toHaveBeenCalledTimes(1);
  });

  it('Batch 391 / 532: a report that cannot be built (a Korean font that will not load, say) is marked failed to retry, never sent', async () => {
    vi.mocked(buildCytologyCaseReportMessage).mockResolvedValue({ held: 'The case report PDF was not built: offline.' });
    await dispatchCytologyCaseInstances('CASE-1');
    expect(dispatchInterfaceMessage).not.toHaveBeenCalled();
    expect(mockCytologyOutboundResultQueueService.markFailed).toHaveBeenCalledWith('q-1', expect.objectContaining({ errorCode: 'DISPATCH_REJECTED', maxRetriesExceeded: false }));
  });

  it('a build that throws is also marked failed, never thrown', async () => {
    vi.mocked(buildCytologyCaseReportMessage).mockRejectedValue(new Error('boom'));
    await expect(dispatchCytologyCaseInstances('CASE-1')).resolves.toBeUndefined();
    expect(mockCytologyOutboundResultQueueService.markFailed).toHaveBeenCalledWith('q-1', expect.objectContaining({ errorMessage: 'boom' }));
  });
});
