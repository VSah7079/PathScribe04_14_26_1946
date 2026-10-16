// src/types/case/OutboundResultQueueEntry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance ("we trigger the json packages and the
// interface engine generates the formatted messages" / "definitely
// look at results") and the attached Pathology HL7 Outbound Feature
// Spec's own Core Outbound Transaction Registry (ORU^R01): the real
// outbound queue for finalized/corrected/addendum pathology results.
//
// Scoped to reportingMode === 'orchestrator' cases: an Orchestration case's
// formal report (narrative, report PDF) goes out as ORU^R01 from this queue.
// Batch 426 correction (Pete, Oct 1 2026): this comment used to say an Assist
// case's report "is never PathScribe's to send". That was wrong. In Assist the
// LIS owns the formal report, and PathScribe sends it the synoptic data (the
// structured result and one PDF per workup). That goes through its own queue,
// OutboundLisSyncQueueEntry, built by services/reports/dispatchAssistSynopticResult.ts.

// Mirrors OutboundChargeQueueEntry/OutboundPatientAdtQueueEntry's own
// proven architecture exactly: a lightweight reference + dedup key +
// status tracker, never a pre-built payload — the actual enriched JSON
// package is built lazily, at real dispatch time, by
// buildOruR01Payload.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** Real, per the source spec's own Field State Mapping Matrix
 *  (§2.1) — maps directly onto SynopticReportInstance's own real
 *  status/pendingAmendmentId shape (types/case/Case.ts):
 *   'FINAL'     — status: 'finalized', no pendingAmendmentId, first
 *                 real version (OBR-25/OBX-11 = F).
 *   'CORRECTED' — a real amendment being released on an
 *                 already-finalized instance (OBR-25/OBX-11 = C).
 *   'ADDENDUM'  — a new, additional real instance finalized on a case
 *                 that already has at least one prior finalized
 *                 result (OBR-25/OBX-11 = A/F). */
export type OruResultState = 'PRELIMINARY' | 'FINAL' | 'CORRECTED' | 'ADDENDUM';

export interface OutboundResultQueueEntry {
  /** Real UUID — the external "TransactionID" a downstream interface
   *  engine dedupes against, same real reasoning as
   *  OutboundChargeQueueEntry.id. */
  id: string;
  caseId: string;
  /** The specific SynopticReportInstance this result represents —
   *  real reference, not a duplicated payload. */
  instanceId: string;
  resultState: OruResultState;
  organisationId: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  queuedAt: string;
  /** Real, per direct follow-up ("We are logging interface errors
   *  with human readable error messaging?"): 'DISPATCH_UNREACHABLE'
   *  is new — see OutboundPatientAdtQueueEntry.ts's own, fuller doc
   *  comment on this same field for the full real distinction from
   *  'DISPATCH_REJECTED'. */
  errorCode?: 'DISPATCH_TIMEOUT' | 'DISPATCH_UNREACHABLE' | 'DISPATCH_REJECTED';
  errorMessage?: string;
  retryCount: number;
  maxRetriesExceeded: boolean;
  lastAttemptAt?: string;
  /** Batch 538: the released report document this message carries; a retry sends the same one. */
  reportDocumentId?: string;
  /** Its SHA-256, for the record. Batch 559: also set for a signed version's PDF (no document), and
   *  updated to the hash of the PDF the last send or retry carried. */
  pdfSha256?: string;
}
