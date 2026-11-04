// @vitest-environment happy-dom
//
// src/pages/SynopticReportPage/modals/printOutputAudit.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-282): print and PDF points reachable from screens write their
// DOCUMENT_* entry into the shared audit store (the one the System Audit page
// reads), as the signed-in person:
//   • the report page's Print (the entry it records, reportPrintAuditEvent,
//     for each outcome);
//   • (Report Preview's Print button was here until Batch 497, when that
//     window was retired.)
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

// Batch 495 (PS-283 §4.2.4): Print buttons are CapabilityButtons and every
// print goes through beginReportPrint (report:case-report:print). These tests
// are about the audit entries, so the permission is granted here; the
// refusal path is checked at the end of this file.
const printGate = vi.hoisted(() => ({ allowed: true }));
vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ loading: false, has: () => true, decide: () => ({ allowed: true }) }),
}));
vi.mock('@/services/printing/reportPrintGate', () => ({
  beginReportPrint: async () => printGate.allowed,
  // Batch 516: the screens ask why (not permitted, or a restricted case).
  checkReportPrint: async () => (printGate.allowed ? 'allowed' : 'notPermitted'),
}));

import { VersionHistoryModal } from './VersionHistoryModal';
import { CopilotReportViewModal } from './CopilotReportViewModal';

beforeAll(async () => { await i18n.changeLanguage('en'); });
beforeEach(() => {
  printGate.allowed = true;
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
    await waitFor(() => expect(open).toHaveBeenCalledWith('blob:pdf', '_blank'));
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
    await waitFor(() => expect(click).toHaveBeenCalled());
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

describe('Batch 495 (PS-283 §4.2.4): a refused report:case-report:print produces nothing', () => {
  it('CoPilot report view: nothing is printed or recorded, and the refusal is shown', async () => {
    printGate.allowed = false;
    const alert = vi.fn();
    window.alert = alert; // happy-dom has no window.alert
    const open = vi.spyOn(window, 'open');
    render(<CopilotReportViewModal show onClose={vi.fn()} accession="S26-283-CP" patient="Test, Patient" mrn="MRN-1" instances={[]} caseRecord={{ id: 'CASE-283-CP', version: 1, originHospitalId: null }} />);
    fireEvent.click(screen.getByRole('button', { name: /Print/ }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith(i18n.t('reportPrint.notPermitted')));
    expect(open).not.toHaveBeenCalled();
    expect(await entries('DOCUMENT_PRINTED', 'id=CASE-283-CP;')).toHaveLength(0);
  });

  it('Version history: the stored PDF is not opened and the refusal is shown', async () => {
    printGate.allowed = false;
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    render(<VersionHistoryModal versions={[{
      id: 'v-refused', caseId: 'CASE-283-REFUSED', versionNumber: 1, createdAt: '2026-10-01T10:00:00Z', mode: 'orchestration',
      trigger: 'initial_signout', createdBy: { userId: 'u1', userName: 'Dr Signer' }, pdfBase64: btoa('%PDF-1.4 test'),
    } as ReportVersionRecord]} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'View signed PDF' }));
    await waitFor(() => expect(screen.getByText(i18n.t('reportPrint.notPermitted'))).toBeTruthy());
    expect(open).not.toHaveBeenCalled();
    expect(await entries('DOCUMENT_RENDERED', 'id=CASE-283-REFUSED;')).toHaveLength(0);
  });
});

describe('Batch 538: Released documents — the released report, exactly as sent', () => {
  it('lists the case\'s released documents with their SHA-256; "View as sent" opens the stored bytes and is audited', async () => {
    const { reportDocumentService, pdfSha256 } = await import('@/services');
    const pdf = btoa('%PDF-1.4 the correction as sent');
    const stored = await reportDocumentService.store({ pdfBase64: pdf, caseId: 'CASE-538', reportType: 'CORRECTED', source: 'SURGPATH', releasedAt: '2026-10-12T20:00:00Z', producedBy: 'report-renderer' });
    expect(stored.ok).toBe(true);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:sent');
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    render(<VersionHistoryModal versions={[]} caseId="CASE-538" onClose={vi.fn()} />);
    expect(await screen.findByText('Released documents')).toBeTruthy();
    const hash = pdfSha256(pdf);
    expect(screen.getByTitle(hash).textContent).toBe(`SHA-256 ${hash.slice(0, 8)}…${hash.slice(-4)}`);
    fireEvent.click(screen.getByRole('button', { name: 'View as sent' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('blob:sent', '_blank'));
    await waitFor(async () => expect(await entries('DOCUMENT_RENDERED', `document=report-document; id=${stored.ok ? stored.data.id : ''};`)).toHaveLength(1));
  });
});
