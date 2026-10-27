// PS-282 (Batch 437): print and export audit entries.
import { describe, it, expect, vi } from 'vitest';
import {
  buildDocumentOutputAuditEntry, documentOutputDetail, planDocumentPrint, printPromptComplete,
  recordDocumentOutputWith, wasPrintedBefore, DESTINATION,
} from './documentOutputAudit';
import { beginExport } from './exportGate';

const now = new Date('2026-10-02T21:00:00.000Z');

const NOT_HELD = { blocked: false, warn: false, askOverrideReason: false };

describe('the audit entry', () => {
  it('carries document, id, version, destination, status, time, reason, format and rows', () => {
    const e = buildDocumentOutputAuditEntry({
      action: 'reprint', document: 'report', documentId: 'S26-4404', version: 7, caseId: 'S26-4404',
      destination: DESTINATION.browserPrintDialog, status: 'pending', reason: 'copy for clinic; urgent', format: 'html',
    }, 'Pete Nimmo', now);
    expect(e).toMatchObject({ type: 'user', event: 'DOCUMENT_REPRINTED', user: 'Pete Nimmo', caseId: 'S26-4404', confidence: null });
    expect(e.detail).toMatch(/^document=report; id=S26-4404; version=7; destination=browser print dialog; status=pending; at=2026-10-02T21:00:00.000Z \(UTC[+-]\d\d:\d\d\); reason=copy for clinic, urgent; format=html$/);
  });
  it('an export lists its row count; SYSTEM is a system entry', () => {
    expect(documentOutputDetail({ action: 'export', document: 'audit-log', destination: DESTINATION.download('a.csv'), status: 'success', format: 'csv', rowCount: 12 }, now))
      .toContain('destination=download a.csv; status=success');
    expect(buildDocumentOutputAuditEntry({ action: 'print', document: 'cassette-label', destination: 'printer Z (qz_tray)', status: 'success' }, 'SYSTEM', now).type).toBe('system');
  });
  it('a failed audit write never throws', async () => {
    await expect(recordDocumentOutputWith({ action: 'print', document: 'x', destination: 'y', status: 'success' },
      { logEvent: () => Promise.reject(new Error('down')), actor: () => 'A' })).resolves.toBeUndefined();
  });
});

describe('reprints', () => {
  const logs = [
    { event: 'DOCUMENT_PRINTED', detail: 'document=report; id=S26-1; destination=x; status=pending' },
    { event: 'DOCUMENT_EXPORTED', detail: 'document=report; id=S26-2; destination=x; status=success' },
  ];
  it('a document printed before is a reprint; an export is not a print', () => {
    expect(wasPrintedBefore(logs, 'report', 'S26-1')).toBe(true);
    expect(wasPrintedBefore(logs, 'report', 'S26-2')).toBe(false);
    expect(wasPrintedBefore(logs, 'report', 'S26-10')).toBe(false);
  });
  it('the prompt: reason only for a reprint the lab asks about; Pending Release warns', () => {
    expect(planDocumentPrint({ printedBefore: false, requireReprintReason: true, held: NOT_HELD }))
      .toEqual({ action: 'print', askReason: false, warnPendingRelease: false, blocked: false, askOverrideReason: false });
    const plan = planDocumentPrint({ printedBefore: true, requireReprintReason: true, held: { blocked: false, warn: true, askOverrideReason: false } });
    expect(plan).toEqual({ action: 'reprint', askReason: true, warnPendingRelease: true, blocked: false, askOverrideReason: false });
    expect(printPromptComplete(plan, '  ')).toBe(false);
    expect(printPromptComplete(plan, 'lost')).toBe(true);
  });
});

describe('beginExport (PS-357)', () => {
  it('refused: no file and nothing recorded', async () => {
    const record = vi.fn();
    expect(await beginExport('audit-log', { filename: 'a.csv', rowCount: 3 }, { check: async () => ({ allowed: false }), record })).toBe(false);
    expect(record).not.toHaveBeenCalled();
  });
  it('allowed: recorded as an export', async () => {
    const record = vi.fn(async () => {});
    expect(await beginExport('billing-log', { filename: 'b.csv', rowCount: 4 }, { check: async () => ({ allowed: true }), record })).toBe(true);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'export', document: 'billing-log', destination: 'download b.csv', rowCount: 4, format: 'csv' }));
  });
});
