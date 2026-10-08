// @vitest-environment happy-dom
//
// src/pages/SynopticReportPage/modals/printOutputAudit.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-282): print and PDF points reachable from screens write their
// DOCUMENT_* entry into the shared audit store (the one the System Audit page
// reads), as the signed-in person:
//   • the report page's Print (the entry it records, reportPrintAuditEvent,
//     for each outcome);
//   • Report Preview's Print button (ReportPreviewPage, rendered);
//   • the CoPilot report view's Print (CopilotReportViewModal, rendered): a
//     first print, then a reprint of the same case;
//   • opening a signed version's stored PDF (VersionHistoryModal, rendered),
//     including when the popup is blocked and the PDF is downloaded instead.
// Entries are read back from the real audit store, not from a spy.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { mockAuditService } from '@/services/auditlog/mockAuditService';
import { SESSION_PROFILE_STORAGE_KEY } from '@/services/auth/sessionProfile';
import { recordDocumentOutput, DOCUMENT_DESTINATION } from '@/services';
import { reportPrintAuditEvent } from '@/services/printing/reportPrintAudit';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';

vi.mock('react-router', async importOriginal => ({ ...(await importOriginal<typeof import('react-router')>()), useParams: () => ({ caseId: 'CASE-282-PREVIEW' }) }));
vi.mock('@/hooks/usePreviewChannel', () => ({
  usePreviewReceiver: () => ({
    sections: [],
    caseData: { id: 'CASE-282-PREVIEW', version: 7, status: 'finalized', accession: { fullAccession: 'S26-282-PV' }, specimens: [] },
    lastUpdated: null,
    isConnected: true,
  }),
}));
vi.mock('@/services/cases/mockOrchestratorCaseService', () => ({ mockOrchestratorCaseService: { getCase: async () => null } }));

import ReportPreviewPage from '@/pages/ReportPreview/ReportPreviewPage';
import { VersionHistoryModal } from './VersionHistoryModal';
import { CopilotReportViewModal } from './CopilotReportViewModal';

beforeAll(async () => { await i18n.changeLanguage('en'); });
beforeEach(() => {
  localStorage.setItem(SESSION_PROFILE_STORAGE_KEY, JSON.stringify({ id: 'PS282-UI', name: 'Dr Print Tester', role: 'pathologist' }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function entries(event: string, detailIncludes: string) {
  const res = await mockAuditService.getAuditLogs();
  if (!res.ok) throw new Error('getAuditLogs failed');
  return res.data.filter(l => l.event === event && l.detail.includes(detailIncludes));
}

describe('PS-282 the report page Print records its entry', () => {
  it('a reprint records DOCUMENT_REPRINTED with the version, the accession, where it went and the reason', async () => {
    const caseRecord = { id: 'CASE-282-RP', version: 5, accession: { fullAccession: 'S26-282-RP' } };
    await recordDocumentOutput(reportPrintAuditEvent(
      { action: 'reprint', caseRecord, reason: 'Copy for tumour board' },
      { destination: DOCUMENT_DESTINATION.pdfInBrowser, status: 'pending', format: 'pdf' },
    ));
    const [e] = await entries('DOCUMENT_REPRINTED', 'document=report; id=CASE-282-RP;');
    expect(e).toMatchObject({ user: 'Dr Print Tester', caseId: 'S26-282-RP' });
    expect(e.detail).toContain('version=5');
    expect(e.detail).toContain('destination=PDF opened in the browser');
    expect(e.detail).toContain('reason=Copy for tumour board');
    expect(e.detail).toContain('format=pdf');
  });

  it('a first print records DOCUMENT_PRINTED; with no accession the case id stands in; the renderer-down fallback is recorded as such', async () => {
    const event = reportPrintAuditEvent(
      { action: 'print', caseRecord: { id: 'CASE-282-NOACC' }, reason: '' },
      { destination: `${DOCUMENT_DESTINATION.browserPrintDialog} (PDF renderer unavailable)`, status: 'pending', format: 'html' },
    );
    expect(event).toMatchObject({ action: 'print', document: 'report', documentId: 'CASE-282-NOACC', caseId: 'CASE-282-NOACC', version: null });
    await recordDocumentOutput(event);
    const [e] = await entries('DOCUMENT_PRINTED', 'id=CASE-282-NOACC;');
    expect(e.detail).toContain('destination=browser print dialog (PDF renderer unavailable)');
    expect(e.detail).not.toContain('reason=');
  });
});

describe('PS-282 Report Preview Print', () => {
  it('pressing Print opens the print dialog and records DOCUMENT_PREVIEW_PRINTED for the case and version', async () => {
    const print = vi.fn();
    window.print = print; // happy-dom has no window.print
    render(<ReportPreviewPage />);
    fireEvent.click(await screen.findByRole('button', { name: '🖨 Print' }));
    expect(print).toHaveBeenCalledTimes(1);
    await waitFor(async () => expect(await entries('DOCUMENT_PREVIEW_PRINTED', 'id=CASE-282-PREVIEW;')).toHaveLength(1));
    const [e] = await entries('DOCUMENT_PREVIEW_PRINTED', 'id=CASE-282-PREVIEW;');
    expect(e).toMatchObject({ user: 'Dr Print Tester', caseId: 'S26-282-PV' });
    expect(e.detail).toContain('version=7');
    expect(e.detail).toContain('destination=browser print dialog');
  });
});

describe('PS-282 opening a signed version\'s stored PDF', () => {
  const version = (caseId: string, versionNumber: number): ReportVersionRecord => ({
    id: `v-${caseId}-${versionNumber}`, caseId, versionNumber, createdAt: '2026-10-01T10:00:00Z', mode: 'orchestration',
    trigger: 'initial_signout', createdBy: { userId: 'u1', userName: 'Dr Signer' }, pdfBase64: btoa('%PDF-1.4 test'),
  });

  it('records DOCUMENT_RENDERED for that version, opened in the browser', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf');
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    render(<VersionHistoryModal versions={[version('CASE-282-VH', 2)]} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'View signed PDF' }));
    expect(open).toHaveBeenCalledWith('blob:pdf', '_blank');
    await waitFor(async () => expect(await entries('DOCUMENT_RENDERED', 'document=report-version; id=CASE-282-VH;')).toHaveLength(1));
    const [e] = await entries('DOCUMENT_RENDERED', 'id=CASE-282-VH;');
    expect(e.user).toBe('Dr Print Tester');
    expect(e.detail).toContain('version=2');
    expect(e.detail).toContain('destination=PDF opened in the browser');
    expect(e.detail).toContain('status=success');
  });

  it('when the popup is blocked, the PDF downloads and the entry says so', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf');
    vi.spyOn(window, 'open').mockReturnValue(null);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<VersionHistoryModal versions={[version('CASE-282-VH-DL', 3)]} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'View signed PDF' }));
    expect(click).toHaveBeenCalled();
    await waitFor(async () => expect(await entries('DOCUMENT_RENDERED', 'id=CASE-282-VH-DL;')).toHaveLength(1));
    const [e] = await entries('DOCUMENT_RENDERED', 'id=CASE-282-VH-DL;');
    expect(e.detail).toContain('destination=download version-3.pdf');
  });
});

describe('PS-282 CoPilot report view Print', () => {
  it('prints into a new window and records DOCUMENT_PRINTED; printing the same case again records DOCUMENT_REPRINTED', async () => {
    const printWindow = { document: { write: vi.fn(), close: vi.fn() }, focus: vi.fn(), print: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(printWindow as unknown as Window);
    const caseRecord = { id: 'CASE-282-CP', version: 3, originHospitalId: null };
    const view = () => <CopilotReportViewModal show onClose={vi.fn()} accession="S26-282-CP" patient="Test, Patient" mrn="MRN-1" instances={[]} caseRecord={caseRecord} />;
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole('button', { name: /Print/ }));
    await waitFor(async () => expect(await entries('DOCUMENT_PRINTED', 'document=report; id=CASE-282-CP;')).toHaveLength(1));
    expect(open).toHaveBeenCalledTimes(1);
    expect(printWindow.document.write).toHaveBeenCalledTimes(1);
    const [first] = await entries('DOCUMENT_PRINTED', 'id=CASE-282-CP;');
    expect(first).toMatchObject({ user: 'Dr Print Tester', caseId: 'S26-282-CP' });
    expect(first.detail).toContain('version=3');

    rerender(view());
    fireEvent.click(screen.getByRole('button', { name: /Print/ }));
    await waitFor(async () => expect(await entries('DOCUMENT_REPRINTED', 'document=report; id=CASE-282-CP;')).toHaveLength(1));
  });
});
