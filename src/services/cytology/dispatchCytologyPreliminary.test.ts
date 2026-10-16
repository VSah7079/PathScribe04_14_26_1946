// src/services/cytology/dispatchCytologyPreliminary.test.ts
// Batch 533: the urgent cytology preliminary's result message (one specimen, PRELIMINARY).
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../cases/CaseRouter', () => ({ caseRouter: { getCase: vi.fn() } }));
vi.mock('../patients/mockPatientIndexService', () => ({ mockPatientIndexService: { getById: vi.fn() } }));
vi.mock('./mockCytologyOutboundResultQueueService', () => ({
  mockCytologyOutboundResultQueueService: { enqueue: vi.fn(), markSent: vi.fn(), markFailed: vi.fn() },
}));
vi.mock('../interfaceDispatch/dispatchInterfaceMessage', () => ({ dispatchInterfaceMessage: vi.fn() }));

import { caseRouter } from '../cases/CaseRouter';
import { mockPatientIndexService } from '../patients/mockPatientIndexService';
import { mockCytologyOutboundResultQueueService as queue } from './mockCytologyOutboundResultQueueService';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import { dispatchCytologyPreliminary, buildCytologyPreliminaryMessage } from './dispatchCytologyPreliminary';
import { buildCytologyPreliminaryOruR01Payload } from './buildCytologyPreliminaryOruR01Payload';

const release = {
  id: 'P1', specimenId: 'SP2', reviewRecordId: 'rv', reason: 'criticalFinding', note: 'Call', releasedAt: '2026-10-12T15:00:00.000Z',
  releasedBy: { userId: 'U', userName: 'Dr Path' }, signed: true,
  reportContent: { accessionNumber: 'S26-0200', patientName: 'Roe, Jane', patientMrn: 'M1', specimenAdequacy: ['Satisfactory.'], generalCategorization: 'Epithelial cell abnormality',
    primaryInterpretation: 'HSIL', additionalInterpretations: [], recommendations: ['Colposcopy.'], preliminary: { reason: 'criticalFinding' } },
} as any;
const theCase = { id: 'C1', patient: { id: 'PT' }, specimens: [{ id: 'SP1', label: 'A' }, { id: 'SP2', label: 'B' }], cytologyPreliminaryReleases: [release] } as any;

beforeEach(() => {
  vi.mocked(caseRouter.getCase).mockReset().mockResolvedValue(theCase);
  vi.mocked(mockPatientIndexService.getById).mockReset().mockResolvedValue({ organisationId: 'ORG' } as any);
  vi.mocked(queue.enqueue).mockReset().mockResolvedValue({ ok: true, data: { id: 'q1' } } as any);
  vi.mocked(queue.markSent).mockReset();
  vi.mocked(queue.markFailed).mockReset();
  vi.mocked(dispatchInterfaceMessage).mockReset().mockResolvedValue({ ok: true } as any);
});

describe('dispatchCytologyPreliminary', () => {
  it('queues and sends one PRELIMINARY message for the release, with its PDF', async () => {
    expect(await dispatchCytologyPreliminary('C1', 'P1', async () => ({ pdfBase64: 'PDF' }))).toBe(1);
    expect(queue.enqueue).toHaveBeenCalledWith({ caseId: 'C1', signOutRecordId: 'P1', resultState: 'PRELIMINARY', scope: 'preliminary', organisationId: 'ORG' });
    const payload = vi.mocked(dispatchInterfaceMessage).mock.calls[0][2] as any;
    expect(payload).toMatchObject({ scope: 'preliminary', resultState: 'PRELIMINARY', priority: 'Urgent', caseId: 'C1', accessionNumber: 'S26-0200', reason: 'criticalFinding', note: 'Call', reportPdfBase64: 'PDF' });
    expect(payload.specimen).toMatchObject({ specimenId: 'SP2', label: 'B', status: 'reported' });
    expect(queue.markSent).toHaveBeenCalledWith('q1');
  });
  it('a PDF that can\'t be built marks the entry failed to retry, never sent', async () => {
    expect(await dispatchCytologyPreliminary('C1', 'P1', async () => ({ generationError: 'font offline' }))).toBe(0);
    expect(dispatchInterfaceMessage).not.toHaveBeenCalled();
    expect(queue.markFailed).toHaveBeenCalledWith('q1', expect.objectContaining({ errorCode: 'DISPATCH_REJECTED', maxRetriesExceeded: false }));
  });
  it('a dispatch failure is marked failed', async () => {
    vi.mocked(dispatchInterfaceMessage).mockResolvedValue({ ok: false, error: 'down', errorCode: 'DISPATCH_TIMEOUT' } as any);
    expect(await dispatchCytologyPreliminary('C1', 'P1', async () => ({ pdfBase64: 'PDF' }))).toBe(0);
    expect(queue.markFailed).toHaveBeenCalledWith('q1', expect.objectContaining({ errorCode: 'DISPATCH_TIMEOUT', errorMessage: 'down' }));
  });
  it('no release id, no case or no patient record: nothing queued', async () => {
    expect(await dispatchCytologyPreliminary('C1', undefined)).toBe(0);
    vi.mocked(mockPatientIndexService.getById).mockResolvedValue(null);
    expect(await dispatchCytologyPreliminary('C1', 'P1')).toBe(0);
    vi.mocked(caseRouter.getCase).mockResolvedValue(undefined);
    expect(await dispatchCytologyPreliminary('C1', 'P1')).toBe(0);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
  it('a release that isn\'t on the case is held', async () => {
    expect(await buildCytologyPreliminaryMessage(theCase, 'NOPE', async () => ({ pdfBase64: 'x' }))).toEqual({ held: 'The preliminary report is not on the case.' });
  });
});

describe('buildCytologyPreliminaryOruR01Payload', () => {
  it('one specimen, PRELIMINARY and Urgent, with the narrative and no note when none was given', () => {
    const p = buildCytologyPreliminaryOruR01Payload('C1', 'B', { ...release, note: undefined }, 'PDF', 'm1');
    expect(p).toMatchObject({ messageId: 'm1', eventType: 'ORU_R01', eventTimestamp: '2026-10-12T15:00:00.000Z', releasedBy: 'Dr Path', patient: { mrn: 'M1', name: 'Roe, Jane' } });
    expect(p.note).toBeUndefined();
    expect(p.specimen.narrative).toMatchObject({ specimenAdequacy: 'Satisfactory.', primaryInterpretation: 'HSIL', recommendations: 'Colposcopy.' });
    expect(p.specimen.narrative!.additionalInterpretations).toBeUndefined();
  });
});
