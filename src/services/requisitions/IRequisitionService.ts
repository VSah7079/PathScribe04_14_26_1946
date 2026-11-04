// src/services/requisitions/IRequisitionService.ts
// Batch 762 (Automated Batch Requisition & Document Ingestion spec): the contract. The server's version is
// docs/architecture/REQUISITION_INGESTION_API.md; the demo's is mockRequisitionService.ts. Refusals are fixed codes:
// NOT_PERMITTED, NOT_FOUND, INVALID, ALREADY_CLOSED.
import type { ServiceResult } from '../types';
import type {
  DiscardReason, IngestionReport, IngestionRun, MissingRequisition, RequisitionExpectation, RequisitionInbox, RequisitionLink, RequisitionSource,
  RequisitionSourceInput, UnmatchedRequisition, WaiverReason, CaseToLink,
} from './requisitionTypes';

export const REQUISITION_ERRORS = { notPermitted: 'NOT_PERMITTED', notFound: 'NOT_FOUND', invalid: 'INVALID', alreadyClosed: 'ALREADY_CLOSED' } as const;

export interface IRequisitionService {
  /** The ingestion sources (requisition:inbox:review or config:requisition-ingestion:manage). */
  getSources(): Promise<ServiceResult<RequisitionSource[]>>;
  /** Add or change a source (config:requisition-ingestion:manage). Audited. */
  saveSource(source: RequisitionSourceInput): Promise<ServiceResult<RequisitionSource>>;
  /** One run of the job: match each group of pages to a case, link it, or quarantine it (requisition:ingestion:run;
   *  the server's scheduled job runs as its own service identity). Running again over the same files adds nothing. Audited. */
  recordIngestion(report: IngestionReport): Promise<ServiceResult<IngestionRun>>;
  /** The Unmatched Requisitions queue, recent links and runs (requisition:inbox:review). */
  getInbox(): Promise<ServiceResult<RequisitionInbox>>;
  /** A case's requisitions (case:requisition:view). */
  linksForCase(ref: { caseId?: string | null; accession?: string | null }): Promise<ServiceResult<RequisitionLink[]>>;
  /** Link an unmatched scan to a case by its accession (requisition:inbox:resolve). Audited. */
  reassociate(unmatchedId: string, accession: string, how?: 'search' | 'newCase'): Promise<ServiceResult<RequisitionLink>>;
  /** Search for the case to link a queued scan to: accession, patient name or MRN (requisition:inbox:resolve; the user's
   *  own case access applies). At most 8. */
  findCasesToLink(query: string): Promise<ServiceResult<CaseToLink[]>>;
  /** Discard an unmatched scan with a reason (requisition:inbox:resolve); the file itself is not touched. Audited. */
  discard(unmatchedId: string, reason: DiscardReason): Promise<ServiceResult<UnmatchedRequisition>>;
  /** The address that opens the requisition's pages (a short-lived read link for a stored object). Audited:
   *  case:requisition:view for a linked one, requisition:inbox:review for an unmatched one. */
  openDocument(ref: { linkId: string } | { unmatchedId: string }): Promise<ServiceResult<{ url: string }>>;

  // ── Expected requisitions (which cases should have one; flag and track the ones that don't) ──
  /** The settings: the organisation default (facilityId null) and each facility's own (requisition:inbox:review or
   *  config:requisition-ingestion:manage). */
  getExpectations(): Promise<ServiceResult<RequisitionExpectation[]>>;
  /** Save the organisation default or a facility's own setting (config:requisition-ingestion:manage for it). Audited. */
  saveExpectation(expectation: RequisitionExpectation): Promise<ServiceResult<RequisitionExpectation>>;
  /** Look for cases now missing their requisition: flag each and raise a Missing Requisition case deficiency; close the
   *  flags whose requisition has arrived; and flag scans that have waited in the Unmatched queue past the limit with no
   *  case (requisition:ingestion:run; the server runs it as a scheduled job). Audited. */
  sweepMissing(): Promise<ServiceResult<{ flagged: number; received: number; overdue: number }>>;
  /** The open flags, for the facilities the user may review (requisition:inbox:review). */
  getMissing(): Promise<ServiceResult<MissingRequisition[]>>;
  /** A case's open flag, or null (case:requisition:view). */
  missingForCase(ref: { caseId?: string | null; accession?: string | null }): Promise<ServiceResult<MissingRequisition | null>>;
  /** Record that no paper requisition is coming, with a reason (requisition:inbox:resolve for its facility); the
   *  deficiency is closed with the reason. Audited. */
  waiveMissing(caseId: string, reason: WaiverReason, note?: string): Promise<ServiceResult<MissingRequisition>>;
}
