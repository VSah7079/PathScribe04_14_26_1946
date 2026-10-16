// src/services/cytology/dispatchCytologyAmendedCaseInstance.test.ts
// Batch 532 (Pete, Oct 12, 2026: corrections reissue the whole case report).
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
import { buildCytologyCaseReportMessage } from './cytologyCaseReportMessage';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import { dispatchCytologyAmendedCaseInstance } from './dispatchCytologyAmendedCaseInstance';

const released = { id: 'CASE-1', status: 'finalized', patient: { id: 'PT-1' } };

beforeEach(() => {
  vi.mocked(caseRouter.getCase).mockReset();
  vi.mocked(caseRouter.getCase).mockResolvedValue(released as any);
  vi.mocked(mockPatientIndexService.getById).mockReset();
  vi.mocked(mockPatientIndexService.getById).mockResolvedValue({ organisationId: 'ORG-1' } as any);
  vi.mocked(mockCytologySignOutRecordService.getByCaseId).mockReset();
  vi.mocked(mockCytologySignOutRecordService.getByCaseId).mockResolvedValue({ ok: true, data: [{ id: 'REC-1' }, { id: 'REC-2' }] } as any);
  vi.mocked(mockCytologyOutboundResultQueueService.enqueue).mockReset();
  vi.mocked(mockCytologyOutboundResultQueueService.enqueue).mockResolvedValue({ ok: true, data: { id: 'q-1' } } as any);
  vi.mocked(mockCytologyOutboundResultQueueService.markSent).mockReset();
  vi.mocked(mockCytologyOutboundResultQueueService.markFailed).mockReset();
  vi.mocked(buildCytologyCaseReportMessage).mockReset();
  vi.mocked(buildCytologyCaseReportMessage).mockResolvedValue({ payload: { messageId: 'msg-1', scope: 'case' } } as any);
  vi.mocked(dispatchInterfaceMessage).mockReset();
  vi.mocked(dispatchInterfaceMessage).mockResolvedValue({ ok: true } as any);
});

describe('dispatchCytologyAmendedCaseInstance', () => {
  it('an unknown case is a no-op, never throws', async () => {
    vi.mocked(caseRouter.getCase).mockResolvedValue(undefined);
    await expect(dispatchCytologyAmendedCaseInstance('CASE-X', 'REC-1', 'CORRECTED')).resolves.toBeUndefined();
    expect(buildCytologyCaseReportMessage).not.toHaveBeenCalled();
  });

  it('no patient record is a non-blocking skip', async () => {
    vi.mocked(mockPatientIndexService.getById).mockResolvedValue(null);
    await dispatchCytologyAmendedCaseInstance('CASE-1', 'REC-1', 'CORRECTED');
    expect(mockCytologyOutboundResultQueueService.enqueue).not.toHaveBeenCalled();
  });

  it('Batch 532: a case not yet released sends nothing (the change is in the case report at release)', async () => {
    vi.mocked(caseRouter.getCase).mockResolvedValue({ ...released, status: 'in-progress' } as any);
    await dispatchCytologyAmendedCaseInstance('CASE-1', 'REC-1', 'CORRECTED');
    expect(mockCytologyOutboundResultQueueService.enqueue).not.toHaveBeenCalled();
  });

  it('a nonexistent signOutRecordId is a no-op, never sends', async () => {
    await dispatchCytologyAmendedCaseInstance('CASE-1', 'REC-DOES-NOT-EXIST', 'CORRECTED');
    expect(buildCytologyCaseReportMessage).not.toHaveBeenCalled();
    expect(mockCytologyOutboundResultQueueService.enqueue).not.toHaveBeenCalled();
  });

  it('Batch 532: reissues the whole case report, naming the specimen record that changed', async () => {
    await dispatchCytologyAmendedCaseInstance('CASE-1', 'REC-2', 'CORRECTED');
    const [caseData, records, state, options] = vi.mocked(buildCytologyCaseReportMessage).mock.calls[0];
    expect((caseData as any).id).toBe('CASE-1');
    expect((records as any[]).map(r => r.id)).toEqual(['REC-1', 'REC-2']);
    expect(state).toBe('CORRECTED');
    expect(options).toEqual({ changedRecordId: 'REC-2' });
    expect(mockCytologyOutboundResultQueueService.enqueue).toHaveBeenCalledWith(expect.objectContaining({ signOutRecordId: 'REC-2', resultState: 'CORRECTED', scope: 'case' }));
    expect(dispatchInterfaceMessage).toHaveBeenCalledWith('q-1', 'ORU_R01', expect.objectContaining({ messageId: 'msg-1' }));
    expect(mockCytologyOutboundResultQueueService.markSent).toHaveBeenCalledWith('q-1');
  });

  it('previouslyReportedAs is forwarded unchanged', async () => {
    await dispatchCytologyAmendedCaseInstance('CASE-1', 'REC-1', 'CORRECTED', 'NILM.');
    expect(vi.mocked(buildCytologyCaseReportMessage).mock.calls[0][3]).toEqual({ changedRecordId: 'REC-1', previouslyReportedAs: 'NILM.' });
  });

  it('an ADDENDUM is sent as ADDENDUM, never hard-coded to CORRECTED', async () => {
    await dispatchCytologyAmendedCaseInstance('CASE-1', 'REC-1', 'ADDENDUM');
    expect(vi.mocked(buildCytologyCaseReportMessage).mock.calls[0][2]).toBe('ADDENDUM');
    expect(mockCytologyOutboundResultQueueService.enqueue).toHaveBeenCalledWith(expect.objectContaining({ resultState: 'ADDENDUM' }));
  });

  it('a dispatch failure marks the queue entry failed, never throws', async () => {
    vi.mocked(dispatchInterfaceMessage).mockResolvedValue({ ok: false, error: 'unreachable', errorCode: 'TIMEOUT' } as any);
    await dispatchCytologyAmendedCaseInstance('CASE-1', 'REC-1', 'CORRECTED');
    expect(mockCytologyOutboundResultQueueService.markFailed).toHaveBeenCalledWith('q-1', expect.objectContaining({ errorCode: 'TIMEOUT', errorMessage: 'unreachable' }));
  });

  it('never dedups: a case can be corrected or added to more than once', async () => {
    await dispatchCytologyAmendedCaseInstance('CASE-1', 'REC-1', 'CORRECTED');
    await dispatchCytologyAmendedCaseInstance('CASE-1', 'REC-1', 'CORRECTED');
    expect(dispatchInterfaceMessage).toHaveBeenCalledTimes(2);
  });
});
