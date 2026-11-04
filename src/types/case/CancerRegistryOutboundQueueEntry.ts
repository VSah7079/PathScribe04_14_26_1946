// src/types/case/CancerRegistryOutboundQueueEntry.ts
// Real, generic cancer-registry outbound queue entry — mirrors
// CytologyRegistryOutboundQueueEntry.ts's own established shape
// exactly, for the genuinely distinct real cancer-registry class
// (services/cancerRegistry/).
import type { RegistrySubmissionHeader } from '@/services/registrySubmission/registrySubmissionHeader';
import type { RegistryAcknowledgement, RegistryLifecycleStatus, RegistryRevision } from '@/services/registrySubmission/registryAcknowledgement';

export interface CancerRegistryOutboundQueueEntry {
  id: string;
  caseId: string;
  registryId: string;
  /** Batch 419 (SRS v2.1 FR-008.4/5/8): the payload header this entry was sent (or held) with. Absent on an
   *  exclusion (nothing was built) and on entries from before Batch 419. A resend keeps it, with isDuplicateRetry. */
  submission?: RegistrySubmissionHeader;
  /** Batch 421: fingerprint of the payload body (registryContentHash): a resend with the same one reuses the id. */
  contentHash?: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  queuedAt: string;
  errorCode?: 'DISPATCH_TIMEOUT' | 'DISPATCH_UNREACHABLE' | 'DISPATCH_REJECTED' | 'EXCLUDED_BY_CONSENT'
    /** Batch 423: set to the live register without a current go-live approval. */
    | 'REGISTRY_LIVE_NOT_APPROVED'
    /** Batch 425: the registry's mandatory data is missing (cancerRegistryMandatoryData.ts); held, not sent. */
    | 'HOLD_MISSING_MANDATORY_DATA'
    /** Batch 620 (part E): the US ePath state profile found something wrong or none applied (usEpath/); held for a person, not sent. */
    | 'HOLD_EPATH_PROFILE';
  errorMessage?: string;
  /** Batch 620 (part E): the fixed codes behind a HOLD_EPATH_PROFILE hold (field:PID-11, rule:finalReportOnly, routing:noProfile). Never message text. */
  reviewCodes?: string[];
  /** Batch 620 (part E): how the destination is reached (a US ePath state profile's transport); a label for the Outbound Queue, the engine owns the transport. */
  transport?: 'phinMs' | 'sftp' | 'directTcp' | 'httpsApi';
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
