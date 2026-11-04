// src/services/reports/reportVersionPdf.test.ts (Batch 558)
import { describe, it, expect, vi } from 'vitest';
import { createReportVersionPdfReader, localVersionPdfMatches, versionHasPdf, versionPdfErrorText, versionPdfProblem, type IReportVersionPdfApi } from './reportVersionPdf';
import { pdfSha256 } from '../reportDocuments/reportDocuments';
import { sha256Hex } from '../registrySubmission/sha256';
import { resolveOruReportPdf, savedReportPdf } from './resolveOruReportPdf';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';

const PDF = btoa('%PDF-1.7 signed version');
const SHA = pdfSha256(PDF);
const v = (o: Partial<ReportVersionRecord>): ReportVersionRecord => ({
  id: 'v1', caseId: 'C1', versionNumber: 3, createdAt: '', mode: 'orchestration', trigger: 'initial_signout',
  createdBy: { userId: 'u', userName: 'U' }, ...o,
});
const server = (result: Awaited<ReturnType<IReportVersionPdfApi['readPdf']>>) => ({ readPdf: vi.fn(async () => result) });

describe('a report version\'s signed PDF (Batch 558)', () => {
  it('has a PDF when one is kept with it or the server lists its hash', () => {
    expect(versionHasPdf({ pdfBase64: PDF })).toBe(true);
    expect(versionHasPdf({ pdfSha256: SHA })).toBe(true);
    expect(versionHasPdf({})).toBe(false);
  });

  it('checks a kept PDF against the bytes\' hash, and accepts the older text hash', () => {
    expect(localVersionPdfMatches(PDF, SHA)).toEqual({ ok: true, sha256: SHA });
    expect(localVersionPdfMatches(PDF, SHA.toUpperCase()).ok).toBe(true);
    expect(localVersionPdfMatches(PDF, sha256Hex(PDF)).ok).toBe(true); // saved before Batch 558
    expect(localVersionPdfMatches(PDF, 'f'.repeat(64)).ok).toBe(false);
    expect(localVersionPdfMatches(PDF, undefined).ok).toBe(true); // older than Batch 461: nothing to check
  });

  it('refuses a kept PDF that no longer matches its hash, and never asks the server for it', async () => {
    const api = server({ ok: true, data: { pdfBase64: PDF, sha256: SHA } });
    const reader = createReportVersionPdfReader({ server: api });
    expect(await reader.read(v({ pdfBase64: btoa('%PDF changed'), pdfSha256: SHA }), 'view')).toEqual({ ok: false, error: 'integrity' });
    expect(await reader.read(v({ pdfBase64: PDF, pdfSha256: SHA }), 'view')).toEqual({ ok: true, data: { pdfBase64: PDF, sha256: SHA } });
    expect(api.readPdf).not.toHaveBeenCalled();
  });

  it('reads a version the server holds through the API, with its purpose, and checks it is the version\'s own PDF', async () => {
    const api = server({ ok: true, data: { pdfBase64: PDF, sha256: SHA } });
    const reader = createReportVersionPdfReader({ server: api });
    expect(await reader.read(v({ pdfSha256: SHA.toUpperCase() }), 'send')).toEqual({ ok: true, data: { pdfBase64: PDF, sha256: SHA } });
    expect(api.readPdf).toHaveBeenCalledWith('C1', 3, 'send');
    // The server's bytes matched its own header but not the hash the version was signed with.
    expect(await reader.read(v({ pdfSha256: 'e'.repeat(64) }), 'view')).toEqual({ ok: false, error: 'integrity' });
  });

  it('passes the server\'s refusal on; with no server, a version held there is not found; no PDF is "none"', async () => {
    expect(await createReportVersionPdfReader({ server: server({ ok: false, error: 'notPermitted' }) }).read(v({ pdfSha256: SHA }), 'view')).toEqual({ ok: false, error: 'notPermitted' });
    expect(await createReportVersionPdfReader({}).read(v({ pdfSha256: SHA }), 'view')).toEqual({ ok: false, error: 'notFound' });
    expect(await createReportVersionPdfReader({}).read(v({}), 'view')).toEqual({ ok: false, error: 'none' });
  });

  it('names each refusal for the screen and for the queue', () => {
    expect(['integrity', 'notPermitted', 'unavailable', 'empty', 'none'].map(versionPdfProblem)).toEqual(['integrity', 'notPermitted', 'unavailable', 'notFound', 'notFound']);
    expect(versionPdfErrorText('integrity')).toContain('SHA-256');
    expect(versionPdfErrorText('unavailable')).toContain('server');
  });
});

describe('the ORU result and the release after the hold period read through it (Batch 558)', () => {
  const store = () => ({ get: vi.fn(async () => undefined), put: vi.fn(async () => undefined) });
  const versions = (list: ReportVersionRecord[]) => ({ getByCaseId: vi.fn(async () => ({ ok: true as const, data: list })) });

  it('a result sends a version the server holds, read for sending', async () => {
    const api = server({ ok: true, data: { pdfBase64: PDF, sha256: SHA } });
    const r = await resolveOruReportPdf({ caseId: 'C1', instanceId: 'I1', resultState: 'FINAL' },
      { versions: versions([v({ instanceId: 'I1', pdfSha256: SHA })]), store: store(), versionPdf: createReportVersionPdfReader({ server: api }) });
    expect(r).toEqual({ ok: true, pdfBase64: PDF, source: 'report-version', sha256: SHA }); // Batch 559: the hash goes with it
    expect(api.readPdf).toHaveBeenCalledWith('C1', 3, 'send');
  });

  it('a version whose PDF fails its check holds the result; an older one is never sent instead', async () => {
    const r = await resolveOruReportPdf({ caseId: 'C1', instanceId: 'I1', resultState: 'FINAL' }, {
      versions: versions([v({ id: 'old', versionNumber: 1, instanceId: 'I1', pdfBase64: PDF, pdfSha256: SHA }), v({ versionNumber: 2, instanceId: 'I1', pdfBase64: btoa('%PDF changed'), pdfSha256: SHA })]),
      store: store(), versionPdf: createReportVersionPdfReader({}),
    });
    expect(r).toEqual({ ok: false, error: expect.stringContaining('version 2') });
    expect(r.ok === false && r.error).toContain('SHA-256');
  });

  it('the release after the hold period reads the newest version through the reader, and says why it could not', async () => {
    const vs = versions([v({ versionNumber: 4, pdfSha256: SHA })]);
    expect(await savedReportPdf('C1', 'FINAL', vs, createReportVersionPdfReader({ server: server({ ok: true, data: { pdfBase64: PDF, sha256: SHA } }) }))!()).toEqual({ pdfBase64: PDF });
    const down = await savedReportPdf('C1', 'FINAL', vs, createReportVersionPdfReader({ server: server({ ok: false, error: 'unavailable' }) }))!();
    expect(down.generationError).toContain('(4) could not be read');
  });
});
