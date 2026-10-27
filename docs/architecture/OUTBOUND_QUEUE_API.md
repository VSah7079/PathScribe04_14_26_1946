# Outbound Queue API (Batch 619, PS-800)

One queue screen for everything PathScribe sends out: results, patient ADT, accession messages, LIS sync, billing charges,
report delivery, cytology results, referrals, molecular orders and registry submissions. Browser side:
`src/services/outboundQueue/` (`IOutboundQueueService`), the screen `src/pages/OutboundQueuePage/`, reached from Home → Quality & Compliance
(`/outbound-queue`, capability `screen:outbound-queue:open`). Server version: `httpOutboundQueueService.ts`, chosen in
`outboundQueueServiceInstance.ts` (component `delivery`). Route style: HTTP_SERVICES_PATTERN.md §7.

## 1. Who owns what

PathScribe owns **what is sent and when**: the rules, the delivery schedule (`DELIVERY_SCHEDULES_API.md`), the queue, each message's status and the audit.
The interface engine owns **how**: translation, transport (REST + mTLS, SFTP, portal upload), transport retry and acknowledgements.
An acknowledgement from the engine (or a registry's rejection log) **updates the message's status here**, so this queue is the single source of truth.
The server is the owner of holds, releases, retractions and overrides; the browser lists and asks. The demo (no API server) keeps them in
`outboundHoldStore.ts` (browser storage key `outbound_holds_v1`, cleared by Demo Reset).

## 2. The common item

```json
{
  "ref": "registry:9f1c",            "feed": "registry",        "id": "9f1c",
  "destination": "registry",         "transport": "sftp",
  "kind": "seer",                    "state": "rejected",
  "queuedAt": "2026-10-01T09:00:00Z","scheduledFor": "2026-10-01T13:00:00Z",
  "attempts": 1,                     "errorCode": "DISPATCH_TIMEOUT",
  "accessionNumber": "S26-1234",     "facilityId": "fac-2",
  "hold":   { "reason": "dataCheck", "note": "…", "heldBy": "Dr Test", "heldAt": "…" },
  "closedReason": "duplicateSubmission",
  "rejection": { "errorCodes": ["E01", "E22"], "fatal": false, "correctionDueAt": "2026-10-19T00:00:00Z" },
  "deadline":  { "dueAt": "2026-10-31T00:00:00Z", "flag": "dueSoon" },
  "amendsRef": "registry:7a20",
  "billing": { "billingType": "TC", "scheduledReleaseAt": "…", "overriddenBy": "u-123", "needsReview": "unmappedCpt",
               "amendmentDelta": true, "retraction": { "reasonCode": "caseAmended" } }
}
```

* `ref` = `<feed>:<id>`, unique across feeds. Feeds: `result, patient_adt, accession, lis_sync, billing, report_delivery, cytology_result, referral, molecular_order, registry`.
* `destination` is a fixed id (`interfaceEngine, billingSystem, lisPartner, deliveryService, registry`); `transport` (`restMtls, sftp, portalUpload`) is shown as part of the destination label only.
* `accessionNumber` is the case's accession number (an identifier, shown with `data-phi`). It is sent only for feeds that name a case; patient, batch and barcode identifiers are not sent to the screen.
* `errorCode` and `rejection.errorCodes` are **fixed codes only**. The registry's or receiver's message text and locations can quote patient data and never reach this queue (the Registry Exceptions screen keeps them).
* `scheduledFor` is when the message goes: the delivery schedule's next time (`evaluateSchedule`); otherwise when it was queued.
* No names: `heldBy` is a display name for a hold (staff are not patient PHI); `billing.overriddenBy` and the audit text carry a user **id**, never a name.

### States

| State | Meaning | Actions allowed |
|---|---|---|
| `waiting` | queued, goes at its scheduled time | hold; billing: retract, release now |
| `held` | a person stopped it | release; billing: retract, release now |
| `sent` | the engine has it | none |
| `acknowledged` | the receiver confirmed (engine acknowledgement) | none |
| `failed` | a send failed (Batch 669: there is no separate dead-lettered state; nothing set one, so a message past its retries is also `failed`. Section 7 plans how a message that has used up its retries is flagged, alerted and replayed, still without a new state) | hold, retry; billing: retract |
| `rejected` | a registry returned it with validation errors | retry (fix and resubmit, with a reason), mark not reportable |
| `notReportable` | closed by a person after a rejection | none (terminal) |
| `retracted` | a queued charge cancelled before release because the case was amended or retracted | none (terminal) |

Precedence when several apply: closed (`notReportable`, `retracted`) → `rejected` → `sent`/`acknowledged` → `held` → `failed` → `waiting`.
A sent message is never shown held.

### Registry rejections

A central registry answers a submission with an acknowledgement. When it carries validation errors the **server/engine acknowledgement updates the
entry to `rejected`**: `rejection.errorCodes` (sorted, no text), `fatal` (the registry will not take a resubmission as it is) and `correctionDueAt`
(from the registry; the demo allows 14 days from the acknowledgement). The rejected item waits for a coder or pathologist:

* **fix and resubmit** = `retry` with a `reason` (`dataCorrected, codingCorrected, pathologistCorrected, other`). A rejected item without a reason is refused `reasonRequired`. The entry goes back to `waiting` and its rejection clears.
* **mark not reportable** = `markNotReportable` with a reason (`notReportableCondition, outsideJurisdiction, duplicateSubmission, other`). Terminal.

### Reporting deadlines

`deadline.dueAt` is sign-out plus the schedule's `reportingDeadlineDays` (facility override else enterprise else default). The status comes from
`deadlineStatus()` in `services/deliverySchedules/deliverySchedule.ts` and is not re-implemented: `ok` → `ok`, `near` (within 3 days) → `dueSoon`, `overdue` → `overdue`.
Only open messages (`waiting, held, failed, rejected`) are flagged. The list is sortable by `deadline` (overdue first) and filterable by flag; `deadlineCounts` feeds the counts tile.

### Amended reports

An amended report that the schedule re-queues (`amendmentRequeues`) is a **new item** with `amendsRef` naming the item it amends. The original keeps its state.

## 3. Routes

All `POST` (the arguments include lists or objects). Answers use the `ServiceResult` shape; failures are the fixed codes of HTTP_SERVICES_PATTERN.md §4.

| Method | Route | Body | Answer |
|---|---|---|---|
| `list` | `POST /api/delivery/outbound-queue/list` | `{ filter, sort }` | `{ items, counts, deadlineCounts, billingCounts, facilityIds }` |
| `hold` | `POST /api/delivery/outbound-queue/hold` | `{ refs, reason, note? }` | `{ results: [{ ref, ok, refusal? }] }` |
| `release` | `POST /api/delivery/outbound-queue/release` | `{ refs }` | `{ results }` |
| `retry` | `POST /api/delivery/outbound-queue/retry` | `{ refs, reason? }` | `{ results }` |
| `markNotReportable` | `POST /api/delivery/outbound-queue/mark-not-reportable` | `{ refs, reason, note? }` | `{ results }` |
| `retract` | `POST /api/delivery/outbound-queue/retract` | `{ refs, reason }` | `{ results }` |
| `overrideRelease` | `POST /api/delivery/outbound-queue/override-release` | `{ refs }` | `{ results }` |

`filter` = `{ feeds?, states?, deadlines?, facilityIds?, search?, needsReview? }` (`search` matches the accession number; an item with no known facility appears only when `facilityIds` is absent).
`sort` = `{ key: state | deadline | scheduledFor | queuedAt | feed | attempts, direction }`. `counts` are per state over the feed, facility, search and review filters but **not** the state filter.
The server applies the caller's facility scope on top of `facilityIds`.

A bulk action checks its capability **once** for the selection, then answers **one result per ref** (a refusal for one does not stop the rest). Refusals: `notPermitted, notFound, notHoldable, notHeld, notRetryable, notRejected, notRetractable, notReleasable, reasonRequired, failed`.
A write that changes nothing is not audited. A hold reason outside the list is stored as `other`; a note is cut to 200 characters and must carry no patient detail.

## 4. Capabilities and audit

| Action | Capability | Audit event (no patient text) |
|---|---|---|
| view the screen | `screen:outbound-queue:open` | – |
| `hold` | `interface:outbound:hold` | `OUTBOUND_MESSAGE_HELD` (feed, reason; not the note) |
| `release` | `interface:outbound:release` | `OUTBOUND_MESSAGE_RELEASED` |
| `retry` | `interface:outbound:resend` | `OUTBOUND_MESSAGE_RETRIED` / `OUTBOUND_MESSAGE_RESUBMITTED` (error-code count and reason) |
| `markNotReportable` | `interface:outbound:mark-not-reportable` | `OUTBOUND_MESSAGE_NOT_REPORTABLE` (reason) |
| `retract` | `interface:outbound:retract` | `OUTBOUND_CHARGE_RETRACTED` (billing type, reason) |
| `overrideRelease` | `interface:outbound:override-release` | `OUTBOUND_CHARGE_RELEASE_OVERRIDDEN` |

Each audit entry carries the accession number and facility, the acting user's display name in `user`, and no other identifier. All are high risk and seeded to Admin (AUTHORIZATION_API.md).
The Audit Log → Interfaces → Outbound view and the browser's Dispatch Now / Retry refuse a held message (`onHold`); the server's dispatcher must skip held messages too.

## 5. Billing feed adapter

Billing release runs through this queue. A billing implementation plugs in by supplying `IBillingFeedAdapter` (`billingFeedAdapter.ts`); the queue does not change.

```ts
interface IBillingFeedAdapter {
  listBillingItems(): Promise<OutboundFeedEntry[]>;                         // every charge, with its `billing` detail
  hold(id, reason, note, heldBy): Promise<boolean>;                         // stop it going out; false if gone or already sent
  release(id, options?: { overriddenBy?: string }): Promise<boolean>;       // un-hold; with overriddenBy (a user id), release NOW ahead of schedule
  retry(id): Promise<boolean>;                                              // failed → waiting
  retract(id, reason, retractedBy): Promise<boolean>;                       // cancel before release; terminal
}
```

Billing item detail (all optional): `billingType` (`TC`, `26`, `Global`); `scheduledReleaseAt` (from `resolveDeliverySchedule` + `evaluateSchedule`); `overriddenBy` (user id); `needsReview` (`unmappedCpt`, `missingTechnicalFacility`, `amendmentDelta`: parked for a person);
`amendmentDelta` (a delta charge from an amended case, always routed to review); `retraction.reasonCode` (`caseAmended, caseRetracted, duplicateCharge, other`).
The adapter reports them; the queue shows them, counts `needsReview` and `amendmentDelta` (`billingCounts`) and never works them out. The technical charge and the professional -26 line of PS-336 are two items with their own `billingType` and schedule.
The demo's adapter reads the existing charge queue and keeps hold, override and retraction in the hold store.

## 6. Tests

`outboundQueueView.test.ts` (states, filter, sort, counts, deadlines, billing fields), `outboundQueueService.test.ts` (every action, capability refusal, bulk results, audit text, registry resubmit, billing retract/override),
`registryFeedAdapter.test.ts`, `billingFeedAdapter.test.ts`, `scheduleBinding.test.ts`, `httpOutboundQueueService.test.ts` (verb, path and body of every method), `OutboundQueuePage.test.tsx`.

## 7. Dead letters: retry threshold, alert, list and replay (PLANNED: nothing here is built)

**Status: Planned. This is the contract for the API server and the queue; the front end has no dead-letter code (Batch 669f removed the dead-lettered state and tile because nothing set it).** Pete's direction (Oct 24, 2026): handle dead letters upstream (alerts, notification hooks, a queue-management tool) and keep the Outbound Queue screen lean: no tile.

### 7.1 Who owns what

* The **interface engine / BridgeLink** owns transport retry (backoff, acknowledgement timeouts). It reports each failed attempt to the API server.
* The **API server** owns the retry policy, the count, the decision that a message has used up its retries, the alert, and replay. The count is the item's `attempts` (section 2); an HL7 message retried by BridgeLink counts its attempts into the same field.
* The front end only **shows** the result and **asks** for a replay. It holds no timers, no counters and no retry logic (serverless rule: CLAUDE.md rule 11). Retries are scheduled as delayed queue messages, not by a long-running process.

### 7.2 Retry threshold (the policy)

One policy per feed (optionally per destination), edited by an administrator and stored with its own version.

```json
{
  "feed": "registry", "destination": "registry",
  "maxAttempts": 5,
  "backoff": { "kind": "exponential", "baseSeconds": 60, "capSeconds": 3600, "jitter": true },
  "giveUpAfterSeconds": 86400,
  "version": 3, "updatedBy": "u-123", "updatedAt": "2026-10-24T18:00:00Z"
}
```

| Method | Route | Body | Answer |
|---|---|---|---|
| `getRetryPolicies` | `POST /api/delivery/outbound-queue/retry-policy/list` | `{}` | `{ policies }` (one per feed, with the default shown as `source: "default"`) |
| `setRetryPolicy` | `POST /api/delivery/outbound-queue/retry-policy/set` | `{ feed, destination?, maxAttempts, backoff, giveUpAfterSeconds, reason }` | `{ policy }` |

* A message **gives up** when a send fails and `attempts >= maxAttempts` **or** the time since the first failure exceeds `giveUpAfterSeconds`, whichever comes first. Both are optional; a policy must set at least one. Bounds: `maxAttempts` 1 to 20, `giveUpAfterSeconds` 60 to 30 days.
* Proposed defaults (Pete to confirm): `report_delivery`, `result`, `lis_sync`, `patient_adt`, `accession`: 5 attempts over 4 hours. `billing`: 8 attempts over 48 hours. `registry`: 5 attempts over 24 hours, and never later than the message's own reporting deadline minus one day, so a registry submission is not retried silently past its due date.
* A change to the policy applies to **future failures**; it never re-opens a message that already gave up. Every change is audited (`OUTBOUND_RETRY_POLICY_CHANGED`: feed, old and new values, reason) and needs `config:outbound-retry-policy:manage` (new, high risk, Admin).

### 7.3 What "gave up" looks like on the item

There is **no new state**: the message stays `failed` (section 2), and automatic retries stop. The server adds one object and sets the existing flag:

```json
{ "state": "failed", "maxRetriesExceeded": true,
  "deadLetter": { "at": "2026-10-24T18:20:00Z", "attempts": 5, "firstFailedAt": "2026-10-24T14:20:00Z",
                  "lastErrorCode": "DISPATCH_TIMEOUT", "policyVersion": 3, "replayCount": 0 } }
```

* `maxRetriesExceeded` (already on every feed's queue entry type) becomes **true exactly when `deadLetter` is present**. Today nothing sets it.
* `lastErrorCode` is a fixed code only (section 2); never the receiver's message text.
* The list route gains a filter `deadLettered?: boolean` (true: gave up; false: still being retried) and a sort key `deadLetteredAt`, so the existing Outbound Queue screen can offer one filter chip, **Gave up (retry limit)**, instead of a tile. `counts` gains `deadLettered` (a count over the same filters, not a state).
* Audit, once, by the system: `OUTBOUND_MESSAGE_DEAD_LETTERED` (feed, destination, attempts, last error code, policy version; accession number and facility as for every outbound audit entry; no patient text).

### 7.4 Alert and webhook

When a message gives up the server emits one event. Delivery is **upstream of the screen**: a webhook, an event-bus topic, or both.

```json
{
  "event": "outbound.message.dead_lettered", "id": "evt_01H...", "at": "2026-10-24T18:20:00Z",
  "ref": "registry:9f1c", "feed": "registry", "destination": "registry", "facilityId": "fac-2",
  "attempts": 5, "firstFailedAt": "2026-10-24T14:20:00Z", "lastErrorCode": "DISPATCH_TIMEOUT",
  "deadlineFlag": "dueSoon", "policyVersion": 3
}
```

* **No patient data in the alert**: no accession number, name, MRN or message text. The `ref` lets a person find the item behind sign-in. (Alerts go to e-mail, chat and pager systems outside PathScribe's control.)
* A resolution event, `outbound.message.dead_letter_resolved` (`ref`, `how: replayed | closed`, `at`), lets the receiving system close its own ticket.
* **Subscriptions** are stateless REST resources, managed in Configuration → Integrations (administrators), with `config:outbound-alerts:manage` (new, high risk, Admin):

| Method | Route | Body | Answer |
|---|---|---|---|
| `listAlertSubscriptions` | `POST /api/delivery/outbound-queue/alert-subscriptions/list` | `{}` | `{ subscriptions }` (the secret is never returned) |
| `saveAlertSubscription` | `POST /api/delivery/outbound-queue/alert-subscriptions/save` | `{ id?, kind: webhook \| eventBus, url? \| topic?, feeds?, facilityIds?, minDeadlineFlag?, aggregate?, enabled }` | `{ subscription, secretOnce? }` |
| `deleteAlertSubscription` | `POST /api/delivery/outbound-queue/alert-subscriptions/delete` | `{ id }` | `{ ok }` |
| `testAlertSubscription` | `POST /api/delivery/outbound-queue/alert-subscriptions/test` | `{ id }` | `{ ok, status }` (sends a clearly marked test event) |

* Webhooks are signed (HMAC-SHA256 over the body, timestamp in the header, a secret shown once and rotatable) and authenticated to the receiver as OAuth2 client credentials where the receiver supports it. The webhook call is itself retried with backoff and is **not** a dead-letter source for the outbound queue (a failing webhook raises an audit entry and, after its own limit, disables the subscription and tells the administrators).
* **De-duplication and storms:** one event per message (a replay that fails again gives up again and emits a new event with `replayCount` incremented). `aggregate: { windowSeconds, minCount }` turns a burst (for example the receiver is down) into one summary event with counts per feed and destination, so a pager is not flooded.
* The audit and the event are written in one transaction with the state change (outbox pattern), so an alert is never lost or sent for a change that did not commit.

### 7.5 Listing dead letters

Use the existing `list` with `filter.deadLettered = true` (section 3); the item carries `deadLetter`. Facility scope applies as always. For an export (support, vendor escalation) add:

| Method | Route | Body | Answer |
|---|---|---|---|
| `exportDeadLetters` | `POST /api/delivery/outbound-queue/dead-letters/export` | `{ filter }` | `{ downloadUrl, expiresAt }` (a CSV of fixed fields only: ref, feed, destination, facility, attempts, first failure, last error code, replay count; no accession numbers) |

Export needs `interface:outbound:export-dead-letters` (new, high risk) because a list of failed deliveries for a facility is operationally sensitive; the file is a short-lived bucket link, not a stream.

### 7.6 Replay

| Method | Route | Body | Answer |
|---|---|---|---|
| `replayDeadLetters` | `POST /api/delivery/outbound-queue/dead-letters/replay` | `{ refs, reason, replayId }` | `{ results: [{ ref, ok, refusal? }] }` |
| `closeDeadLetters` | `POST /api/delivery/outbound-queue/dead-letters/close` | `{ refs, reason, note? }` | `{ results }` |

* `replay` returns the message to `waiting` with `attempts` reset to 0 (the earlier count is kept in `deadLetter.previousAttempts` and `replayCount` goes up) and the **current** policy applies to it.
* `replayId` is a client-chosen **idempotency key**: the same `replayId` sent twice (a double click, a retry after a timeout) replays once and returns the first answer.
* One call may carry up to 500 refs. The server throttles the release into the queue (so a replay of many messages cannot flood a receiver that has just recovered) and answers `throttled` for refs it did not release; they stay dead-lettered and can be replayed again.
* `reason` is a fixed list (`receiverRecovered, dataCorrected, configurationFixed, other`) plus an optional note (200 characters, no patient detail), as for holds.
* `close` ends a dead letter without sending (the message is no longer needed): reasons `duplicateSubmission, notNeeded, sentByOtherMeans, other`. It leaves the message `failed` with `deadLetter.closedAt`; it cannot be replayed afterwards. A billing charge is retracted with the existing `retract` instead.
* Refusals (per ref, in addition to those in section 3): `notDeadLettered, onHold, alreadyReplayed, throttled, closed`. A held message is never replayed (section 4).
* Capabilities and audit: `replay` needs `interface:outbound:replay-dead-letter` and `close` needs `interface:outbound:close-dead-letter` (new, high risk; each requires `screen:outbound-queue:open`). Audit: `OUTBOUND_DEAD_LETTER_REPLAYED` (feed, count, reason) and `OUTBOUND_DEAD_LETTER_CLOSED` (feed, count, reason); one entry per bulk call with the count, and one per ref for billing and registry feeds.
* Separation of duties (open): for the `billing` feed, whether the person who changed a retry policy or a charge mapping may also replay its dead letters (see SEPARATION_OF_DUTIES in `capabilityCatalog.ts`).

### 7.7 Retention

A dead letter stays listed for 90 days after it gave up (configurable, 30 to 365), then the entry moves to archive storage with its audit trail; the audit entries are never deleted by this. The screen stops listing it; the export route can still produce it for a date range within the archive window.

### 7.8 What the front end will do when this is built

* One filter chip on the Outbound Queue, **Gave up (retry limit)**, and a **Replay** action (with the reason picker) and **Close** action on those rows; both are greyed out without their capability. No tile, no dashboard.
* Configuration → Integrations gets two small stateless panels: **Retry limits** (7.2) and **Alert destinations** (7.4). Each is documented in the Administrator Guide when built.
* The User Guide Outbound Queue article and the Administrator Guide sections are written at that time; until then they say a message past its retries stays Failed and can be retried by hand.

### 7.9 Open decisions for Pete

1. The default thresholds in 7.2 (and whether registry gives up before its due date minus one day).
2. Who receives dead-letter alerts by default (the Interface Analyst role? a facility distribution list?) and whether the first release ships webhook only, or event bus too.
3. Whether replay on the billing feed needs a second person (dual approval) or only a reason.
4. The retention period (7.7).
5. Whether a message that gave up may be edited (for example a corrected registry field) before replay, or whether correction always goes through the registry resubmit path (section 2, rejected items).

### 7.10 Contract tests the server must pass (when built)

A message gives up exactly at `maxAttempts` or `giveUpAfterSeconds`; policy changes do not reopen finished messages; one event per give-up and none for a held or retracted message; no PHI in the event body; the event and the state change commit together; the same `replayId` replays once; a replay of 500 refs is throttled and the rest remain replayable; a held message is refused; each action checks its capability once for the bulk call and answers per ref.
