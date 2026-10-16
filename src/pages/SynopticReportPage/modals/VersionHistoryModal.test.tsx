// @vitest-environment happy-dom
// src/pages/SynopticReportPage/modals/VersionHistoryModal.test.tsx
// Batch 556: sent documents read through the API server; what the history says when it can't.
// Batch 558: a version's own PDF the same way.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
const svc = vi.hoisted(() => ({
  reportDocumentService: { listByCase: vi.fn(), read: vi.fn() },
  recordDocumentOutput: vi.fn(), checkReportPrint: vi.fn(async () => 'allowed'),
  DOCUMENT_DESTINATION: { pdfInBrowser: 'browser', download: (n: string) => n },
  shortHash: (h: string) => h.slice(0, 4),
  sentDocumentProblem: (e: string) => (['integrity', 'notPermitted', 'unavailable'].includes(e) ? e : 'notFound'),
  reportVersionPdfReader: { read: vi.fn() },
  versionHasPdf: (v: { pdfBase64?: string; pdfSha256?: string }) => !!(v.pdfBase64 || v.pdfSha256),
  versionPdfProblem: (e: string) => (['integrity', 'notPermitted', 'unavailable'].includes(e) ? e : 'notFound'),
}));
vi.mock('@/services', () => svc);
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button>,
}));

import { VersionHistoryModal } from './VersionHistoryModal';

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const doc = { id: 's1', caseId: 'C1', reportType: 'FINAL', source: 'SURGPATH', releasedAt: '2026-10-01T10:00:00Z', producedBy: 'report-renderer', sha256: 'abcd1234', byteLength: 10, createdAt: '2026-10-01T10:00:00Z' };

describe('VersionHistoryModal: sent documents (Batch 556)', () => {
  it("says when the server's list couldn't be read", async () => {
    svc.reportDocumentService.listByCase.mockResolvedValue({ ok: true, data: [], meta: { partial: true } });
    render(<VersionHistoryModal versions={[]} caseId="C1" onClose={() => undefined} />);
    expect(await screen.findByText('versionHistoryModal.sentDocuments.listPartial')).toBeTruthy();
  });

  it("says why a document couldn't be opened from the server", async () => {
    svc.reportDocumentService.listByCase.mockResolvedValue({ ok: true, data: [doc] });
    svc.reportDocumentService.read.mockResolvedValue({ ok: false, error: 'unavailable' });
    render(<VersionHistoryModal versions={[]} caseId="C1" onClose={() => undefined} />);
    fireEvent.click(await screen.findByText('versionHistoryModal.sentDocuments.viewAsSent'));
    expect(await screen.findByText('versionHistoryModal.sentDocuments.unavailable')).toBeTruthy();
    expect(svc.reportDocumentService.read).toHaveBeenCalledWith('s1', 'view'); // a person viewing it, for the server's audit
    expect(screen.queryByText('versionHistoryModal.sentDocuments.listPartial')).toBeNull();
  });
});

const serverVersion = {
  id: 'ver-s1', caseId: 'C1', versionNumber: 2, createdAt: '2026-10-01T10:00:00Z', mode: 'orchestration', trigger: 'amendment',
  createdBy: { userId: 'u1', userName: 'Dr Signer' }, pdfSha256: 'a'.repeat(64),
} as const;

describe('VersionHistoryModal: a version\'s PDF (Batch 558)', () => {
  it('offers the PDF of a version the server holds (listed with its hash only) and reads it for viewing', async () => {
    svc.reportDocumentService.listByCase.mockResolvedValue({ ok: true, data: [] });
    svc.reportVersionPdfReader.read.mockResolvedValue({ ok: false, error: 'integrity' });
    render(<VersionHistoryModal versions={[serverVersion as never]} caseId="C1" onClose={() => undefined} />);
    fireEvent.click(await screen.findByText('versionHistoryModal.viewPdfButton'));
    expect(await screen.findByText('versionHistoryModal.pdfProblems.integrity')).toBeTruthy();
    expect(svc.reportVersionPdfReader.read).toHaveBeenCalledWith(expect.objectContaining({ id: 'ver-s1' }), 'view');
    expect(svc.recordDocumentOutput).not.toHaveBeenCalled(); // nothing opened, nothing audited as opened
  });

  it('offers no PDF for a version without one', async () => {
    svc.reportDocumentService.listByCase.mockResolvedValue({ ok: true, data: [] });
    const { pdfSha256: _h, ...noPdf } = serverVersion;
    void _h;
    render(<VersionHistoryModal versions={[noPdf as never]} caseId="C1" onClose={() => undefined} />);
    await screen.findByText('versionHistoryModal.signedByLabel');
    expect(screen.queryByText('versionHistoryModal.viewPdfButton')).toBeNull();
  });

  it("says when the server's list of versions couldn't be read", async () => {
    svc.reportDocumentService.listByCase.mockResolvedValue({ ok: true, data: [] });
    render(<VersionHistoryModal versions={[]} caseId="C1" versionsPartial onClose={() => undefined} />);
    expect(await screen.findByText('versionHistoryModal.versionsPartial')).toBeTruthy();
  });
});
