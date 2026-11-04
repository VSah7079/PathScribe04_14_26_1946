// src/types/delivery/DeliveryRetryRecord.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 521 (PS-281): one automatic delivery (a print job, or an e-fax or file
// drop) that failed, and what happens next: retried on schedule, delivered, or
// dead-lettered after the last retry (the exception queue), with the release's
// fallback channels sent and Admin and Lab Director told.
// ─────────────────────────────────────────────────────────────────────────────
import type { DeliveryChannel } from './DeliveryRule';

/** What a later fallback needs to send the same release again on another channel. */
export interface DeliveryReleaseContext {
  caseId: string;
  reportType: 'PRELIMINARY' | 'FINAL' | 'CORRECTED' | 'ADDENDUM';
  releasedAt: string;
  source: 'SURGPATH' | 'CYTOLOGY';
  performingFacilityId?: string;
  instanceId?: string;
  previouslyReportedAs?: string;
  priority?: 'Routine' | 'Urgent';
  /** The delivery rule's fax number and file-drop target, for fallback channels. */
  faxNumber?: string;
  fileDropTargetId?: string;
  /** Batch 538: the release's stored report document; a retry or fallback sends it. */
  documentId?: string;
}

export interface DeliveryRetryRecord {
  id: string;
  /** Which queue the delivery is in: the Print Queue, or the report delivery queue. */
  kind: 'print' | 'report_delivery';
  entryId: string;
  channel: DeliveryChannel;
  role: 'primary' | 'secondary' | 'fallback';
  /** The release it belongs to (case + report type + release time): a release's fallback goes once. */
  releaseKey: string;
  release: DeliveryReleaseContext;
  /** The release's fallback channels, sent if this (primary) delivery is dead-lettered; none for secondary or fallback ones. */
  fallbackChannels: DeliveryChannel[];
  /** Failed attempts so far (the first send counts). */
  failures: number;
  nextAttemptAt?: string;
  status: 'scheduled' | 'delivered' | 'dead_lettered';
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  deadLetteredAt?: string;
  /** When this record's dead-lettering sent the release's fallback channels. */
  fallbackSentAt?: string;
  /** Fax only: what the provider reported about the transmission (PS-281 §3.2.3). */
  transmission?: { status: 'TRANSMITTED' | 'TRANSMISSION_FAILED'; detail?: string; at: string };
}
