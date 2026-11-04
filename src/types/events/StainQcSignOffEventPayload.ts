// src/types/events/StainQcSignOffEventPayload.ts
// Batch 763 (Option A, vendor sign-off through the interface engine): a stainer's own QC result for one run (one rack),
// sent after the run when the stainer's software has checked it. docs/architecture/STAIN_QC_API.md §3.
export interface StainQcSignOffEventPayload {
  messageId: string;      // idempotency and tracing
  timestamp: string;      // ISO-8601 UTC, when the instrument's interface sent it
  masterBarcode: string;  // the rack (Batch.masterBarcode)
  result: 'pass' | 'fail';
  /** The slides that failed (their label ids); all of the run's slides when omitted on a fail. */
  failedSlideIds?: string[];
  /** The instrument's own reference for the sign-off (its run or QC record id). */
  vendorRef?: string;
  instrumentCode?: string;
}
