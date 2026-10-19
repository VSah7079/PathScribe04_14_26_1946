// src/constants/outboundQueueActionGroup.ts
// Batch 619 (PS-800): the Outbound Queue screen's actions, as their own group so systemActions.ts (over 1,000 lines) does not grow
// (CLAUDE.md rule 10). Spread into ACTION_GROUPS there. Each follows an interface:outbound:* capability (AUTHORIZATION_API.md).
import type { ActionGroup } from './systemActions';

export const OUTBOUND_QUEUE_ACTION_GROUP: ActionGroup = {
  id: 'outbound_queue',
  title: 'Outbound Queue',
  actions: [
    { id: 'outboundQueue.hold', label: 'Hold Outbound Messages', internalKey: 'F34+PS001' },
    { id: 'outboundQueue.release', label: 'Release Held Outbound Messages', internalKey: 'F34+PS002' },
    { id: 'outboundQueue.retry', label: 'Retry or Resubmit Outbound Messages', internalKey: 'F34+PS003' },
    { id: 'outboundQueue.retract', label: 'Retract Queued Charges', internalKey: 'F34+PS004' },
    { id: 'outboundQueue.overrideRelease', label: 'Release Charges Ahead of Schedule', internalKey: 'F34+PS005' },
    { id: 'outboundQueue.markNotReportable', label: 'Mark Rejected Messages Not Reportable', internalKey: 'F34+PS006' },
  ],
};
