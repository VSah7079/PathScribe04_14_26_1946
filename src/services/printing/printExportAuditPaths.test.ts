// src/services/printing/printExportAuditPaths.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 450 (PS-282): the print and export points that can be reached below
// the screens really write their DOCUMENT_* entry into the shared audit store
// (the one the System Audit page reads), through the shared helper
// recordDocumentOutput, attributed to the signed-in person. Also: the
// "ask for a reprint reason" print setting is off by default, saves, and a
// facility override wins, as seen by planReportPrint.
//
// Paths reachable only from components (report Print button, Copilot print,
// Report Preview, stored PDF, the Configuration dictionary exports, the
// productivity / validation-study reports) are listed in the Batch 450 report.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';

const auth = vi.hoisted(() => ({ allowed: true, checked: [] as string[] }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (capability: string) => { auth.checked.push(capability); return { allowed: auth.allowed }; },
    evaluate: async () => ({ allowed: auth.allowed }),
    grantedCapabilities: async () => new Set<string>(),
  },
}));

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};
store.set('pathscribe-user', JSON.stringify({ id: 'PS282-USER', name: 'Dr Audit Tester', role: 'pathologist' }));

const { mockAuditService } = await import('../auditlog/mockAuditService');
const { recordDocumentOutput, planReportPrint } = await import('./recordDocumentOutput');
const { beginExport, recordExport } = await import('./exportGate');
const { auditLabelPrint, printerDestination } = await import('@/utils/labels/labelPrintAudit');
const { mockCaseSearchService } = await import('../caseSearch/mockCaseSearchService');
const { mockPrintSettingsService } = await import('../printSettings/mockPrintSettingsService');
const { mockFacilityPrintSettingsService } = await import('../printSettings/mockFacilityPrintSettingsService');
const { mockFacilityService } = await import('../facilities/mockFacilityService');
const { resolveCasePerformingLab } = await import('../facilities/resolveCasePerformingLab');
const { DEFAULT_PRINT_SETTINGS_CONFIG } = await import('../printSettings/IPrintSettingsService');

const flush = () => new Promise(res => setTimeout(res, 50));
async function entries(event: string, detailIncludes: string) {
  const res = await mockAuditService.getAuditLogs();
  expect(res.ok).toBe(true);
  if (!res.ok) throw new Error('getAuditLogs failed');
  return res.data.filter(l => l.event === event && l.detail.includes(detailIncludes));
}

beforeEach(() => { auth.allowed = true; auth.checked.length = 0; });

describe('PS-282 print/export points write their audit entry through the shared helper', () => {
  it('recordDocumentOutput writes a DOCUMENT_* entry to the System Audit store as the signed-in person', async () => {
    await recordDocumentOutput({
      action: 'print', document: 'surgical-report', documentId: 'S26-PS282-1', version: 4, caseId: 'S26-PS282-1',
      destination: 'browser print dialog', status: 'pending',
    });
    const [e] = await entries('DOCUMENT_PRINTED', 'document=surgical-report; id=S26-PS282-1;');
    expect(e).toMatchObject({ type: 'user', user: 'Dr Audit Tester', caseId: 'S26-PS282-1' });
    expect(e.detail).toContain('version=4');
    expect(e.detail).toContain('status=pending');
  });

  it('a gated export (beginExport) that is allowed checks its capability and records DOCUMENT_EXPORTED with the row count', async () => {
    const ok = await beginExport('audit-log', { filename: 'ps282-audit-log.csv', rowCount: 12 });
    expect(ok).toBe(true);
    expect(auth.checked).toEqual(['audit:audit-log:export']);
    const [e] = await entries('DOCUMENT_EXPORTED', 'destination=download ps282-audit-log.csv');
    expect(e.detail).toMatch(/document=audit-log;.*format=csv; rows=12/);
    expect(e.user).toBe('Dr Audit Tester');
  });

  it('a refused gated export records nothing', async () => {
    auth.allowed = false;
    expect(await beginExport('billing-log', { filename: 'ps282-refused.csv', rowCount: 3 })).toBe(false);
    expect(await entries('DOCUMENT_EXPORTED', 'ps282-refused.csv')).toEqual([]);
  });

  it('a configuration export (recordExport) records DOCUMENT_EXPORTED, JSON format kept', async () => {
    await recordExport('stain-dictionary', { filename: 'ps282-stains.json', rowCount: 40, format: 'json' });
    const [e] = await entries('DOCUMENT_EXPORTED', 'ps282-stains.json');
    expect(e.detail).toMatch(/document=stain-dictionary;.*format=json; rows=40/);
  });

  it('a label print (auditLabelPrint) records DOCUMENT_PRINTED with the printer and whether it took the job', async () => {
    auditLabelPrint({ document: 'cassette-label', documentId: 'S26-PS282-L', caseId: 'S26-PS282-L' },
      printerDestination({ printerId: 'ZEBRA-7', bridgeType: 'qz' } as any), 'success', 6);
    await flush();
    const [e] = await entries('DOCUMENT_PRINTED', 'document=cassette-label; id=S26-PS282-L;');
    expect(e.detail).toContain('destination=printer ZEBRA-7 (qz)');
    expect(e.detail).toContain('status=success');
    expect(e.detail).toContain('rows=6');
    expect(e.caseId).toBe('S26-PS282-L');
  });

  it('a label print with no audit context records nothing (and does not throw)', async () => {
    const before = (await entries('DOCUMENT_PRINTED', '')).length;
    expect(() => auditLabelPrint(undefined, 'browser print dialog', 'pending')).not.toThrow();
    await flush();
    expect((await entries('DOCUMENT_PRINTED', '')).length).toBe(before);
  });

  it('the case search export (mockCaseSearchService.exportRows) checks search:case-results:export and records DOCUMENT_EXPORTED', async () => {
    const res = await mockCaseSearchService.exportRows({ criteria: {} } as any);
    expect(res.ok).toBe(true);
    expect(auth.checked).toContain('search:case-results:export');
    await flush();
    const found = await entries('DOCUMENT_EXPORTED', 'document=case-search;');
    expect(found.length).toBeGreaterThan(0);
    const rows = res.ok ? res.data.rows.length : -1;
    expect(found[0].detail).toContain(`rows=${rows}`);
  });

  it('a refused case search export makes no rows and records nothing new', async () => {
    const before = (await entries('DOCUMENT_EXPORTED', 'document=case-search;')).length;
    auth.allowed = false;
    const res = await mockCaseSearchService.exportRows({ criteria: {} } as any);
    expect(res.ok).toBe(false);
    await flush();
    expect((await entries('DOCUMENT_EXPORTED', 'document=case-search;')).length).toBe(before);
  });
});

describe('PS-282 the "ask for a reprint reason" print setting', () => {
  it('is off by default', () => {
    expect(DEFAULT_PRINT_SETTINGS_CONFIG.requireReprintReason).toBe(false);
  });

  it('a report printed before is a reprint; the reason is asked for only once the setting is saved on, and a facility override wins', async () => {
    const facilities = await mockFacilityService.getAll();
    if (!facilities.ok) throw new Error('facilities');
    const origin = facilities.data.find(f => resolveCasePerformingLab({ originHospitalId: f.id }, facilities.data));
    expect(origin).toBeDefined();
    const lab = resolveCasePerformingLab({ originHospitalId: origin!.id }, facilities.data)!;
    const input = { document: 'surgical-report', caseId: 'S26-PS282-RP', caseRecord: { originHospitalId: origin!.id }, pendingReleaseRestricted: false };

    expect(await planReportPrint(input)).toEqual({ action: 'print', askReason: false, warnPendingRelease: false });
    await recordDocumentOutput({ action: 'print', document: 'surgical-report', documentId: 'S26-PS282-RP', destination: 'browser print dialog', status: 'pending' });

    // Printed before, setting off by default: a reprint with no reason asked.
    expect(await planReportPrint(input)).toEqual({ action: 'reprint', askReason: false, warnPendingRelease: false });

    // The toggle saves (global).
    const saved = await mockPrintSettingsService.update({ requireReprintReason: true });
    expect(saved.ok && saved.data.requireReprintReason).toBe(true);
    const reread = await mockPrintSettingsService.get();
    expect(reread.ok && reread.data.requireReprintReason).toBe(true);
    expect(await planReportPrint(input)).toMatchObject({ action: 'reprint', askReason: true });

    // The case's performing lab overrides it off.
    const override = await mockFacilityPrintSettingsService.create(lab.id, { ...DEFAULT_PRINT_SETTINGS_CONFIG, requireReprintReason: false });
    expect(override.ok).toBe(true);
    expect(await planReportPrint(input)).toMatchObject({ action: 'reprint', askReason: false });

    // …and back on at the facility, with Pending Release warning.
    await mockFacilityPrintSettingsService.update(lab.id, { requireReprintReason: true });
    expect(await planReportPrint({ ...input, pendingReleaseRestricted: true })).toEqual({ action: 'reprint', askReason: true, warnPendingRelease: true });
  });
});
