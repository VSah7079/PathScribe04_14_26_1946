// src/types/delivery/ReportDeliveryQueueEntry.ts
// Batch 520 (PS-280): one report delivery by e-fax or file drop, as sent to the interface
// server (REPORT_DELIVERY). Same QUEUED / SENT / FAILED lifecycle as the other outbound
// queues, so a failure shows in Audit Log → Interfaces → Outbound and can be resent.
// The PDF itself isn't stored here. Since Batch 538 it is the release's report document
// (release.documentId), read again when sent; before, the case's newest signed report.
import type { ReportReleasedEventType } from '@/services/reports/publishReportReleasedEvent';

export type ReportDeliveryChannel = 'FAX' | 'FILE_DROP';

export interface ReportDeliveryQueueEntry {
  id: string;
  caseId: string;
  accession: string;
  reportType: ReportReleasedEventType;
  source: 'SURGPATH' | 'CYTOLOGY';
  channel: ReportDeliveryChannel;
  /** Its role in the delivery plan (a fallback went because a primary channel failed). */
  role: 'primary' | 'secondary' | 'fallback';
  releasedAt: string;
  documentName: string;
  /** FAX: who it goes to. Absent when no fax number was found (the entry fails with that reason;
   *  a resend looks again, so adding the number to the physician fixes it). */
  fax?: { number: string; recipientName?: string };
  /** The rule's own fax number, if it set one (looked up again on resend). */
  ruleFaxNumber?: string;
  fileDrop?: { targetId: string };
  /** What the file drop's metadata file and the fax record carry about the report. */
  metadata: Record<string, string>;
  /** Batch 521 (PS-281): for a primary channel, the release's fallback channels, and what they need,
   *  so a fax whose transmission later fails can still fall back. */
  fallbackChannels?: import('./DeliveryRule').DeliveryChannel[];
  release?: Pick<import('./DeliveryRetryRecord').DeliveryReleaseContext, 'performingFacilityId' | 'instanceId' | 'previouslyReportedAs' | 'priority' | 'faxNumber' | 'fileDropTargetId' | 'documentId'>;
  /** Batch 521 (PS-281 §3.2.3): what the fax provider reported about the transmission. */
  transmission?: { status: 'TRANSMITTED' | 'TRANSMISSION_FAILED'; detail?: string; at: string };
  status: 'QUEUED' | 'SENT' | 'FAILED';
  queuedAt: string;
  errorCode?: 'DISPATCH_TIMEOUT' | 'DISPATCH_UNREACHABLE' | 'DISPATCH_REJECTED';
  errorMessage?: string;
  retryCount: number;
  maxRetriesExceeded: boolean;
  lastAttemptAt?: string;
  sentAt?: string;
  /** Batch 538: the SHA-256 of the PDF last sent (the release's report document, release.documentId). */
  pdfSha256?: string;
}
