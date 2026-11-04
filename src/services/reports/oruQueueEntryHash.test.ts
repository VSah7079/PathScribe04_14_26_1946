// src/services/reports/oruQueueEntryHash.test.ts (Batch 561)
// The two dispatchers Batch 559 changed without a test of their own: a result sent with a signed version's PDF
// (no report document) records the PDF's hash on its queue entry; one with a document records the document's.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../cases/CaseRouter', () => ({ caseRouter: { getCase: vi.fn() } }));
vi.mock('../patients/mockPatientIndexService', () => ({ mockPatientIndexService: { getById: vi.fn() } }));
vi.mock('./prepareOruR01Dispatch', () => ({ prepareOruR01Dispatch: vi.fn() }));
vi.mock('./mockOutboundResultQueueService', () => ({
  mockOutboundResultQueueService: { enqueue: vi.fn(), markFailed: vi.fn(), markSent: vi.fn(), getByInstanceAndState: vi.fn() },
}));
vi.mock('../interfaceDispatch/dispatchInterfaceMessage', () => ({ dispatchInterfaceMessage: vi.fn().mockResolvedValue({ ok: true }) }));

import { caseRouter } from '../cases/CaseRouter';
import { mockPatientIndexService } from '../patients/mockPatientIndexService';
import { prepareOruR01Dispatch } from './prepareOruR01Dispatch';
import { mockOutboundResultQueueService } from './mockOutboundResultQueueService';
import { dispatchCaseInstances } from './dispatchCaseInstances';
import { dispatchPreliminaryCaseInstances } from './dispatchPreliminaryCaseInstances';

const SHA = 'a'.repeat(64);
const theCase = {
  id: 'CASE-1', patient: { id: 'PT-1', organisationId: 'ORG-1' }, reportingMode: 'orchestrator', status: 'finalized',
  synopticReports: [{ instanceId: 'INST-1', specimenId: 'SPEC-1', templateId: 't', templateName: 'A', status: 'finalized', answers: {} }],
};

beforeEach(() => {
  vi.mocked(caseRouter.getCase).mockResolvedValue(theCase as never);
  vi.mocked(mockPatientIndexService.getById).mockResolvedValue({ organisationId: 'ORG-1' } as never);
  vi.mocked(mockOutboundResultQueueService.getByInstanceAndState).mockResolvedValue({ ok: true, data: [] } as never);
  vi.mocked(mockOutboundResultQueueService.enqueue).mockReset();
  vi.mocked(mockOutboundResultQueueService.enqueue).mockResolvedValue({ ok: true, data: { id: 'q-1' } } as never);
});

describe('the PDF hash on a result\'s queue entry (Batch 559, tested in Batch 561)', () => {
  it('FINAL: a signed version\'s PDF records its own hash, and no document id', async () => {
    vi.mocked(prepareOruR01Dispatch).mockResolvedValue({ ok: true, payload: { messageId: 'm' } as never, pdfSha256: SHA });
    await dispatchCaseInstances('CASE-1');
    const entry = vi.mocked(mockOutboundResultQueueService.enqueue).mock.calls[0][0];
    expect(entry).toMatchObject({ resultState: 'FINAL', pdfSha256: SHA });
    expect(entry).not.toHaveProperty('reportDocumentId');
  });

  it('PRELIMINARY: the same; and a stored document still records the document and its hash', async () => {
    vi.mocked(prepareOruR01Dispatch).mockResolvedValueOnce({ ok: true, payload: { messageId: 'm' } as never, pdfSha256: SHA });
    await dispatchPreliminaryCaseInstances('CASE-1');
    expect(vi.mocked(mockOutboundResultQueueService.enqueue).mock.calls[0][0]).toMatchObject({ resultState: 'PRELIMINARY', pdfSha256: SHA });
    vi.mocked(prepareOruR01Dispatch).mockResolvedValueOnce({ ok: true, payload: { messageId: 'm' } as never, document: { id: 'rdoc-1', sha256: 'b'.repeat(64) } });
    await dispatchPreliminaryCaseInstances('CASE-1');
    expect(vi.mocked(mockOutboundResultQueueService.enqueue).mock.calls[1][0]).toMatchObject({ reportDocumentId: 'rdoc-1', pdfSha256: 'b'.repeat(64) });
  });
});
