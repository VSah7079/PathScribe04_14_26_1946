// src/services/reports/reportVersionPdf.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 558 (PS-539 phase 2d; BLOB_STORAGE_API.md §5 and §11): the signed PDF
// saved with a report version, read the same way wherever it is kept.
//
//   - A version made in this browser carries its PDF (`pdfBase64`). It is
//     checked against the version's SHA-256 before it is used.
//   - A version listed by the API server carries only the hash; its PDF is read
//     through GET /api/cases/{caseId}/report-versions/{versionNumber}/pdf
//     (httpReportVersionService.ts), and the bytes' hash is checked against both
//     the X-Content-SHA256 header and the version's own hash.
//
// A PDF that fails its check is refused ('integrity'), never shown or sent.
// The version history, the ORU result and the release after the hold period
// all read through here.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';
import { pdfSha256 } from '../reportDocuments/reportDocuments';
import { sha256Hex } from '../registrySubmission/sha256';

/** Why a version's PDF couldn't be read. 'none': the version has no PDF. */
export type ReportVersionPdfError = 'none' | 'notFound' | 'notPermitted' | 'unavailable' | 'integrity' | 'empty';

/** What a person is doing with it: opening it ('view') or a message carrying it ('send'). The server audits which. */
export type ReportVersionPdfPurpose = 'view' | 'send';

/** `sha256` is the bytes' hash; '' only for an old version with no hash whose text isn't base64. */
export interface ReportVersionPdf { pdfBase64: string; sha256: string }

/** The server half: one version's PDF, already checked against the server's own hash header. */
export interface IReportVersionPdfApi {
  readPdf(caseId: string, versionNumber: number, purpose: ReportVersionPdfPurpose): Promise<ServiceResult<ReportVersionPdf>>;
}

export interface IReportVersionPdfReader {
  read(version: ReportVersionRecord, purpose: ReportVersionPdfPurpose): Promise<ServiceResult<ReportVersionPdf>>;
}

/** Whether a version has a signed PDF to open: one kept with it here, or one the server holds (its hash is listed). */
export function versionHasPdf(v: Pick<ReportVersionRecord, 'pdfBase64' | 'pdfSha256'>): boolean {
  return !!(v.pdfBase64 || v.pdfSha256);
}

/**
 * Whether a PDF kept with a version still matches the version's hash. Versions
 * saved before Batch 558 hashed the base64 text rather than the bytes; both are
 * accepted. A version with no hash (older still) has nothing to check against.
 */
export function localVersionPdfMatches(pdfBase64: string, recorded: string | undefined): { ok: boolean; sha256: string } {
  let sha256 = '';
  try { sha256 = pdfSha256(pdfBase64); } catch { /* not base64: matches no hash */ }
  // Nothing recorded to check against: used as it is, as before Batch 461.
  if (!recorded) return { ok: true, sha256 };
  const want = recorded.trim().toLowerCase();
  return { ok: (!!sha256 && want === sha256) || want === sha256Hex(pdfBase64), sha256 };
}

const fail = <T>(error: ReportVersionPdfError): ServiceResult<T> => ({ ok: false, error });

export function createReportVersionPdfReader(deps: { server?: IReportVersionPdfApi | null }): IReportVersionPdfReader {
  return {
    async read(v, purpose) {
      if (v.pdfBase64) {
        const check = localVersionPdfMatches(v.pdfBase64, v.pdfSha256);
        return check.ok ? { ok: true, data: { pdfBase64: v.pdfBase64, sha256: check.sha256 } } : fail('integrity');
      }
      if (!v.pdfSha256) return fail('none');
      if (!deps.server) return fail('notFound');
      const res = await deps.server.readPdf(v.caseId, v.versionNumber, purpose);
      if (res.ok === false) return res;
      // The server's hash header matched the bytes; they must also be the bytes this version was signed with.
      return res.data.sha256 === v.pdfSha256.trim().toLowerCase() ? res : fail('integrity');
    },
  };
}

/** The message key suffix the version history shows for a refusal (`versionHistoryModal.pdfProblems.*`). */
export type VersionPdfProblem = 'integrity' | 'notFound' | 'notPermitted' | 'unavailable';
export function versionPdfProblem(error: string): VersionPdfProblem {
  if (error === 'integrity' || error === 'notPermitted' || error === 'unavailable') return error;
  return 'notFound';
}

/** The wording for a result or release that couldn't read the PDF (queue errors are literal English, like the audit trail). */
export function versionPdfErrorText(error: string): string {
  switch (error) {
    case 'integrity': return 'it no longer matches its SHA-256 fingerprint, so it is not sent; report this to your administrator';
    case 'notPermitted': return 'the PathScribe server refused to read it';
    case 'unavailable': return 'the PathScribe server could not be reached';
    case 'empty': return 'the stored file is empty';
    case 'none': return 'the version has no PDF';
    default: return 'it could not be found';
  }
}
