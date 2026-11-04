// src/services/reports/resolveOruReportPdf.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 392 (Pete: every report's PDF goes to the interface engine with its
// JSON; if it isn't available, hold and retry). Which PDF a surgical,
// preliminary or autopsy ORU^R01 result carries:
//
//   1. the PDF made at release (the same one printing gets), which is kept
//      (releasedReportPdfStore) so a retry sends the same document;
//   2. on a retry, that kept PDF;
//   3. otherwise the signed PDF saved with the case's report versions: for a
//      correction or addendum the latest version of that instance, for a final
//      the latest version of that instance or of the whole case. This is what a
//      release after the hold period (no one on the page) sends.
//
// A preliminary has no report version, so only 1 and 2 apply to it. None of
// them: not available, with the reason (the render error, if there was one).
//
// Batch 558: a saved version's PDF is read through reportVersionPdf.ts, so it
// is checked against the version's SHA-256 and, for a version the API server
// holds, read through the API. A PDF that fails its check holds the result.
// Cytology builds its own PDF from its stored report (cytology/).
// ─────────────────────────────────────────────────────────────────────────────

import type { OruResultState } from '@/types/case/OutboundResultQueueEntry';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';
import type { IReportVersionService } from './IReportVersionService';
import { versionHasPdf, versionPdfErrorText, type IReportVersionPdfReader } from './reportVersionPdf';
import { mockReleasedReportPdfStore, type IReleasedReportPdfStore } from './releasedReportPdfStore';
import type { ReportPdf } from '../reportDocuments/reportDocuments';
import { documentPdf, type IReportDocumentService } from '../reportDocuments/reportDocumentService';

/** Batch 538: a release's PDF; once stored as a report document it carries the document's id and SHA-256. */
export type GenerateReportPdf = () => Promise<ReportPdf>;

/** One render per release, however many results and printing ask for it. */
export function generateOnce(generate: GenerateReportPdf | undefined): GenerateReportPdf | undefined {
  if (!generate) return undefined;
  let result: ReturnType<GenerateReportPdf> | undefined;
  return () => (result ??= generate().catch(e => ({ generationError: e instanceof Error ? e.message : String(e) })));
}

export type ResolvedOruReportPdf =
  | { ok: true; pdfBase64: string; source: 'release' | 'document' | 'kept' | 'report-version'; documentId?: string; sha256?: string }
  | { ok: false; error: string };

export interface ResolveOruReportPdfDeps {
  versions: Pick<IReportVersionService, 'getByCaseId'>;
  store: IReleasedReportPdfStore;
  /** Batch 538: the released report documents (the entry's own document on a retry). */
  documents?: Pick<IReportDocumentService, 'read'>;
  /** Batch 558: reads a saved version's PDF, checked (this browser's, or through the API server). */
  versionPdf?: IReportVersionPdfReader;
}

// The report-version store is loaded when first needed, so importing this file
// (the release event does) stays free of storage side effects.
const defaultVersions: Pick<IReportVersionService, 'getByCaseId'> = {
  getByCaseId: async caseId => (await import('./reportVersionInstance')).reportVersionService.getByCaseId(caseId),
};
const defaultVersionPdf: IReportVersionPdfReader = {
  read: async (v, purpose) => (await import('./reportVersionInstance')).reportVersionPdfReader.read(v, purpose),
};
const defaultDocuments: Pick<IReportDocumentService, 'read'> = {
  read: async id => (await import('../reportDocuments/reportDocumentInstance')).reportDocumentService.read(id),
};
const DEFAULT_DEPS: ResolveOruReportPdfDeps = { versions: defaultVersions, store: mockReleasedReportPdfStore, documents: defaultDocuments, versionPdf: defaultVersionPdf };

/** The newest saved version with a PDF that fits this result, or undefined. Pure. */
export function pickReportVersionPdf(versions: readonly ReportVersionRecord[], instanceId: string, resultState: OruResultState): ReportVersionRecord | undefined {
  if (resultState === 'PRELIMINARY') return undefined;
  // Batch 558: a version the API server holds lists its PDF's hash, not the bytes.
  const withPdf = versions.filter(versionHasPdf).sort((a, b) => b.versionNumber - a.versionNumber);
  const sameInstance = withPdf.find(v => v.instanceId === instanceId);
  if (sameInstance) return sameInstance;
  if (resultState === 'FINAL') return withPdf.find(v => !v.instanceId);
  return undefined;
}

export async function resolveOruReportPdf(
  input: { caseId: string; instanceId: string; resultState: OruResultState; generatePdf?: GenerateReportPdf; documentId?: string },
  deps: ResolveOruReportPdfDeps = DEFAULT_DEPS,
): Promise<ResolvedOruReportPdf> {
  const { caseId, instanceId, resultState, generatePdf } = input;
  let generationError: string | undefined;
  // Batch 538: a retry of a message whose release made a report document sends that document,
  // never whatever is newest for the case (a later correction of the same instance, say).
  if (input.documentId && deps.documents) {
    const doc = await documentPdf(input.documentId, deps.documents)();
    if (doc.pdfBase64) return { ok: true, pdfBase64: doc.pdfBase64, source: 'document', documentId: doc.documentId, sha256: doc.sha256 };
    return { ok: false, error: `The report PDF could not be sent: ${doc.generationError}` };
  }
  if (generatePdf) {
    const made = await generatePdf();
    if (made.pdfBase64) {
      // Batch 538: a release with a stored document needs no second copy; its queue entry names the document.
      if (!made.documentId) await deps.store.put(caseId, instanceId, resultState, made.pdfBase64);
      return { ok: true, pdfBase64: made.pdfBase64, source: 'release', ...(made.documentId ? { documentId: made.documentId, sha256: made.sha256 } : {}) };
    }
    // Batch 538: the release's stored document can't be read (or failed its hash check): held, never
    // replaced by some other PDF.
    if (made.documentId) return { ok: false, error: `The report PDF could not be sent: ${made.generationError ?? 'unknown error'}` };
    generationError = made.generationError;
  }
  // What was kept is for a retry. A release whose PDF just failed doesn't take it: for a second
  // preliminary of the same instance, it would be the first preliminary's PDF (Batch 538).
  const kept = generatePdf ? undefined : await deps.store.get(caseId, instanceId, resultState);
  if (kept) return { ok: true, pdfBase64: kept, source: 'kept' };

  const versionsRes = await deps.versions.getByCaseId(caseId);
  const version = versionsRes.ok ? pickReportVersionPdf(versionsRes.data, instanceId, resultState) : undefined;
  if (version) {
    const read = await (deps.versionPdf ?? defaultVersionPdf).read(version, 'send');
    // Batch 559: with its hash (when the version has one), recorded on the queue entry and sent with the message.
    if (read.ok) return { ok: true, pdfBase64: read.data.pdfBase64, source: 'report-version', ...(read.data.sha256 ? { sha256: read.data.sha256 } : {}) };
    // Batch 558: the chosen version's PDF fails its check or can't be read: held, never an older one sent instead.
    return { ok: false, error: `The signed report PDF (version ${version.versionNumber}) could not be sent: ${versionPdfErrorText(read.error)}` };
  }

  return { ok: false, error: generationError ? `The report PDF could not be made: ${generationError}` : 'No report PDF has been made for this result.' };
}

/**
 * A release with no PDF of its own (surgical final sign-out, the release after
 * the hold period): the newest signed PDF saved with the case's report versions,
 * for printing and for the results alike. None for a preliminary.
 */
export function savedReportPdf(
  caseId: string,
  reportType: OruResultState,
  versions: Pick<IReportVersionService, 'getByCaseId'> = defaultVersions,
  versionPdf: IReportVersionPdfReader = defaultVersionPdf,
): GenerateReportPdf | undefined {
  if (reportType === 'PRELIMINARY') return undefined;
  return async () => {
    const res = await versions.getByCaseId(caseId);
    // Batch 538: the newest version itself. If its PDF wasn't made, an older signed PDF is never sent in its place.
    const newest = res.ok ? [...res.data].sort((a, b) => b.versionNumber - a.versionNumber)[0] : undefined;
    if (!newest) return { generationError: 'no signed report PDF has been saved for this case' };
    if (!versionHasPdf(newest)) {
      return { generationError: `the newest signed version (${newest.versionNumber}) has no PDF${newest.generationError ? `: ${newest.generationError}` : ''}` };
    }
    // Batch 558: checked against the version's SHA-256, and read through the API server when it holds it.
    const read = await versionPdf.read(newest, 'send');
    // documentError: a print retry tells a passing outage from a lasting problem (Batch 556, redispatchPrintJob).
    return read.ok
      ? { pdfBase64: read.data.pdfBase64 }
      : { documentError: read.error, generationError: `the newest signed version's PDF (${newest.versionNumber}) could not be read: ${versionPdfErrorText(read.error)}` };
  };
}
