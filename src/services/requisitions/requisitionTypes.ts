// src/services/requisitions/requisitionTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 762 (Automated Batch Requisition & Document Ingestion spec, v1.0, Pete, Nov 2, 2026). Reference-only (§1): no
// PDF is ever stored by PathScribe. A requisition is a pointer to the file where it lives (the hospital's file share,
// an ECM or the LIS), the page range that belongs to the case, the barcode it was matched on, when, and from which
// source. A scan whose barcode matches no case waits in the Unmatched Requisitions queue for a person to link it.
// ─────────────────────────────────────────────────────────────────────────────
import type { AttachmentPointer } from '@/types/caseAttachments/CaseAttachment';

/** Where scans come from (§2.1, Pete, Nov 2, 2026: "the scanner would output to a folder on their network, or to a 3rd
 *  party system. Then PathScribe references that folder URL, or 3rd party system as defined in configuration"):
 *  a watched folder on the hospital's network, a third-party document system PathScribe reads at its https address, or
 *  a system that sends scans to the PathScribe API. One source per location; there can be as many as needed. */
export const REQUISITION_SOURCE_KINDS = ['fileShare', 'documentSystem', 'api'] as const;
export type RequisitionSourceKind = typeof REQUISITION_SOURCE_KINDS[number];

export interface RequisitionSource {
  id: string;
  name: string;
  /** The performing facility whose scanner this is (its queue and its permissions); null: every facility. */
  facilityId: string | null;
  kind: RequisitionSourceKind;
  /** fileShare: the folder's address (\\server\share\inbox, smb://…, nfs://…, file://… or https://…); documentSystem: the
   *  third-party system's https address; api: the sending system's name. */
  location: string;
  /** How often the job looks (minutes). */
  scheduleMinutes: number;
  /** The barcode printed on a separator sheet between requisitions in one scan (the page is skipped). */
  separatorBarcode: string;
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
}
export type RequisitionSourceInput = Omit<RequisitionSource, 'updatedAt' | 'updatedBy'>;

/** A page range in a PDF, 1-based and inclusive. */
export interface PageRange { from: number; to: number }

/** One requisition linked to a case (§2.3: accession, storage URI, ingestion time, originating source). */
export interface RequisitionLink {
  id: string;
  caseId: string;
  accession: string;
  pointer: AttachmentPointer;
  fileName: string;
  pages: PageRange;
  /** The barcode read from the page; for a manual link, the accession it was linked to. */
  barcode: string;
  sourceId: string;
  /** The facility of the source it came from (null: an all-facility source). */
  facilityId: string | null;
  ingestedAt: string;
  matchedBy: 'automatic' | 'manual';
  /** Who linked it by hand (manual only). */
  linkedBy?: string;
}

export const UNMATCHED_REASONS = ['noBarcode', 'noMatch'] as const;
export type UnmatchedReason = typeof UNMATCHED_REASONS[number];

/** A scanned requisition that matched no case (§2.3): quarantined until linked or discarded. */
export interface UnmatchedRequisition {
  id: string;
  pointer: AttachmentPointer;
  fileName: string;
  pages: PageRange;
  /** The barcode read, when one was (noMatch). */
  barcode?: string;
  reason: UnmatchedReason;
  sourceId: string;
  /** The facility of the source it came from: who may see and resolve it (null: an all-facility source). */
  facilityId: string | null;
  receivedAt: string;
  status: 'open' | 'linked' | 'discarded';
  linkId?: string;
  closedAt?: string;
  closedBy?: string;
  discardReason?: string;
  /** When the check found it still waiting past its facility's limit (a requisition with no case). */
  overdueAt?: string;
}

/** Why a file was refused before any page was read (§2.1: PDF only). */
export const REJECTED_FILE_REASONS = ['notPdf', 'unreadable'] as const;
export type RejectedFileReason = typeof REJECTED_FILE_REASONS[number];

/** What the ingestion engine found in one file: the pages grouped under the barcode each group starts with. */
export type IngestedFile =
  | { fileName: string; pointer: AttachmentPointer; outcome: 'read'; groups: { barcode?: string; pages: PageRange }[] }
  | { fileName: string; outcome: 'rejected'; reason: RejectedFileReason };

export interface IngestionReport { sourceId: string; files: IngestedFile[] }

/** One run of the job: what came in and where it went. */
export interface IngestionRun {
  id: string;
  sourceId: string;
  facilityId: string | null;
  at: string;
  ranBy: string;
  files: number;
  matched: number;
  unmatched: number;
  rejected: { fileName: string; reason: RejectedFileReason }[];
}

/** The Requisition Inbox: what waits for a person, and what came in lately, for the facilities the user may review. */
export interface RequisitionInbox {
  unmatched: UnmatchedRequisition[];
  recentLinks: RequisitionLink[];
  runs: IngestionRun[];
}

/** Quick reasons for discarding an unmatched scan. */
export const DISCARD_REASONS = ['notARequisition', 'duplicateScan', 'unreadable', 'other'] as const;
export type DiscardReason = typeof DISCARD_REASONS[number];

// ── Expected requisitions (Pete, Nov 2, 2026: "If a case has no associated [requisition] do we raise a flag and track?
//    Also, orders from the HIS may not have a paper req") ─────────────────────────────────────────────────────────────

/** How a case's order reached the laboratory: an electronic HIS/LIS order (its order message is the request on record),
 *  typed at Accession with no imported order, an outside or contract case, a downtime accession, or a lockbox drop. */
export const REQUISITION_ORIGINS = ['electronic', 'manual', 'outside', 'downtime', 'lockbox'] as const;
export type RequisitionOrigin = typeof REQUISITION_ORIGINS[number];

/** Which cases are expected to have a scanned requisition, and how long after accession one may take to arrive. A
 *  facility's own setting overrides the organisation default (facilityId null). */
export interface RequisitionExpectation {
  facilityId: string | null;
  expected: Record<RequisitionOrigin, boolean>;
  /** Hours after accession before a case with no requisition is flagged (0: at once). */
  graceHours: number;
  /** Hours a scan may wait in the Unmatched queue before it is flagged as a requisition with no case: possibly a
   *  specimen not received, lost, or not accessioned (Pete, Nov 2, 2026: "if a req has no case, that could be a problem
   *  too"). */
  unmatchedAlertHours: number;
  updatedAt?: string;
  updatedBy?: string;
}

/** A case that should have a requisition and has none: flagged, with a Missing Requisition case deficiency. */
export interface MissingRequisition {
  caseId: string;
  accession: string;
  facilityId: string | null;
  origin: RequisitionOrigin;
  accessionedAt: string;
  flaggedAt: string;
  /** The Case-Level Deficiency raised for it (Missing Requisition), when one could be raised. */
  deficiencyId?: string;
  status: 'open' | 'received' | 'waived';
  closedAt?: string;
  closedBy?: string;
  waiverReason?: WaiverReason;
  waiverNote?: string;
}

/** Why a case has no paper requisition, chosen when someone records that none is coming. */
export const WAIVER_REASONS = ['electronicOrder', 'verbalOrderDocumented', 'requestInAnotherRecord', 'other'] as const;
export type WaiverReason = typeof WAIVER_REASONS[number];

/** What the job needs to know about a case to decide whether its requisition is missing. */
export interface CaseRequisitionFacts {
  caseId: string;
  accession: string;
  facilityId: string | null;
  origin: RequisitionOrigin;
  accessionedAt: string | null;
}

/** A case offered when linking a queued scan by search (Pete, Nov 2, 2026: "manually search/link it to the correct
 *  existing accession or trigger a quick-create case"). The patient's name is shown inside data-phi. */
export interface CaseToLink { caseId: string; accession: string; patientName: string; accessionedAt: string | null }
