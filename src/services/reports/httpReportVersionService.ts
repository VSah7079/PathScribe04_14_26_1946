// src/services/reports/httpReportVersionService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 558 (PS-539 phase 2d; BLOB_STORAGE_API.md §5 and §11): with the API
// server, signed report versions are read through the API:
//   GET /api/cases/{caseId}/report-versions                         the records (no PDF bytes)
//   GET /api/cases/{caseId}/report-versions/{versionNumber}/pdf     the PDF, with X-Content-SHA256
// The server checks the case's access and the bytes' SHA-256 before it answers
// (409 DOCUMENT_INTEGRITY otherwise) and audits the read with its purpose.
//
// Until sign-out itself moves to the server (phase 2e), a version signed in
// this browser is still kept here, in memory only with the API server (PS-485).
// `createServerBackedReportVersionService` lists both, each version once.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';
import type { IReportVersionService } from './IReportVersionService';
import { sha256HexBytes } from '../registrySubmission/sha256';
import { bytesToBase64 } from './reportRenderer';
import type { IReportVersionPdfApi, ReportVersionPdfError } from './reportVersionPdf';
import { reportDocumentHttpError } from '../reportDocuments/httpReportDocumentService';

export interface IReportVersionReadApi extends IReportVersionPdfApi {
  listByCase(caseId: string): Promise<ServiceResult<ReportVersionRecord[]>>;
}

const fail = <T>(error: ReportVersionPdfError): ServiceResult<T> => ({ ok: false, error });

/** An HTTP refusal as a version PDF error: the same mapping as report documents (Batch 556), which gives only these four. */
export function reportVersionHttpError(status: number, code?: unknown): ReportVersionPdfError {
  return reportDocumentHttpError(status, code) as 'integrity' | 'notFound' | 'notPermitted' | 'unavailable';
}

const isText = (x: unknown): x is string => typeof x === 'string' && x.trim() !== '';

const isObject = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const optText = (x: unknown): string | undefined => (typeof x === 'string' && x.trim() ? x : undefined);

/**
 * The server's version records, checked. A row without an id, the case, a
 * version number or who signed it is dropped. Only the fields the browser uses
 * are kept, each checked for its shape. Bytes never come with the list: a
 * `pdfBase64` the server sends is ignored, so the PDF is always read (and
 * checked) through its own endpoint.
 */
export function normaliseServerVersions(body: unknown, caseId: string): ReportVersionRecord[] | null {
  if (!Array.isArray(body)) return null;
  const out: ReportVersionRecord[] = [];
  for (const r of body) {
    if (!isObject(r)) continue;
    const by = r.createdBy;
    if (!isText(r.id) || r.caseId !== caseId || !Number.isInteger(r.versionNumber) || (r.versionNumber as number) < 1) continue;
    if (!isObject(by) || !isText(by.userName)) continue;
    const sha = isText(r.pdfSha256) && /^[0-9a-f]{64}$/i.test(r.pdfSha256.trim()) ? r.pdfSha256.trim().toLowerCase() : undefined;
    const snap = r.patientEncounterSnapshot;
    const figures = Array.isArray(r.organMapFigures) && r.organMapFigures.every(f => isObject(f) && isText(f.instanceId) && isText(f.svgSha256)) ? r.organMapFigures : undefined;
    const v: ReportVersionRecord = {
      id: r.id, caseId, versionNumber: r.versionNumber as number,
      createdAt: optText(r.createdAt) ?? '',
      mode: r.mode === 'assist' ? 'assist' : 'orchestration',
      trigger: r.trigger === 'amendment' ? 'amendment' : 'initial_signout',
      createdBy: { userId: optText(by.userId) ?? '', userName: by.userName as string },
    };
    if (optText(r.createdFromStation)) v.createdFromStation = r.createdFromStation as string;
    if (optText(r.generationError)) v.generationError = r.generationError as string;
    if (optText(r.instanceId)) v.instanceId = r.instanceId as string;
    if (optText(r.amendmentRecordId)) v.amendmentRecordId = r.amendmentRecordId as string;
    if (isObject(r.synopticAnswersSnapshot)) v.synopticAnswersSnapshot = r.synopticAnswersSnapshot;
    // The snapshot is shown in Version History: kept only with the patient's name fields it needs.
    if (isObject(snap) && typeof snap.lastName === 'string' && typeof snap.firstName === 'string') v.patientEncounterSnapshot = snap as unknown as ReportVersionRecord['patientEncounterSnapshot'];
    if (figures) v.organMapFigures = figures as ReportVersionRecord['organMapFigures'];
    if (sha) v.pdfSha256 = sha;
    out.push(v);
  }
  return out;
}

export function createHttpReportVersionApi(deps: { baseUrl: string; fetch: typeof fetch; accessToken: () => Promise<string> }): IReportVersionReadApi {
  const root = `${deps.baseUrl.replace(/\/+$/, '')}/api`;
  const get = async (path: string, accept: string): Promise<Response | null> => {
    try {
      const token = await deps.accessToken();
      return await deps.fetch(`${root}${path}`, { method: 'GET', headers: { Accept: accept, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    } catch {
      return null;
    }
  };
  const errorOf = async (res: Response): Promise<ReportVersionPdfError> => {
    let code: unknown;
    try { code = ((await res.json()) as { code?: unknown })?.code; } catch { code = undefined; }
    return reportVersionHttpError(res.status, code);
  };
  const casePath = (caseId: string) => `/cases/${encodeURIComponent(caseId)}/report-versions`;
  return {
    async listByCase(caseId) {
      const res = await get(casePath(caseId), 'application/json');
      if (!res) return fail('unavailable');
      if (!res.ok) return fail(await errorOf(res));
      try {
        const rows = normaliseServerVersions(await res.json(), caseId);
        return rows ? { ok: true, data: rows } : fail('unavailable');
      } catch {
        return fail('unavailable');
      }
    },
    async readPdf(caseId, versionNumber, purpose) {
      const res = await get(`${casePath(caseId)}/${encodeURIComponent(String(versionNumber))}/pdf?purpose=${purpose}`, 'application/pdf');
      if (!res) return fail('unavailable');
      if (!res.ok) return fail(await errorOf(res));
      let bytes: Uint8Array;
      try { bytes = new Uint8Array(await res.arrayBuffer()); } catch { return fail('unavailable'); }
      if (!bytes.length) return fail('empty');
      const claimed = res.headers.get('X-Content-SHA256')?.trim().toLowerCase();
      // No hash header: a server, proxy or CORS setting is wrong; the file itself isn't known to be changed.
      if (!claimed) return fail('unavailable');
      const sha256 = sha256HexBytes(bytes);
      if (claimed !== sha256) return fail('integrity');
      return { ok: true, data: { pdfBase64: bytesToBase64(bytes), sha256 } };
    },
  };
}

/**
 * The versions signed in this browser (until sign-out moves to the server) and
 * the server's. New versions are kept here; the list is both, by version number,
 * each version once by id (the copy signed here wins, since it carries its PDF).
 */
export function createServerBackedReportVersionService(local: IReportVersionService, server: Pick<IReportVersionReadApi, 'listByCase'>): IReportVersionService {
  return {
    // The new version is numbered after the server's versions as well as this browser's, and an amendment
    // of an instance the server holds is a correction (CORRECTED), not an addendum. If the server's list
    // can't be read, the version is still saved (a sign-out is never lost), numbered from this browser's.
    async create(record, context) {
      const there = await server.listByCase(record.caseId);
      if (there.ok === false) console.warn('[report versions] The server\'s versions could not be read; this version is numbered from this browser\'s only.');
      const prior = [...(context?.priorVersions ?? []), ...(there.ok === true ? there.data : [])];
      return local.create(record, { priorVersions: prior });
    },
    async getByCaseId(caseId) {
      const [here, there] = await Promise.all([local.getByCaseId(caseId), server.listByCase(caseId)]);
      if (there.ok === false && here.ok === false) return there;
      const byId = new Map<string, ReportVersionRecord>();
      for (const v of there.ok === true ? there.data : []) byId.set(v.id, v);
      for (const v of here.ok === true ? here.data : []) byId.set(v.id, v);
      // Same number twice (one saved here while the server's list couldn't be read): the one signed here last.
      const signedHere = new Set(here.ok === true ? here.data.map(v => v.id) : []);
      const data = [...byId.values()].sort((a, b) => a.versionNumber - b.versionNumber || Number(signedHere.has(a.id)) - Number(signedHere.has(b.id)));
      // The server's list couldn't be read: this browser's versions, and the list may be incomplete.
      // Batch 559: or this browser's couldn't (versions signed here are in its memory until phase 2e).
      return there.ok === false || here.ok === false ? { ok: true, data, meta: { partial: true } } : { ok: true, data };
    },
  };
}
