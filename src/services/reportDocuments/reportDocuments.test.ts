// Batch 538 (Pete, Oct 12, 2026: the browser only shows previews, "as long as the preview matches
// exactly what gets sent out"): a released report is one stored document, with its SHA-256, and
// every channel and every retry sends those bytes.
import { describe, it, expect, vi } from 'vitest';
import { pdfSha256, base64ToBytes, shortHash, type ReportDocument } from './reportDocuments';
import { createReportDocumentService, captureReleaseDocument, documentPdf } from './reportDocumentService';
import { sha256Hex, sha256HexBytes } from '../registrySubmission/sha256';
import { releaseDocument } from '../reports/publishReportReleasedEvent';
import { resolveOruReportPdf } from '../reports/resolveOruReportPdf';
import { buildReportDeliveryPayload, sendReportDelivery, type ReportDeliveryDeps } from '../delivery/deliverReport';
import { releaseReport, releaseDueReports, type ReleaseReportDeps } from '../reportRelease/releaseReport';
import type { HeldRelease } from '@/types/reportRelease/HeldRelease';
import type { ReportDeliveryQueueEntry } from '@/types/delivery/ReportDeliveryQueueEntry';

// "%PDF-1.4 test" as base64, and a second, different document.
const PDF_A = btoa('%PDF-1.4 report A');
const PDF_B = btoa('%PDF-1.4 report B (a later correction)');

function memoryDocuments(opts: { failWrites?: boolean; failIndex?: boolean } = {}) {
  let index: Record<string, ReportDocument & { pdfBase64?: string }> | null = null;
  const bytes = new Map<string, string>();
  let n = 0;
  const svc = createReportDocumentService({
    readIndex: () => index,
    writeIndex: all => { if (opts.failWrites || opts.failIndex) return false; index = all; return true; },
    readBytes: id => bytes.get(id) ?? null,
    writeBytes: (id, b) => { if (opts.failWrites) return false; bytes.set(id, b); return true; },
    removeBytes: id => { bytes.delete(id); },
    now: () => new Date('2026-10-12T20:00:00.000Z'),
    newId: () => String(++n),
  });
  return { svc, raw: () => index, bytes };
}

const meta = { caseId: 'C1', reportType: 'CORRECTED' as const, source: 'SURGPATH' as const, instanceId: 'INST-1', releasedAt: '2026-10-12T20:00:00.000Z' };

describe('the hash', () => {
  it('is SHA-256 over the PDF bytes (what sha256sum prints), not over the base64 text', () => {
    expect(sha256HexBytes(new TextEncoder().encode('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(pdfSha256(btoa('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(pdfSha256(btoa('abc'))).not.toBe(sha256Hex(btoa('abc')));
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(base64ToBytes(btoa('%PDF')).length).toBe(4);
    expect(shortHash('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')).toBe('ba7816bf…15ad');
  });
});

describe('the document store: write once, read many, checked', () => {
  it('stores the bytes with their hash and size; reads them back checked; lists by case', async () => {
    const { svc } = memoryDocuments();
    const stored = await svc.store({ ...meta, pdfBase64: PDF_A, producedBy: 'report-renderer' });
    expect(stored.ok && stored.data).toMatchObject({ id: 'rdoc-1', sha256: pdfSha256(PDF_A), byteLength: '%PDF-1.4 report A'.length, producedBy: 'report-renderer' });
    expect(stored.ok && 'pdfBase64' in stored.data).toBe(false);
    const read = await svc.read('rdoc-1');
    expect(read.ok && read.data.pdfBase64).toBe(PDF_A);
    expect((await svc.listByCase('C1')).ok).toBe(true);
    expect(await svc.read('nope')).toEqual({ ok: false, error: 'notFound' });
    expect(await svc.store({ ...meta, pdfBase64: '', producedBy: 'report-renderer' })).toEqual({ ok: false, error: 'empty' });
  });

  it('a document whose bytes no longer match its hash is refused, never sent', async () => {
    const { svc, bytes } = memoryDocuments();
    await svc.store({ ...meta, pdfBase64: PDF_A, producedBy: 'report-renderer' });
    bytes.set('rdoc-1', PDF_B); // tampered
    expect(await svc.read('rdoc-1')).toEqual({ ok: false, error: 'integrity' });
    const pdf = await documentPdf('rdoc-1', svc)();
    expect(pdf.pdfBase64).toBeUndefined();
    expect(pdf.generationError).toContain('integrity');
  });

  it('Batch 549: each document\'s bytes are kept on their own; the list holds records only', async () => {
    const { svc, raw, bytes } = memoryDocuments();
    await svc.store({ ...meta, pdfBase64: PDF_A, producedBy: 'report-renderer' });
    await svc.store({ ...meta, pdfBase64: PDF_B, producedBy: 'report-renderer' });
    expect(bytes.get('rdoc-1')).toBe(PDF_A);
    expect(bytes.get('rdoc-2')).toBe(PDF_B);
    expect(Object.values(raw()!).some(d => 'pdfBase64' in d)).toBe(false);
  });

  it('Batch 549: a document stored before, with its bytes in the list, is still read and checked', async () => {
    const { svc, raw } = memoryDocuments();
    await svc.store({ ...meta, pdfBase64: PDF_A, producedBy: 'report-renderer' });
    raw()!['rdoc-old'] = { ...raw()!['rdoc-1'], id: 'rdoc-old', pdfBase64: PDF_A };
    const read = await svc.read('rdoc-old');
    expect(read.ok && read.data.pdfBase64).toBe(PDF_A);
  });

  it('Batch 549: a record whose bytes are gone says so, rather than reporting a changed document', async () => {
    const { svc, bytes } = memoryDocuments();
    await svc.store({ ...meta, pdfBase64: PDF_A, producedBy: 'report-renderer' });
    bytes.delete('rdoc-1');
    expect(await svc.read('rdoc-1')).toEqual({ ok: false, error: 'bytesMissing' });
    expect((await documentPdf('rdoc-1', svc)()).generationError).toContain('missing');
  });

  it('Batch 549: when the record can\'t be saved, the bytes are removed and the store says notSaved', async () => {
    const { svc, bytes } = memoryDocuments({ failIndex: true });
    expect(await svc.store({ ...meta, pdfBase64: PDF_A, producedBy: 'report-renderer' })).toEqual({ ok: false, error: 'notSaved' });
    expect(bytes.size).toBe(0);
  });

  it('there is no way to change or delete a document', () => {
    const { svc } = memoryDocuments();
    expect(Object.keys(svc).sort()).toEqual(['listByCase', 'read', 'store']);
  });
});

describe('captureReleaseDocument: one PDF per release, stored once, the same bytes for every channel', () => {
  it('renders once however many channels ask, and gives each the document id and hash', async () => {
    const { svc } = memoryDocuments();
    const generate = vi.fn(async () => ({ pdfBase64: PDF_A }));
    const pdf = captureReleaseDocument(generate, { ...meta, producedBy: 'report-renderer' }, svc)!;
    const [a, b, c] = await Promise.all([pdf(), pdf(), pdf()]);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ pdfBase64: PDF_A, documentId: 'rdoc-1', sha256: pdfSha256(PDF_A), producedBy: 'report-renderer' });
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    const listed = await svc.listByCase('C1');
    expect(listed.ok ? listed.data : []).toHaveLength(1);
  });

  it('a PDF that can\'t be made gives every channel the same reason; one that can\'t be stored still goes, without an id', async () => {
    const { svc } = memoryDocuments();
    expect(await captureReleaseDocument(async () => ({ generationError: 'renderer down' }), { ...meta, producedBy: 'report-renderer' }, svc)!()).toEqual({ generationError: 'renderer down' });
    expect((await captureReleaseDocument(vi.fn() as never, { ...meta, producedBy: 'report-renderer' }, svc)!()).generationError).toBeTruthy();
    const full = memoryDocuments({ failWrites: true });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await captureReleaseDocument(async () => ({ pdfBase64: PDF_A }), { ...meta, producedBy: 'report-renderer' }, full.svc)!()).toEqual({ pdfBase64: PDF_A });
    errSpy.mockRestore();
    expect(captureReleaseDocument(undefined, { ...meta, producedBy: 'report-renderer' }, svc)).toBeUndefined();
  });
});

describe('releaseDocument (the release event)', () => {
  it('a release with its own PDF is stored as made by the renderer; one without uses the saved signed PDF; a held one reuses its document', async () => {
    const { svc } = memoryDocuments();
    const own = await releaseDocument({ caseId: 'C1', reportType: 'FINAL', releasedAt: 'T', generatePdf: async () => ({ pdfBase64: PDF_A }) }, svc)!();
    expect(own).toMatchObject({ documentId: 'rdoc-1', producedBy: 'report-renderer' });
    const cyto = await releaseDocument({ caseId: 'C1', reportType: 'FINAL', releasedAt: 'T', source: 'CYTOLOGY', generatePdf: async () => ({ pdfBase64: PDF_B }) }, svc)!();
    expect(cyto).toMatchObject({ producedBy: 'report-renderer' }); // Batch 539: the renderer makes cytology too
    expect(cyto).toMatchObject({ documentId: 'rdoc-2' });
    expect(releaseDocument({ caseId: 'C1', reportType: 'FINAL', releasedAt: 'T', source: 'CYTOLOGY' }, svc)).toBeUndefined();
    const held = await releaseDocument({ caseId: 'C1', reportType: 'FINAL', releasedAt: 'T', documentId: 'rdoc-1' }, svc)!();
    expect(held).toEqual({ pdfBase64: PDF_A, documentId: 'rdoc-1', sha256: pdfSha256(PDF_A), producedBy: 'report-renderer' });
  });
});

describe('every channel and every retry sends the release\'s document', () => {
  it('result message (ORU): a retry with the entry\'s document sends it, even after a later correction of the same instance', async () => {
    const { svc } = memoryDocuments();
    const first = await svc.store({ ...meta, pdfBase64: PDF_A, producedBy: 'report-renderer' });
    const kept = new Map<string, string>([['C1|INST-1|CORRECTED', PDF_B]]); // the later correction, kept for the instance
    const deps = {
      versions: { getByCaseId: async () => ({ ok: true as const, data: [] }) },
      store: { get: async (c: string, i: string, s: string) => kept.get(`${c}|${i}|${s}`), put: async () => {} },
      documents: svc,
    };
    const retry = await resolveOruReportPdf({ caseId: 'C1', instanceId: 'INST-1', resultState: 'CORRECTED', documentId: first.ok ? first.data.id : '' }, deps);
    expect(retry).toMatchObject({ ok: true, pdfBase64: PDF_A, source: 'document', documentId: 'rdoc-1' });
    const fresh = await resolveOruReportPdf({ caseId: 'C1', instanceId: 'INST-1', resultState: 'CORRECTED', generatePdf: async () => ({ pdfBase64: PDF_A, documentId: 'rdoc-1', sha256: 'h' }) }, deps);
    expect(fresh).toMatchObject({ ok: true, source: 'release', documentId: 'rdoc-1', sha256: 'h' });
  });

  it('e-fax / file drop: a resend of a correction sends the correction, not the newest signed PDF; the payload and the entry carry the hash', async () => {
    const { svc } = memoryDocuments();
    const doc = await svc.store({ ...meta, pdfBase64: PDF_A, producedBy: 'report-renderer' });
    const entry: ReportDeliveryQueueEntry = {
      id: 'q1', caseId: 'C1', accession: 'S26-1', reportType: 'CORRECTED', source: 'SURGPATH', channel: 'FILE_DROP', role: 'primary',
      releasedAt: 'T', documentName: 'S26-1.pdf', metadata: {}, fileDrop: { targetId: 't' }, status: 'FAILED', queuedAt: 'T', retryCount: 1, maxRetriesExceeded: false,
      release: { documentId: doc.ok ? doc.data.id : '' },
    };
    const markSent = vi.fn(async () => ({ ok: true as const, data: entry }));
    const deps = {
      getCase: async () => undefined, getPhysician: async () => undefined, getFacility: async () => undefined,
      reportPdf: () => async () => ({ pdfBase64: PDF_B }), // the case's newest signed PDF: must not be used
      documentPdf: (id: string) => documentPdf(id, svc),
      queue: { markSent, markFailed: vi.fn() } as never,
      send: vi.fn(async () => ({ ok: true })),
    } as unknown as ReportDeliveryDeps;
    const built = await buildReportDeliveryPayload(entry, deps);
    expect('payload' in built && built.payload).toMatchObject({ pdfBase64: PDF_A, reportDocumentId: 'rdoc-1', pdfSha256: pdfSha256(PDF_A) });
    expect(await sendReportDelivery(entry, deps)).toBe('sent');
    expect(markSent).toHaveBeenCalledWith('q1', { pdfSha256: pdfSha256(PDF_A) });
  });

  it('a preliminary\'s e-fax retry is no longer held for good: it has its document', async () => {
    const { svc } = memoryDocuments();
    const doc = await svc.store({ ...meta, reportType: 'PRELIMINARY', pdfBase64: PDF_A, producedBy: 'report-renderer' });
    const entry = { id: 'q2', caseId: 'C1', reportType: 'PRELIMINARY', source: 'SURGPATH', channel: 'FILE_DROP', fileDrop: { targetId: 't' }, documentName: 'x.pdf', metadata: {}, releasedAt: 'T', release: { documentId: doc.ok ? doc.data.id : '' } } as unknown as ReportDeliveryQueueEntry;
    const deps = { reportPdf: () => undefined, documentPdf: (id: string) => documentPdf(id, svc), queue: {} } as unknown as ReportDeliveryDeps;
    expect('payload' in await buildReportDeliveryPayload(entry, deps)).toBe(true);
  });

  it('held for the release delay: the held bytes are what is published (and stored) when the delay ends; nothing is stored for a recall', async () => {
    const { svc } = memoryDocuments();
    const rows: HeldRelease[] = [];
    const published: unknown[] = [];
    let now = new Date('2026-10-12T20:00:00.000Z');
    const deps: ReleaseReportDeps = {
      resolveDelay: async () => ({ applies: true, durationMinutes: 10 }),
      held: {
        add: async h => { rows.push(h); return { ok: true, data: h }; },
        getAll: async () => ({ ok: true, data: rows }),
        getByCaseId: async id => ({ ok: true, data: rows.filter(r => r.caseId === id) }),
        settle: async (id, status) => { const r = rows.find(x => x.id === id)!; if (r.status !== 'held') return false; r.status = status; return true; },
      },
      // The real publisher's first step: the release document from the event.
      publish: vi.fn(async event => { published.push(await releaseDocument(event, svc)!()); return {}; }),
      runFollowUp: vi.fn(), reopen: vi.fn(), audit: vi.fn(async () => undefined), releaseSignOut: vi.fn(),
      now: () => now, newId: () => 'h1', enforce: async () => ({ allowed: true }),
    };
    await releaseReport({ caseId: 'C1', reportType: 'ADDENDUM', releasedAt: '2026-10-12T20:00:00.000Z', instanceId: 'INST-1', generatePdf: async () => ({ pdfBase64: PDF_A }) },
      { kind: 'surgical-amendment', releasedBy: { userId: 'P1', userName: 'Dr P' } }, deps);
    expect(rows[0].pdfBase64).toBe(PDF_A);
    const before = await svc.listByCase('C1');
    expect(before.ok ? before.data : null).toEqual([]);
    now = new Date('2026-10-12T20:11:00.000Z');
    await releaseDueReports(deps);
    expect(published[0]).toMatchObject({ pdfBase64: PDF_A, documentId: 'rdoc-1', sha256: pdfSha256(PDF_A) });
  });
});
