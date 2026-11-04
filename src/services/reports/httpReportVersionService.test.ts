// src/services/reports/httpReportVersionService.test.ts (Batch 558)
import { describe, it, expect, vi } from 'vitest';
import { createHttpReportVersionApi, createServerBackedReportVersionService, normaliseServerVersions, reportVersionHttpError } from './httpReportVersionService';
import { pdfSha256 } from '../reportDocuments/reportDocuments';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';
import type { IReportVersionService } from './IReportVersionService';

const PDF = btoa('%PDF-1.7 version bytes');
const SHA = pdfSha256(PDF);
const bytes = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const pdfResponse = (headers: Record<string, string>, body = bytes(PDF)) => new Response(body, { status: 200, headers: { 'Content-Type': 'application/pdf', ...headers } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const row = (o: Record<string, unknown> = {}) => ({ id: 'ver-1', caseId: 'C1', versionNumber: 1, createdAt: '2026-10-01T10:00:00Z', mode: 'orchestration', trigger: 'initial_signout', createdBy: { userId: 'u1', userName: 'Dr Signer' }, pdfSha256: SHA, ...o });
const api = (fetchFn: unknown) => createHttpReportVersionApi({ baseUrl: 'https://api.example/', fetch: fetchFn as typeof fetch, accessToken: async () => 'tok' });

describe('report versions through the API (Batch 558)', () => {
  it('lists a case\'s versions with the bearer token; rows the screen can\'t use are dropped and bytes never come with the list', async () => {
    const fetchFn = vi.fn(async () => json([row(), row({ id: 'ver-2', versionNumber: 2, pdfBase64: PDF, pdfSha256: 'not-a-hash' }), row({ id: '' }), row({ caseId: 'C2' }), row({ versionNumber: 0 }), row({ createdBy: null }), 'junk']));
    const r = await api(fetchFn).listByCase('C1');
    expect(fetchFn).toHaveBeenCalledWith('https://api.example/api/cases/C1/report-versions', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }));
    expect(r.ok && r.data.map(v => [v.id, v.pdfBase64, v.pdfSha256])).toEqual([['ver-1', undefined, SHA], ['ver-2', undefined, undefined]]);
  });

  it('reads one version\'s PDF with its purpose, checking the bytes against the hash header', async () => {
    const fetchFn = vi.fn(async () => pdfResponse({ 'X-Content-SHA256': SHA.toUpperCase() }));
    expect(await api(fetchFn).readPdf('C/1', 2, 'view')).toEqual({ ok: true, data: { pdfBase64: PDF, sha256: SHA } });
    expect(fetchFn).toHaveBeenCalledWith('https://api.example/api/cases/C%2F1/report-versions/2/pdf?purpose=view', expect.anything());
  });

  it('refuses changed bytes, says unavailable with no hash header (CORS) or an empty body, and maps refusals', async () => {
    expect(await api(async () => pdfResponse({ 'X-Content-SHA256': 'f'.repeat(64) })).readPdf('C1', 1, 'send')).toEqual({ ok: false, error: 'integrity' });
    expect(await api(async () => pdfResponse({})).readPdf('C1', 1, 'send')).toEqual({ ok: false, error: 'unavailable' });
    expect(await api(async () => pdfResponse({ 'X-Content-SHA256': SHA }, new Uint8Array())).readPdf('C1', 1, 'send')).toEqual({ ok: false, error: 'empty' });
    expect(await api(async () => json({ code: 'DOCUMENT_INTEGRITY' }, 409)).readPdf('C1', 1, 'send')).toEqual({ ok: false, error: 'integrity' });
    expect(await api(async () => { throw new Error('offline'); }).readPdf('C1', 1, 'send')).toEqual({ ok: false, error: 'unavailable' });
    expect([reportVersionHttpError(404), reportVersionHttpError(403), reportVersionHttpError(401), reportVersionHttpError(500)]).toEqual(['notFound', 'notPermitted', 'notPermitted', 'unavailable']);
  });

  it('keeps only the fields the browser uses, each in its shape', () => {
    const [v] = normaliseServerVersions([row({ patientEncounterSnapshot: { mrn: 'x' }, organMapFigures: [{ instanceId: 'I1' }], synopticAnswersSnapshot: 'text', extra: 'dropped', instanceId: 'I1' })], 'C1') ?? [];
    expect(v).toEqual(expect.objectContaining({ id: 'ver-1', instanceId: 'I1', pdfSha256: SHA }));
    expect(v).not.toHaveProperty('patientEncounterSnapshot');
    expect(v).not.toHaveProperty('organMapFigures');
    expect(v).not.toHaveProperty('synopticAnswersSnapshot');
    expect(v).not.toHaveProperty('extra');
    const [w] = normaliseServerVersions([row({ patientEncounterSnapshot: { patientId: 'p', mrn: 'm', firstName: 'A', lastName: 'B', capturedAt: '' } })], 'C1') ?? [];
    expect(w.patientEncounterSnapshot).toMatchObject({ lastName: 'B' });
  });

  it('a list that isn\'t an array is not read', () => {
    expect(normaliseServerVersions({ versions: [] }, 'C1')).toBeNull();
    expect(normaliseServerVersions([row({ mode: 'other', trigger: 'other' })], 'C1')?.[0]).toMatchObject({ mode: 'orchestration', trigger: 'initial_signout' });
  });
});

describe('this browser\'s versions and the server\'s, together (Batch 558)', () => {
  const local = (list: ReportVersionRecord[]): IReportVersionService => ({
    getByCaseId: vi.fn(async () => ({ ok: true as const, data: list })),
    create: vi.fn(async r => ({ ok: true as const, data: { ...r, id: 'new', versionNumber: 9, createdAt: '' } as ReportVersionRecord })),
  });
  const mine = { ...row({ id: 'ver-2', versionNumber: 2, pdfBase64: PDF }) } as unknown as ReportVersionRecord;

  it('lists both by version number, each once (the one signed here, with its PDF, wins), and keeps new versions here', async () => {
    const here = local([mine]);
    const svc = createServerBackedReportVersionService(here, { listByCase: async () => ({ ok: true, data: [row({ id: 'ver-2', versionNumber: 2 }), row()] as unknown as ReportVersionRecord[] }) });
    const r = await svc.getByCaseId('C1');
    expect(r.ok && r.data.map(v => [v.id, !!v.pdfBase64])).toEqual([['ver-1', false], ['ver-2', true]]);
    expect(r.ok && r.meta).toBeUndefined();
    await svc.create({ caseId: 'C1' } as never);
    // Numbered after the server's versions too (and CORRECTED vs ADDENDUM decided with them).
    expect(here.create).toHaveBeenCalledWith({ caseId: 'C1' }, { priorVersions: [expect.objectContaining({ id: 'ver-2' }), expect.objectContaining({ id: 'ver-1' })] });
  });

  it('still saves a version when the server\'s list can\'t be read (a sign-out is never lost)', async () => {
    const here = local([]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await createServerBackedReportVersionService(here, { listByCase: async () => ({ ok: false, error: 'unavailable' }) }).create({ caseId: 'C1' } as never);
    expect(here.create).toHaveBeenCalledWith({ caseId: 'C1' }, { priorVersions: [] });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('two versions with the same number: the one signed here is listed last (the newest)', async () => {
    const svc = createServerBackedReportVersionService(local([mine]), { listByCase: async () => ({ ok: true, data: [row({ id: 'srv-2', versionNumber: 2 })] as unknown as ReportVersionRecord[] }) });
    const r = await svc.getByCaseId('C1');
    expect(r.ok && r.data.map(v => v.id)).toEqual(['srv-2', 'ver-2']);
  });

  it('says the list may be incomplete when the server\'s can\'t be read', async () => {
    const svc = createServerBackedReportVersionService(local([mine]), { listByCase: async () => ({ ok: false, error: 'unavailable' }) });
    expect(await svc.getByCaseId('C1')).toEqual({ ok: true, data: [mine], meta: { partial: true } });
  });

  it('Batch 559: the list is marked partial when this browser\'s versions couldn\'t be read either', async () => {
    const broken: IReportVersionService = { getByCaseId: async () => ({ ok: false, error: 'storage' }), create: vi.fn() };
    const svc = createServerBackedReportVersionService(broken, { listByCase: async () => ({ ok: true, data: [row()] as unknown as ReportVersionRecord[] }) });
    const r = await svc.getByCaseId('C1');
    expect(r.ok && r.meta).toEqual({ partial: true });
  });
});
