// src/services/liveUpdates/ILiveUpdateService.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-262: live updates for the intraoperative screens (OR Suite Live Board,
// Intraop Queue). Two implementations:
//   • signalRLiveUpdateService — the API server's SignalR hub (production)
//   • localLiveUpdateService   — no server: this browser's own windows,
//                                fed by the mock services' writes
// `@/services` exports whichever applies as `liveUpdateService`.
// ─────────────────────────────────────────────────────────────────────────────

import type { ExportStatusEvent } from '../exports/asyncExportContract';
import type { IntraopChangedEvent, IntraopScope, PrintJobStatusEvent, ReportDeliveryStatusEvent, WsiScanBatchChangedEvent } from './liveUpdateContract';
import type { LiveConnectionState } from './liveUpdatePolicy';
import type { DataChangedEvent, DataTopicSubscription } from './dataTopics';
import type { CasePresenceHandle, CasePresenceJoin, CasePresenceListener, CasePresenceSelf } from './casePresence';

export interface LiveUpdateSubscription {
  unsubscribe(): void;
}

export interface ILiveUpdateService {
  readonly transport: 'signalr' | 'local';
  /** Calls `onEvent` for each change inside `scope`. Connects on first use. */
  subscribeIntraop(scope: IntraopScope, onEvent: (event: IntraopChangedEvent) => void): LiveUpdateSubscription;
  /** Calls `onEvent` for each network print result sent to this user
   *  (Batch 347, PS-54). Connects on first use, like subscribeIntraop. */
  subscribePrintJobs(onEvent: (event: PrintJobStatusEvent) => void): LiveUpdateSubscription;
  /** Calls `onEvent` for each WSI scan batch change (Batch 434). Connects on first use. */
  subscribeWsiScanBatches(onEvent: (event: WsiScanBatchChangedEvent) => void): LiveUpdateSubscription;
  /** Batch 521 (PS-281): fax transmission reports for report deliveries. */
  subscribeReportDeliveries(onEvent: (event: ReportDeliveryStatusEvent) => void): LiveUpdateSubscription;
  /** Batch 550: the signed-in user's exports changing status (ASYNC_EXPORT_API.md §5). Connects on first use. */
  subscribeExports(onEvent: (event: ExportStatusEvent) => void): LiveUpdateSubscription;
  /**
   * Batch 559: calls `onEvent` when the hub says something on a topic changed (dataTopics.ts), for a
   * keyed topic only for the keys asked for. Connects on first use. The local transport never calls it:
   * screens keep their own polling there.
   */
  subscribeData(subscription: DataTopicSubscription, onEvent: (event: DataChangedEvent) => void, onAccepted?: (accepted: boolean) => void): LiveUpdateSubscription;
  /**
   * Batch 573: this window has a case report open (casePresence.ts; LIVE_UPDATES_SIGNALR.md §15).
   * `onChange` gets everyone with it open, this window included, and the id this window is listed under,
   * each time that changes; an empty list while not connected or refused (nothing shown rather than a
   * stale list). `self` is used only without the hub (the demo), where nobody else knows who this window
   * is; without it the demo joins nothing. Connects on first use.
   */
  joinCasePresence(join: CasePresenceJoin & { self?: CasePresenceSelf }, onChange: CasePresenceListener): CasePresenceHandle;
  getState(): LiveConnectionState;
  onStateChange(listener: (state: LiveConnectionState) => void): () => void;
  /** Called after a (re)connection: events may have been missed, so re-read. */
  onResync(listener: () => void): () => void;
  /**
   * Batch 549: the network is back (the browser's 'online' event). If a
   * restart is waiting out its back-off, try now instead (up to 30 s
   * sooner). Does nothing otherwise.
   */
  retryNow(): void;
}
