// src/services/caseSearch/ICaseSearchService.ts
// Batch 350: case search, done by the server. The caller sends criteria,
// a sort and a page number; the server applies the user's access rules,
// matches, sorts, counts and returns that one page. Exports run the same
// search and return up to CASE_SEARCH_EXPORT_LIMIT rows.
// Contract for the .NET API server: docs/architecture/CASE_SEARCH_API.md.
import type { ServiceResult } from '../types';
import type { CaseSearchExport, CaseSearchPage, CaseSearchRequest } from './caseSearchTypes';
import type { CaseSearchReport, CaseSearchReportRequest } from './caseSearchReport';
import type { SynopticFieldInfo } from './synopticValueCriteria';

/** Batch 613: a protocol and the questions a search or report can use. */
export interface SynopticProtocolInfo {
  templateId: string;
  /** The protocol's own name (administrator-entered data, not translated). */
  name: string;
  fields: SynopticFieldInfo[];
}

export interface ICaseSearchService {
  /** One page of matching cases, with the total. The user comes from the session, never the request. */
  search(request: CaseSearchRequest): Promise<ServiceResult<CaseSearchPage>>;
  /** Every matching case (up to the export limit) as export rows. Audited. */
  exportRows(request: Omit<CaseSearchRequest, 'page' | 'pageSize'>): Promise<ServiceResult<CaseSearchExport>>;
  /** Batch 613: the matching cases grouped and counted, or listed with chosen columns. Same access rules as search. */
  report(request: CaseSearchReportRequest): Promise<ServiceResult<CaseSearchReport>>;
  /** Batch 613: the whole report for a file (every group; case rows up to the export limit). Audited; needs search:case-report:export. */
  exportReport(request: CaseSearchReportRequest): Promise<ServiceResult<CaseSearchReport>>;
  /** Batch 613: the questions the protocols ask, for the value filters and the report's columns. */
  listSynopticProtocols(): Promise<ServiceResult<SynopticProtocolInfo[]>>;
}
