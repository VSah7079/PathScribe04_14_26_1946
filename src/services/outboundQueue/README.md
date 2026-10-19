# services/outboundQueue

Batch 619 (PS-800). The one Outbound Queue: every message PathScribe sends out, in one list, with hold, release, retry, and for registries and billing, resubmit, mark not reportable, retract and release now. PathScribe owns what is sent and when; the interface engine owns how and its acknowledgements update the status here. Contract: `docs/architecture/OUTBOUND_QUEUE_API.md`.

| File | What it does |
|---|---|
| `outboundQueueTypes.ts` | The feeds (10), states (9), item shape, billing detail, rejection, reason pick-lists, filter, sort and result types. |
| `outboundQueueView.ts` | Pure rules: state of an entry, rows, filter, sort, counts, deadline flag (maps the schedule's `deadlineStatus`), what each state allows, bulk result summary. |
| `IOutboundQueueService.ts`, `outboundQueueService.ts` | The service and its logic (dependencies passed in): list, hold, release, retry, retract, overrideRelease, markNotReportable; capability checked once per selection, one result per ref, one audit entry per change (no patient text). |
| `outboundFeedSources.ts` | One source per feed: the eight interface queues (retry through `resendOutboundEntry`), billing and registry. |
| `billingFeedAdapter.ts` | `IBillingFeedAdapter` (listBillingItems, hold, release, retry, retract): where a billing implementation plugs in (`billingRelease/billingReleaseFeed.ts` does). Demo adapter over the charge queue. |
| `registryFeedAdapter.ts` | Registry submissions: acknowledgement → acknowledged or rejected (fixed error codes only), correction due date, amended re-queue links. |
| `scheduleBinding.ts` | Reads the scheduled time and reporting deadline from `deliverySchedules` (`resolveDeliverySchedule`, `evaluateSchedule`, `deadlineStatus`); nothing re-implemented. |
| `outboundHoldStore.ts` | The demo's overlay for holds, overrides and retractions (`outbound_holds_v1`). `outboundQueueActions.ts` consults it so a held message is not sent. |
| `mockOutboundQueueService.ts`, `httpOutboundQueueService.ts`, `outboundQueueServiceInstance.ts` | The demo's wiring, the server version (7 routes) and the choice between them. |

Screen: `pages/OutboundQueuePage/`; hook: `hooks/useOutboundQueue.ts`.
