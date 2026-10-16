// src/services/cytology/releaseCytologyCorrection.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Batch 534: no release delay in this test (releaseReport is tested on its own).
vi.mock('@/services/reportRelease/releaseThroughDelay', () => ({
  releaseThroughDelay: vi.fn(async (event: any) => {
    const m = await import('@/services/reports/publishReportReleasedEvent');
    return { published: await m.publishReportReleasedEvent(event) };
  }),
}));

vi.mock('./mockCytologyReviewRecordService', () => ({
  mockCytologyReviewRecordService: { create: vi.fn() },
}));
vi.mock('./mockCytologySignOutRecordService', () => ({
  mockCytologySignOutRecordService: { getBySpecimenId: vi.fn(), getByCaseId: vi.fn(), create: vi.fn() },
}));
vi.mock('./resolveCytologyReportContent', () => ({
  resolveCytologyReportContent: vi.fn(),
}));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: vi.fn() } }));
vi.mock('./generateCytologyCaseReportPdf', () => ({ generateCytologyCaseReportPdfSnapshot: vi.fn().mockResolvedValue({ pdfBase64: 'CASE-PDF' }) }));
// Batch 532: the case is released (finalized), so a revision reissues the case report.
vi.mock('../cases/CaseRouter', () => ({ caseRouter: { getCase: vi.fn() } }));
vi.mock('../reports/publishReportReleasedEvent', () => ({
  publishReportReleasedEvent: vi.fn().mockResolvedValue({}),
}));

import { mockCytologyReviewRecordService } from './mockCytologyReviewRecordService';
import { mockCytologySignOutRecordService } from './mockCytologySignOutRecordService';
import { resolveCytologyReportContent } from './resolveCytologyReportContent';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { generateCytologyCaseReportPdfSnapshot } from './generateCytologyCaseReportPdf';
import { caseRouter } from '../cases/CaseRouter';
import { publishReportReleasedEvent } from '../reports/publishReportReleasedEvent';
import { releaseCytologyCorrection } from './releaseCytologyCorrection';

const correctingUser = { id: 'PATH-001', name: 'Dr. Reed', isPathologist: true };
const correctedFindings = { primaryInterpretationId: 'cat-nilm', requiresPathologistReview: true };
const patient = { name: 'Jane Roe' };
const order = { accessionNumber: 'S26-0001-CYT-001', facilityId: 'FAC-A' };
const specimen = { typeDescription: 'Pap smear' };

function priorRecord(overrides: any = {}) {
  return {
    id: 'cyto-signout-1', caseId: 'CASE-1', specimenId: 'SP-1', reviewRecordId: 'rev-1',
    reportContent: { primaryInterpretation: 'Benign fibroadenoma.' },
    signedBy: { userId: 'PATH-000', userName: 'Dr. First', isPathologist: true },
    signedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

const REASON = 'Wrong category selected on the first report.';

beforeEach(() => {
  vi.mocked(authorizationService.enforce).mockReset();
  vi.mocked(authorizationService.enforce).mockResolvedValue({ allowed: true } as any);
  vi.mocked(mockCytologySignOutRecordService.getBySpecimenId).mockReset();
  vi.mocked(mockCytologySignOutRecordService.getBySpecimenId).mockResolvedValue({ ok: true, data: [priorRecord()] } as any);
  vi.mocked(mockCytologySignOutRecordService.create).mockReset();
  vi.mocked(mockCytologySignOutRecordService.create).mockResolvedValue({ ok: true, data: { id: 'cyto-signout-2' } } as any);
  vi.mocked(mockCytologyReviewRecordService.create).mockReset();
  vi.mocked(mockCytologyReviewRecordService.create).mockResolvedValue({ ok: true, data: { id: 'rev-2' } } as any);
  vi.mocked(resolveCytologyReportContent).mockReset();
  vi.mocked(resolveCytologyReportContent).mockReturnValue({ primaryInterpretation: 'Invasive ductal carcinoma.' } as any);
  vi.mocked(publishReportReleasedEvent).mockClear();
  vi.mocked(caseRouter.getCase).mockReset();
  vi.mocked(caseRouter.getCase).mockResolvedValue({ id: 'CASE-1', accession: { fullAccession: 'S26-0001' }, status: 'finalized', specimens: [{ id: 'SP-1', label: 'A' }] } as any);
  vi.mocked(mockCytologySignOutRecordService.getByCaseId).mockReset();
  vi.mocked(mockCytologySignOutRecordService.getByCaseId).mockResolvedValue({ ok: true, data: [priorRecord(), { ...priorRecord(), id: 'cyto-signout-2', signedAt: '2026-10-12T00:00:00.000Z' }] } as any);
  vi.mocked(generateCytologyCaseReportPdfSnapshot).mockClear();
});

describe('releaseCytologyCorrection', () => {
  it('Batch 540: refused while the case report is still in its release delay (recall it instead); nothing created', async () => {
    const { mockHeldReleaseService } = await import('../reportRelease/mockHeldReleaseService');
    await mockHeldReleaseService.add({ id: 'held-c540', caseId: 'CASE-540', kind: 'cytology-sign-out', status: 'held', event: { caseId: 'CASE-540' }, followUps: [], heldAt: 'T', expiresAt: '2099-01-01T00:00:00Z', releasedBy: { userId: 'u', userName: 'u' } } as any);
    const result = await releaseCytologyCorrection('CASE-540', 'SP-1', correctedFindings, [], patient, order, specimen, correctingUser, REASON);
    expect(result).toMatchObject({ ok: false, inReleaseDelay: true });
    expect(mockCytologyReviewRecordService.create).not.toHaveBeenCalled();
    expect(publishReportReleasedEvent).not.toHaveBeenCalled();
    await mockHeldReleaseService.settle('held-c540', 'released', 'T2');
  });
  it('a real specimen with no prior sign-out at all fails honestly \u2014 nothing to correct, nothing created', async () => {
    vi.mocked(mockCytologySignOutRecordService.getBySpecimenId).mockResolvedValue({ ok: true, data: [] } as any);
    const result = await releaseCytologyCorrection('CASE-1', 'SP-1', correctedFindings, [], patient, order, specimen, correctingUser, REASON);
    expect(result.ok).toBe(false);
    expect(mockCytologyReviewRecordService.create).not.toHaveBeenCalled();
    expect(publishReportReleasedEvent).not.toHaveBeenCalled();
  });

  it('a real, successful correction creates a new review, a new linked sign-out record, and publishes the real CORRECTED event', async () => {
    const result = await releaseCytologyCorrection('CASE-1', 'SP-1', correctedFindings, [], patient, order, specimen, correctingUser, REASON);

    expect(result.ok).toBe(true);
    expect(result.signOutRecordId).toBe('cyto-signout-2');
    expect(mockCytologyReviewRecordService.create).toHaveBeenCalledWith(expect.objectContaining({
      specimenId: 'SP-1', caseId: 'CASE-1', role: 'pathologist_review', primaryInterpretationId: 'cat-nilm',
      recordedBy: { userId: 'PATH-001', userName: 'Dr. Reed' },
    }));
    expect(mockCytologySignOutRecordService.create).toHaveBeenCalledWith(expect.objectContaining({
      caseId: 'CASE-1', specimenId: 'SP-1', reviewRecordId: 'rev-2', amendsRecordId: 'cyto-signout-1',
    }));
    expect(publishReportReleasedEvent).toHaveBeenCalledWith(expect.objectContaining({
      caseId: 'CASE-1', instanceId: 'cyto-signout-2', reportType: 'CORRECTED', source: 'CYTOLOGY',
      previouslyReportedAs: 'Benign fibroadenoma.', performingFacilityId: 'FAC-A',
    }));
  });

  it('with multiple prior records for the same specimen, the real correction amends the most recently signed one \u2014 never the original if a correction already happened since', async () => {
    vi.mocked(mockCytologySignOutRecordService.getBySpecimenId).mockResolvedValue({
      ok: true, data: [
        priorRecord({ id: 'cyto-signout-original', signedAt: '2026-09-01T00:00:00.000Z', reportContent: { primaryInterpretation: 'Original finding.' } }),
        priorRecord({ id: 'cyto-signout-first-correction', signedAt: '2026-09-05T00:00:00.000Z', reportContent: { primaryInterpretation: 'First corrected finding.' } }),
      ],
    } as any);

    await releaseCytologyCorrection('CASE-1', 'SP-1', correctedFindings, [], patient, order, specimen, correctingUser, REASON);

    expect(mockCytologySignOutRecordService.create).toHaveBeenCalledWith(expect.objectContaining({ amendsRecordId: 'cyto-signout-first-correction' }));
    expect(publishReportReleasedEvent).toHaveBeenCalledWith(expect.objectContaining({ previouslyReportedAs: 'First corrected finding.' }));
  });

  it('a real failure creating the corrected review fails honestly, never creates a sign-out record or publishes an event', async () => {
    vi.mocked(mockCytologyReviewRecordService.create).mockResolvedValue({ ok: false, error: 'boom' } as any);
    const result = await releaseCytologyCorrection('CASE-1', 'SP-1', correctedFindings, [], patient, order, specimen, correctingUser, REASON);
    expect(result.ok).toBe(false);
    expect(mockCytologySignOutRecordService.create).not.toHaveBeenCalled();
    expect(publishReportReleasedEvent).not.toHaveBeenCalled();
  });

  it('a real failure creating the corrected sign-out record fails honestly, never publishes an event', async () => {
    vi.mocked(mockCytologySignOutRecordService.create).mockResolvedValue({ ok: false, error: 'boom' } as any);
    const result = await releaseCytologyCorrection('CASE-1', 'SP-1', correctedFindings, [], patient, order, specimen, correctingUser, REASON);
    expect(result.ok).toBe(false);
    expect(publishReportReleasedEvent).not.toHaveBeenCalled();
  });

  it('a real, optional generatePdf callback is forwarded through, untouched, to the published event', async () => {
    const generatePdf = vi.fn();
    await releaseCytologyCorrection('CASE-1', 'SP-1', correctedFindings, [], patient, order, specimen, correctingUser, REASON, generatePdf);
    expect(publishReportReleasedEvent).toHaveBeenCalledWith(expect.objectContaining({ generatePdf }));
  });

  describe('Batch 390 (PS-340): permission, reason, stored reason and PDF', () => {
    it('is refused without cytology:report:correct, and nothing is written', async () => {
      vi.mocked(authorizationService.enforce).mockResolvedValue({ allowed: false } as any);
      const result = await releaseCytologyCorrection('CASE-1', 'SP-1', correctedFindings, [], patient, order, specimen, correctingUser, REASON);
      expect(authorizationService.enforce).toHaveBeenCalledWith('cytology:report:correct', { caseId: 'CASE-1' });
      expect(result).toMatchObject({ ok: false, notPermitted: true });
      expect(mockCytologyReviewRecordService.create).not.toHaveBeenCalled();
      expect(mockCytologySignOutRecordService.create).not.toHaveBeenCalled();
      expect(publishReportReleasedEvent).not.toHaveBeenCalled();
    });

    it.each(['', '   ', undefined as any])('refuses an empty reason (%j) before writing anything', async reason => {
      const result = await releaseCytologyCorrection('CASE-1', 'SP-1', correctedFindings, [], patient, order, specimen, correctingUser, reason);
      expect(result).toMatchObject({ ok: false, reasonMissing: true });
      expect(mockCytologyReviewRecordService.create).not.toHaveBeenCalled();
      expect(mockCytologySignOutRecordService.create).not.toHaveBeenCalled();
    });

    it('stores the trimmed reason on the new sign-out record and puts it in the report content', async () => {
      await releaseCytologyCorrection('CASE-1', 'SP-1', correctedFindings, [], patient, order, specimen, correctingUser, `  ${REASON}  `);
      const created = vi.mocked(mockCytologySignOutRecordService.create).mock.calls[0][0] as any;
      expect(created.revisionReason).toBe(REASON);
      expect(created.reportContent.revision).toMatchObject({ kind: 'correction', reason: REASON });
      expect(created.reportContent.revision.previouslyReportedAs).toBeDefined();
    });

    it('Batch 532: without a caller-supplied generatePdf, the event carries the whole case report (the correction included)', async () => {
      const result = await releaseCytologyCorrection('CASE-1', 'SP-1', correctedFindings, [], patient, order, specimen, correctingUser, REASON);
      expect(result.published).toBe(true);
      const call = vi.mocked(publishReportReleasedEvent).mock.calls[0][0] as any;
      expect(call.reportType).toBe('CORRECTED');
      await expect(call.generatePdf()).resolves.toEqual({ pdfBase64: 'CASE-PDF' });
      const report = vi.mocked(generateCytologyCaseReportPdfSnapshot).mock.calls[0][0] as any;
      expect(report.accessionNumber).toBe('S26-0001');
      expect(report.specimens.map((s: any) => s.record?.id)).toEqual(['cyto-signout-2']);
    });

    it('Batch 532: while the case is still open nothing is published; the record goes out in the case report at release', async () => {
      vi.mocked(caseRouter.getCase).mockResolvedValue({ id: 'CASE-1', status: 'in-progress', specimens: [] } as any);
      const result = await releaseCytologyCorrection('CASE-1', 'SP-1', correctedFindings, [], patient, order, specimen, correctingUser, REASON);
      expect(result.ok).toBe(true);
      expect(result.published).toBe(false);
      expect(publishReportReleasedEvent).not.toHaveBeenCalled();
    });
  });
});

describe('Batch 534: the registry goes with the reissued report', () => {
  it('through the release delay, as a correction follow-up, recallable as a cytology revision', async () => {
    const { releaseThroughDelay } = await import('@/services/reportRelease/releaseThroughDelay');
    vi.mocked(releaseThroughDelay).mockClear();
    await releaseCytologyCorrection('CASE-1', 'SP-1', correctedFindings, [], patient, order, specimen, correctingUser, REASON, undefined, { isGynCytology: true, categories: [] });
    const [event, hold] = vi.mocked(releaseThroughDelay).mock.calls[0] as [any, any];
    expect(event).toMatchObject({ reportType: 'CORRECTED', instanceId: 'cyto-signout-2', source: 'CYTOLOGY' });
    expect(hold).toEqual({
      kind: 'cytology-revision', releasedBy: { userId: 'PATH-001', userName: 'Dr. Reed' }, subject: { recordId: 'cyto-signout-2' },
      followUps: [{ type: 'cytology-revision-registry', recordId: 'cyto-signout-2', revision: 'correction', isGynCytology: true, categories: [] }],
    });
  });
});
