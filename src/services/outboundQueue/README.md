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
| (Batch 620 part C) | The UK COSD correction window and transport come from `services/cosd/cosdFeed.ts` (`withCosdCorrection`), which wraps the registry feed; a rejection also carries `rejectedAt`. |
| `scheduleBinding.ts` | Reads the scheduled time and reporting deadline from `deliverySchedules` (`resolveDeliverySchedule`, `evaluateSchedule`, `deadlineStatus`); nothing re-implemented. |
| `outboundHoldStore.ts` | The demo's overlay for holds, overrides and retractions (`outbound_holds_v1`). `outboundQueueActions.ts` consults it so a held message is not sent. |
| `mockOutboundQueueService.ts`, `httpOutboundQueueService.ts`, `outboundQueueServiceInstance.ts` | The demo's wiring, the server version (7 routes) and the choice between them. |

Screen: `pages/OutboundQueuePage/`; hook: `hooks/useOutboundQueue.ts`.

## Batch 620 (part E)

The cancer registry adapter also handles the US ePath registry (`epath_npcr_us`): a signed-out US report is prepared by `usEpath/prepareEpathSubmission.ts`; one that passes is queued with the profile's transport, one that fails is `HELD` with the reason `HOLD_EPATH_PROFILE` and fixed review codes (words under `outboundQueue.registryReview`).

## Batch 620 (part S)

The registry feed is now the cancer adapter combined with `batchRegistryFeed/screeningRegistryFeed.ts`: submissions to screening programmes that have a batch profile (ids prefixed `scr:`, kind `screening:<registryId>`, transport sftp). A retry puts the entry back in the queue for the next file. `scheduleBinding.registryKeyOf` understands the `screening:` prefix.

## Batch 669 (finding ops-2, Pete's ruling: remove, do not build)
The `deadLettered` state is gone from `OUTBOUND_STATES`, `stateOf`, the sort order and the actions table, together with its tile and `outboundQueue.state.deadLettered`. Nothing in the dispatch code ever set `maxRetriesExceeded` to true, so the state could not occur; a FAILED message is simply `failed` and can be retried (and held or retracted as before). `maxRetriesExceeded` stays on the feed entry (the feeds still carry it); it no longer changes the state. If a retry limit is built later, add the state back with the code that sets it. `docs/architecture/OUTBOUND_QUEUE_API.md` needs the same edit (states table, precedence line, open-states line).
