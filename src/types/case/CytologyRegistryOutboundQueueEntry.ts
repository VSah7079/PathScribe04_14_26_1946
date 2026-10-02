// src/types/case/CytologyRegistryOutboundQueueEntry.ts
// Real, generic centralized-registry outbound queue entry — mirrors
// CytologyOutboundResultQueueEntry.ts's own established shape exactly,
// with `registryId` carried explicitly, since a facility's real
// registry destination is itself a real, configurable value
// (IRegistrySettingsService.ts), not a single fixed one the
// way the EHR/LIS ORU dispatch has.
import type { RegistrySubmissionHeader } from '@/services/registrySubmission/registrySubmissionHeader';
import type { RegistryAcknowledgement, RegistryLifecycleStatus, RegistryRevision } from '@/services/registrySubmission/registryAcknowledgement';

export interface CytologyRegistryOutboundQueueEntry {
  id: string;
  caseId: string;
  signOutRecordId: string;
  /** Batch 419 (SRS v2.1 FR-008.4/5/8): the payload header this entry was sent (or held) with. Absent on an
   *  exclusion (nothing was built) and on entries from before Batch 419. A resend keeps it, with isDuplicateRetry. */
  submission?: RegistrySubmissionHeader;
  /** Batch 421: fingerprint of the payload body (registryContentHash): a resend with the same one reuses the id. */
  contentHash?: string;
  registryId: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  queuedAt: string;
  /** REGISTRY_NOT_READY (Batch 414): held, not sent. EXCLUDED_BY_CONSENT (Batch 418): the patient opted out; never resent. */
  errorCode?: 'DISPATCH_TIMEOUT' | 'DISPATCH_UNREACHABLE' | 'DISPATCH_REJECTED' | 'REGISTRY_NOT_READY' | 'EXCLUDED_BY_CONSENT'
    /** Batch 423: set to the live register without a current go-live approval. */
    | 'REGISTRY_LIVE_NOT_APPROVED';
  errorMessage?: string;
  retryCount: number;
  maxRetriesExceeded: boolean;
  lastAttemptAt?: string;
  /** Batch 420 (SRS v2.1 FR-008.3): what the registry has said, beside the transport status.
   *  Set to awaitingAck when sent; then from its acknowledgement; ackOverdue after 72 hours of silence. */
  registryStatus?: RegistryLifecycleStatus;
  /** Batch 420: when it reached the interface engine. */
  sentAt?: string;
  /** Batch 420: every acknowledgement received, oldest first, as parsed (with the raw message). */
  acknowledgements?: RegistryAcknowledgement[];
  /** Batch 425: the registry revised data it had accepted (REGISTRY_RESPONSE_UPDATED), oldest first. */
  registryRevisions?: RegistryRevision[];
}
