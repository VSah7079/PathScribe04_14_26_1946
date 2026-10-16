// src/services/reportDocuments/httpReportDocumentService.test.ts (Batch 556)
import { describe, it, expect, vi } from 'vitest';
import { createHttpReportDocumentApi, createServerBackedReportDocumentService, reportDocumentHttpError } from './httpReportDocumentService';
import { createReportDocumentService, documentPdf, sentDocumentProblem } from './reportDocumentService';
import { pdfSha256, type ReportDocument } from './reportDocuments';

const PDF = btoa('%PDF-1.7 sent bytes');
const SHA = pdfSha256(PDF);
const bytes = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const pdfResponse = (headers: Record<string, string>, body = bytes(PDF)) => new Response(body, { status: 200, headers: { 'Content-Type': 'application/pdf', ...headers } });
const doc = (id: string, createdAt: string): ReportDocument => ({
  id, caseId: 'C1', reportType: 'FINAL', source: 'SURGPATH', releasedAt: createdAt, producedBy: 'report-renderer', sha256: SHA, byteLength: 10, createdAt,
});
const memoryLocal = () => {
  const index: Record<string, ReportDocument> = {};
  const blobs: Record<string, string> = {};
  let n = 0;
  return createReportDocumentService({
    readIndex: () => index, writeIndex: all => { Object.assign(index, all); return true; },
    readBytes: id => blobs[id] ?? null, writeBytes: (id, b) => { blobs[id] = b; return true; }, removeBytes: id => { delete blobs[id]; },
    now: () => new Date('2026-10-14T10:00:00Z'), newId: () => `n${++n}`,
  });
};

describe('reading report documents through the API (Batch 556)', () => {
  it('reads a document, checks its SHA-256 against the server\'s header and the id it asked for', async () => {
    const fetchFn = vi.fn(async () => pdfResponse({ 'X-Content-SHA256': SHA.toUpperCase(), 'X-Report-Document-Id': 'rdoc-1', 'X-Case-Id': 'C1', 'X-Report-Type': 'CORRECTED' }));
    const api = createHttpReportDocumentApi({ baseUrl: 'https://api.example/', fetch: fetchFn as never, accessToken: async () => 't' });
    const r = await api.read('rdoc-1');
    expect(r.ok && [r.data.pdfBase64, r.data.document.sha256, r.data.document.caseId, r.data.document.reportType]).toEqual([PDF, SHA, 'C1', 'CORRECTED']);
    const [url, init] = (fetchFn.mock.calls[0] as unknown) as [string, RequestInit];
    expect(url).toBe('https://api.example/api/report-documents/rdoc-1');
    expect(r.ok && r.data.document.byteLength).toBe(bytes(PDF).length);
    await api.read('rdoc-1', 'send');
    expect(((fetchFn.mock.calls[1] as unknown) as [string])[0]).toBe('https://api.example/api/report-documents/rdoc-1?purpose=send');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer t');
  });

  it('refuses a document whose bytes don\'t match the server\'s hash, has no hash, or is another document', async () => {
    const api = (headers: Record<string, string>) => createHttpReportDocumentApi({ baseUrl: 'https://a', fetch: (async () => pdfResponse(headers)) as never, accessToken: async () => '' });
    expect(await api({ 'X-Content-SHA256': '0'.repeat(64) }).read('rdoc-1')).toEqual({ ok: false, error: 'integrity' });
    expect(await api({}).read('rdoc-1')).toEqual({ ok: false, error: 'unavailable' }); // no hash header: misconfigured (e.g. not exposed to the browser), not tampered
    expect(await api({ 'X-Content-SHA256': SHA, 'X-Report-Document-Id': 'rdoc-2' }).read('rdoc-1')).toEqual({ ok: false, error: 'integrity' });
  });

  it('maps the server\'s answers, and a network failure, to the store\'s errors', async () => {
    expect([[409], [404], [401], [403], [500], [400, 'DOCUMENT_INTEGRITY']].map(([s, c]) => reportDocumentHttpError(s as number, c))).toEqual(['integrity', 'notFound', 'notPermitted', 'notPermitted', 'unavailable', 'integrity']);
    const down = createHttpReportDocumentApi({ baseUrl: 'https://a', fetch: (async () => { throw new Error('offline'); }) as never, accessToken: async () => '' });
    expect(await down.read('x')).toEqual({ ok: false, error: 'unavailable' });
    expect(await down.listByCase('C1')).toEqual({ ok: false, error: 'unavailable' });
    const list = createHttpReportDocumentApi({ baseUrl: 'https://a', fetch: (async () => new Response(JSON.stringify([doc('s1', '2026-10-01')]), { status: 200 })) as never, accessToken: async () => '' });
    expect(await list.listByCase('C 1')).toEqual({ ok: true, data: [doc('s1', '2026-10-01')] });
    expect(sentDocumentProblem('bytesMissing')).toBe('notFound');
    expect(sentDocumentProblem('unavailable')).toBe('unavailable');
  });

  it("this browser's documents are read here first, the rest from the server; the list has both, once each, oldest first", async () => {
    const local = memoryLocal();
    const stored = await local.store({ pdfBase64: PDF, caseId: 'C1', reportType: 'FINAL', source: 'SURGPATH', releasedAt: '2026-10-14T10:00:00Z', producedBy: 'report-renderer' });
    if (!stored.ok) throw new Error('setup');
    const server = {
      read: vi.fn(async (id: string) => ({ ok: true as const, data: { document: doc(id, '2026-10-01'), pdfBase64: PDF } })),
      listByCase: vi.fn(async () => ({ ok: true as const, data: [doc('s1', '2026-10-01T00:00:00Z'), { ...stored.data }] })),
    };
    const svc = createServerBackedReportDocumentService(local, server);
    expect((await svc.read(stored.data.id)).ok).toBe(true);
    expect(server.read).not.toHaveBeenCalled();
    expect((await svc.read('s1')).ok).toBe(true);
    expect(server.read).toHaveBeenCalledWith('s1', undefined);
    const listed = await svc.listByCase('C1');
    expect(listed.ok && listed.data.map(d => d.id)).toEqual(['s1', stored.data.id]);
    // A retry or fallback sends the server's stored document too.
    expect((await documentPdf('s1', svc)()).pdfBase64).toBe(PDF);
  });

  it("when the server's list can't be read, this browser's is shown and marked incomplete; a failed read is never replaced", async () => {
    const local = memoryLocal();
    const server = { read: vi.fn(async () => ({ ok: false as const, error: 'unavailable' })), listByCase: vi.fn(async () => ({ ok: false as const, error: 'unavailable' })) };
    const svc = createServerBackedReportDocumentService(local, server);
    expect(await svc.listByCase('C1')).toEqual({ ok: true, data: [], meta: { partial: true } });
    expect(await svc.read('s9')).toEqual({ ok: false, error: 'unavailable' });
    const failed = await documentPdf('s9', svc)();
    expect([failed.documentError, failed.generationError]).toEqual(['unavailable', expect.stringContaining('did not answer')]);
    // The cytology case report never prints a fresh render or an older document when the server's list is missing.
    const { releasedCytologyCaseDocument } = await import('../cytology/cytologyCaseReportForPrint');
    await expect(releasedCytologyCaseDocument('C1', svc)).rejects.toThrow(/did not answer/);
    expect(await svc.store({ pdfBase64: PDF, caseId: 'C1', reportType: 'FINAL', source: 'SURGPATH', releasedAt: 'x', producedBy: 'report-renderer' })).toMatchObject({ ok: true });
  });
});
