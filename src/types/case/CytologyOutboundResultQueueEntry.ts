// src/types/case/CytologyOutboundResultQueueEntry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance: "we trigger the json packages and the
// interface engine generates the formatted messages" — cytology's own
// version of OutboundResultQueueEntry.ts, mirroring its real,
// established shape exactly, with one real, deliberate difference:
// `signOutRecordId` (a real CytologySignOutRecord.id) in place of
// `instanceId` (a SynopticReportInstance.id) — cytology has no
// synoptic instances; a real CytologySignOutRecord is the equivalent
// "one finalized real result" unit here.
//
// Scoped, same as the surgical queue, to reportingMode: 'orchestrator'
// cases only — see resolveCytologyStructuredWorkflowAccess.ts
// (services/cytology/) for the real, shared reasoning: an assist-mode
// case means an external LIS owns the report, so this queue (and the
// structured cytology workflow that feeds it) is never the operative
// path for one.
// ─────────────────────────────────────────────────────────────────────────────

export interface CytologyOutboundResultQueueEntry {
  id: string;
  caseId: string;
  /** The real CytologySignOutRecord this result represents. */
  signOutRecordId: string;
  /** Real, per direct follow-up ("Cytology has no amendment mechanism
   *  at all... work this"), then corrected ("Cytology cases can have
   *  addendums") — mirrors buildCytologyOruR01Payload.ts's own real
   *  resultState union exactly. */
  resultState: 'FINAL' | 'CORRECTED' | 'ADDENDUM' | 'PRELIMINARY';
  /** Batch 532: 'case' = one consolidated message for the accession
   *  (signOutRecordId is then the record that closed the case, or the
   *  correction / addendum that changed it). Absent on entries from before
   *  Batch 532, which were one message per specimen.
   *  Batch 533: 'preliminary' = an urgent preliminary for one specimen
   *  (signOutRecordId is then the CytologyPreliminaryRelease id, on the case). */
  scope?: 'case' | 'preliminary';
  organisationId: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  queuedAt: string;
  errorCode?: 'DISPATCH_TIMEOUT' | 'DISPATCH_UNREACHABLE' | 'DISPATCH_REJECTED';
  errorMessage?: string;
  retryCount: number;
  maxRetriesExceeded: boolean;
  lastAttemptAt?: string;
  /** Batch 538: the released report document this message carries; a retry sends the same one. */
  reportDocumentId?: string;
  pdfSha256?: string;
}
