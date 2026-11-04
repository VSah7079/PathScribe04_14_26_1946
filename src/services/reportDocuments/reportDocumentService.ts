// src/services/reportDocuments/reportDocumentService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 538: the store of released report documents (reportDocuments.ts).
// Write once, read many: there is no update and no delete. Reading checks the
// bytes against the stored SHA-256, so a document that has changed is refused
// ('integrity') rather than sent.
//
// In production the API server keeps the bytes in blob storage and the record
// in SQL, written in the same transaction as the release
// (docs/architecture/REPORT_DOCUMENT_STORE_API.md). Dependencies are passed in.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import { pdfSha256, base64ToBytes, type ReportDocument, type ReportDocumentProducer, type ReportDocumentSource, type ReportDocumentType, type ReportPdf, type StoredReportDocument } from './reportDocuments';

export interface NewReportDocument {
  pdfBase64: string;
  caseId: string;
  reportType: ReportDocumentType;
  source: ReportDocumentSource;
  instanceId?: string;
  releasedAt: string;
  producedBy: ReportDocumentProducer;
}

/** Batch 549: 'bytesMissing', a record whose bytes are gone (storage cleared), told apart from a changed document.
 *  Batch 556: 'notPermitted' and 'unavailable', from the API server (httpReportDocumentService.ts). */
export type ReportDocumentError = 'notFound' | 'integrity' | 'empty' | 'notSaved' | 'bytesMissing' | 'notPermitted' | 'unavailable';

export type ReportDocumentReadPurpose = 'view' | 'send';

export interface IReportDocumentService {
  store(input: NewReportDocument): Promise<ServiceResult<ReportDocument>>;
  /** The document and its bytes, checked against the stored hash.
   *  Batch 556: `purpose` tells the API server whether a person is viewing it ('view', audited as
   *  DOCUMENT_RENDERED) or a channel is sending it ('send', recorded with the channel's own audit). */
  read(id: string, purpose?: ReportDocumentReadPurpose): Promise<ServiceResult<{ document: ReportDocument; pdfBase64: string }>>;
  listByCase(caseId: string): Promise<ServiceResult<ReportDocument[]>>;
}

/**
 * Batch 549 (open since Batch 538): the list of documents and each document's
 * bytes are kept apart, so storing a document writes its own bytes and the
 * small list, not every document again. Older entries kept their bytes in the
 * list; they are still read from there.
 */
export interface ReportDocumentDeps {
  /** Every document's record (no bytes; an older entry may still carry them). */
  readIndex(): Record<string, ReportDocument & { pdfBase64?: string }> | null;
  writeIndex(all: Record<string, ReportDocument & { pdfBase64?: string }>): boolean;
  readBytes(id: string): string | null;
  /** False when the bytes couldn't be kept (browser storage full). */
  writeBytes(id: string, pdfBase64: string): boolean;
  /** Removes bytes whose record couldn't be saved, so nothing is left without a record. */
  removeBytes(id: string): void;
  now(): Date;
  newId(): string;
}

const fail = <T>(error: ReportDocumentError): ServiceResult<T> => ({ ok: false, error });
const meta = ({ pdfBase64: _bytes, ...doc }: ReportDocument & { pdfBase64?: string }): ReportDocument => doc;

export function createReportDocumentService(deps: ReportDocumentDeps): IReportDocumentService {
  const all = () => deps.readIndex() ?? {};
  return {
    async store(input) {
      if (!input.pdfBase64) return fail('empty');
      const doc: StoredReportDocument = {
        id: `rdoc-${deps.newId()}`, caseId: input.caseId, reportType: input.reportType, source: input.source,
        ...(input.instanceId ? { instanceId: input.instanceId } : {}),
        releasedAt: input.releasedAt, producedBy: input.producedBy,
        sha256: pdfSha256(input.pdfBase64), byteLength: base64ToBytes(input.pdfBase64).length,
        createdAt: deps.now().toISOString(), pdfBase64: input.pdfBase64,
      };
      if (!deps.writeBytes(doc.id, doc.pdfBase64)) return fail('notSaved');
      if (!deps.writeIndex({ ...all(), [doc.id]: meta(doc) })) { deps.removeBytes(doc.id); return fail('notSaved'); }
      return { ok: true, data: meta(doc) };
    },
    async read(id) {
      const doc = all()[id];
      if (!doc) return fail('notFound');
      const bytes = doc.pdfBase64 ?? deps.readBytes(id);
      if (!bytes) return fail('bytesMissing');
      if (pdfSha256(bytes) !== doc.sha256) return fail('integrity');
      return { ok: true, data: { document: meta(doc), pdfBase64: bytes } };
    },
    async listByCase(caseId) {
      return { ok: true, data: Object.values(all()).filter(d => d.caseId === caseId).map(meta).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) };
    },
  };
}

export type GenerateReportDocumentPdf = () => Promise<ReportPdf>;

/**
 * A release's PDF, made once and stored as its report document. Every channel
 * that calls the returned function gets the same bytes, with the document's id
 * and hash. When the PDF can't be made, every caller gets the same error; when
 * it can't be stored, the bytes still go (without an id) and the error is
 * logged, so a release is never held up by the store.
 */
export function captureReleaseDocument(
  generate: GenerateReportDocumentPdf | undefined,
  meta: Omit<NewReportDocument, 'pdfBase64' | 'producedBy'> & { producedBy: ReportDocumentProducer },
  documents: Pick<IReportDocumentService, 'store'>,
): GenerateReportDocumentPdf | undefined {
  if (!generate) return undefined;
  let result: Promise<ReportPdf> | undefined;
  return () => (result ??= (async () => {
    let made: ReportPdf;
    try {
      made = (await generate()) ?? { generationError: 'the PDF generator returned nothing' };
    } catch (e) {
      made = { generationError: e instanceof Error ? e.message : String(e) };
    }
    if (!made.pdfBase64) return made;
    if (made.documentId) return made; // already a stored document (a held release)
    const stored = await documents.store({ ...meta, producedBy: made.producedBy ?? meta.producedBy, pdfBase64: made.pdfBase64 }).catch(() => null);
    if (!stored?.ok) {
      console.error('[reportDocuments] The release document was not stored; sending without a document id.');
      return made;
    }
    return { pdfBase64: made.pdfBase64, documentId: stored.data.id, sha256: stored.data.sha256, producedBy: stored.data.producedBy };
  })());
}

/** A stored document as a channel's PDF (a retry, a fallback, the end of a hold). */
export function documentPdf(documentId: string, documents: Pick<IReportDocumentService, 'read'>): GenerateReportDocumentPdf {
  return async () => {
    // A failure keeps the document's id, so no caller falls back to some other PDF in its place.
    const res = await documents.read(documentId, 'send').catch(() => null);
    if (!res) return { documentId, documentError: 'unavailable', generationError: 'the stored report document could not be read' };
    if (res.ok === false) {
      return { documentId, documentError: res.error, generationError: res.error === 'integrity' ? 'the stored report document failed its integrity check (SHA-256 mismatch); it is not sent'
        : res.error === 'bytesMissing' ? 'the stored report document\'s content is missing (its storage was cleared); it is not sent'
        : res.error === 'notPermitted' ? 'the stored report document could not be read: not permitted'
        : res.error === 'unavailable' ? 'the stored report document could not be read: the PathScribe server did not answer'
        : 'the stored report document was not found' };
    }
    return { pdfBase64: res.data.pdfBase64, documentId, sha256: res.data.document.sha256, producedBy: res.data.document.producedBy };
  };
}

/** Batch 556: what the screen says when a sent document can't be opened. */
export type SentDocumentProblem = 'integrity' | 'notFound' | 'notPermitted' | 'unavailable';
export function sentDocumentProblem(error: string): SentDocumentProblem {
  return error === 'integrity' || error === 'notPermitted' || error === 'unavailable' ? error : 'notFound';
}
