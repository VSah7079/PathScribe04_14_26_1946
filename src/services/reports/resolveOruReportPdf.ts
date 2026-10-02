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
// Cytology builds its own PDF from its stored report (cytology/).
// ─────────────────────────────────────────────────────────────────────────────

import type { OruResultState } from '@/types/case/OutboundResultQueueEntry';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';
import type { IReportVersionService } from './IReportVersionService';
import { mockReleasedReportPdfStore, type IReleasedReportPdfStore } from './releasedReportPdfStore';

export type GenerateReportPdf = () => Promise<{ pdfBase64?: string; generationError?: string }>;

/** One render per release, however many results and printing ask for it. */
export function generateOnce(generate: GenerateReportPdf | undefined): GenerateReportPdf | undefined {
  if (!generate) return undefined;
  let result: ReturnType<GenerateReportPdf> | undefined;
  return () => (result ??= generate().catch(e => ({ generationError: e instanceof Error ? e.message : String(e) })));
}

export type ResolvedOruReportPdf =
  | { ok: true; pdfBase64: string; source: 'release' | 'kept' | 'report-version' }
  | { ok: false; error: string };

export interface ResolveOruReportPdfDeps {
  versions: Pick<IReportVersionService, 'getByCaseId'>;
  store: IReleasedReportPdfStore;
}

// The report-version store is loaded when first needed, so importing this file
// (the release event does) stays free of storage side effects.
const defaultVersions: Pick<IReportVersionService, 'getByCaseId'> = {
  getByCaseId: async caseId => (await import('./mockReportVersionService')).mockReportVersionService.getByCaseId(caseId),
};
const DEFAULT_DEPS: ResolveOruReportPdfDeps = { versions: defaultVersions, store: mockReleasedReportPdfStore };

/** The newest saved version with a PDF that fits this result, or undefined. Pure. */
export function pickReportVersionPdf(versions: readonly ReportVersionRecord[], instanceId: string, resultState: OruResultState): ReportVersionRecord | undefined {
  if (resultState === 'PRELIMINARY') return undefined;
  const withPdf = versions.filter(v => !!v.pdfBase64).sort((a, b) => b.versionNumber - a.versionNumber);
  const sameInstance = withPdf.find(v => v.instanceId === instanceId);
  if (sameInstance) return sameInstance;
  if (resultState === 'FINAL') return withPdf.find(v => !v.instanceId);
  return undefined;
}

export async function resolveOruReportPdf(
  input: { caseId: string; instanceId: string; resultState: OruResultState; generatePdf?: GenerateReportPdf },
  deps: ResolveOruReportPdfDeps = DEFAULT_DEPS,
): Promise<ResolvedOruReportPdf> {
  const { caseId, instanceId, resultState, generatePdf } = input;
  let generationError: string | undefined;
  if (generatePdf) {
    const made = await generatePdf();
    if (made.pdfBase64) {
      await deps.store.put(caseId, instanceId, resultState, made.pdfBase64);
      return { ok: true, pdfBase64: made.pdfBase64, source: 'release' };
    }
    generationError = made.generationError;
  }
  const kept = await deps.store.get(caseId, instanceId, resultState);
  if (kept) return { ok: true, pdfBase64: kept, source: 'kept' };

  const versionsRes = await deps.versions.getByCaseId(caseId);
  const version = versionsRes.ok ? pickReportVersionPdf(versionsRes.data, instanceId, resultState) : undefined;
  if (version?.pdfBase64) return { ok: true, pdfBase64: version.pdfBase64, source: 'report-version' };

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
): GenerateReportPdf | undefined {
  if (reportType === 'PRELIMINARY') return undefined;
  return async () => {
    const res = await versions.getByCaseId(caseId);
    const newest = res.ok ? [...res.data].filter(v => !!v.pdfBase64).sort((a, b) => b.versionNumber - a.versionNumber)[0] : undefined;
    return newest?.pdfBase64 ? { pdfBase64: newest.pdfBase64 } : { generationError: 'no signed report PDF has been saved for this case' };
  };
}
