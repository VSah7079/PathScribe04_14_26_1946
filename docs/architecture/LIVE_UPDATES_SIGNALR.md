# Live updates: the SignalR hub on the PathScribe API server

**Status:** specification for the API server team. The browser side is built and tested (Batch 342, Jira PS-262); the hub itself is not built yet.
**Decision (Pete, Sep 26, 2026):** the PathScribe API server is **ASP.NET Core**, and live updates use **SignalR**. This follows the Sep 2026 decision that the production database is Microsoft SQL Server.

## 1. What it's for

Some screens must show changes made on other devices straight away:

- **OR Suite Live Board.** Wall displays and room workstations in the operating theatres. When a circulating nurse dismisses a case on one terminal, every other board showing that OR updates **within 500 ms** (the RFP's "Multi-Board Sync" requirement).
- **Intraop Queue.** The pathology-side list of frozen sections. New sessions, diagnoses, dismissals and merges from any device appear without a reload.

- **Network print results** (Batch 347, Jira PS-54). When a label goes to a "Direct via Interface Engine" printer, the engine's answer (printed, or why not) comes back to the user who sent it. See §10.

Other polling screens can use the same hub later with new event types: messaging (20 s poll), the Facility Ops dashboard (20 s), and the engraver monitor (30 s).

## 2. What already exists in the browser

All of this is in `src/services/liveUpdates/`:

| File | What it does |
|---|---|
| `liveUpdateContract.ts` | **The wire contract, and the source of truth for this spec:** hub path, method names, event and scope types, validation |
| `liveUpdatePolicy.ts` | Reconnect back-off, fallback polling, scope matching and combining, duplicate filter, transport choice |
| `signalRLiveUpdateService.ts` | The client: `@microsoft/signalr` 10, automatic reconnect that never gives up, scope re-sent and screens re-read after every reconnection. Batch 549: `retryNow()` starts a waiting restart at once when the browser comes back online, instead of waiting out the back-off (called by `hooks/useConnectionBanner.ts` on the `online` event) |
| `localLiveUpdateService.ts` | Used when no hub is configured (development, demo): the mock services publish writes to this browser's own windows |
| `testing/fakeSignalRHub.ts` | **Test only.** A minimal server speaking the SignalR JSON hub protocol, used by `signalRProtocol.integration.test.ts` to run the real client end to end. It shows the behaviour this hub must have |

The screens use it through `hooks/useLiveIntraopUpdates.ts`. It re-reads through the normal service call on each change, coalesces bursts into one refresh (100 ms), polls every 15 s without a live connection and every 60 s as a safety net while live, and shows a connection badge.

**Client configuration:** `VITE_LIVE_UPDATES_HUB_URL=https://<api-host>/hubs/live`. Production requires https; development also allows loopback http. If it's not set, the app uses the local transport and polling.

## 3. The hub

- **Path:** `/hubs/live`. One hub for all live updates to browsers. *(Batch 546: the site agent has its own hub, `/hubs/agent`, on its own host name with client certificates, `SITE_AGENT_API.md` §2 and §4. Browsers never use it.)*
- **Protocol:** JSON hub protocol v1. MessagePack is optional later; the client would need `@microsoft/signalr-protocol-msgpack`.
- **Transports:** WebSockets first. Leave Server-Sent Events and long polling enabled as fallbacks: some hospital proxies block WebSockets, and the client negotiates automatically.
- **Keep-alive:** `KeepAliveInterval` 15 s and `ClientTimeoutInterval` 30 s (the defaults). They match the client's default server timeout of 30 s.

### Methods

| Direction | Name | Arguments | Returns |
|---|---|---|---|
| client → server | `SetIntraopScope` | `IntraopScope { locationIds: string[], all: bool }` | `SetIntraopScopeResult { acceptedLocationIds: string[], rejectedLocationIds: string[], all: bool }` |
| server → client | `IntraopChanged` | `IntraopChangedEvent` (below) | — |
| server → client | `PrintJobStatus` | `PrintJobStatusEvent` (§10) | — |
| server → client | `WsiScanBatchChanged` | `WsiScanBatchChangedEvent` (§11) | — |
| client → server | `SetDataTopics` | `DataTopicScope` (§14, Batch 559) | `SetDataTopicsResult` |
| server → client | `DataChanged` | `DataChangedEvent` (§14, Batch 559) | — |
| client → server | `JoinCasePresence` | `CasePresenceJoin` (§15, Batch 573) | `CasePresenceJoinResult` |
| client → server | `SetCasePresenceEditing` | `ref: string, presenceId: string, editing: bool` (§15) | — |
| client → server | `LeaveCasePresence` | `ref: string, presenceId: string` (§15) | — |
| server → client | `CasePresenceChanged` | `CasePresenceChangedEvent` (§15) | — |

- **Replaces, not adds:** `SetIntraopScope` sets the connection's whole scope. The server removes the connection from the groups it no longer asks for and adds it to the new ones.
- **When the client calls it:** after every connect and every reconnect (groups don't survive a reconnection), and when a screen's scope changes (e.g. Multi-Suite Overview).
- **Combined scope:** one browser window keeps one connection and sends the union of its screens' scopes.

### `IntraopChangedEvent`

| Field | Type | Notes |
|---|---|---|
| `v` | int | Contract version, `1`. Clients ignore other versions |
| `eventId` | string | Unique per event: use the outbox row's `MessageId` (`MESSAGE_BUS_API.md` §3.1). Clients drop duplicates |
| `kind` | string | See the table below |
| `sessionId` | string | The intraoperative session |
| `specimenId` | string? | When the change is about one specimen |
| `locationId` | string? | The session's OR location. Boards subscribe by location |
| `facilityId` | string? | |
| `occurredAt` | string | Commit time, ISO 8601 UTC |

**Identifiers only: never names, MRNs, diagnoses or free text.** OR wall displays are shared screens. The client only uses the event as a signal to re-read through the normal authorised API, so an event never grants access to data.

| `kind` | Sent after (today's mock-service method) |
|---|---|
| `session.created` | `createSession`, and each session in `seedOrBoardDemoData` |
| `specimen.added` | `addSpecimen` |
| `specimen.progressed` | `addMilestone`, `addPreparationOutput`, `addDigitalAsset` |
| `diagnosis.rendered` | `setFrozenSectionDiagnosis` |
| `verbal.reported` | `recordVerbalReport` |
| `specimen.dismissed` | `dismissFromBoard` |
| `session.merged` | `merge` |

`src/services/intraop/mockIntraoperativeService.ts` publishes exactly these (`announceIntraopChange`). The API server's intraop endpoints must publish the same.

## 4. Authentication

- **Users:** the API's normal bearer token (SSO, Jira PS-60). Browsers can't set headers on WebSockets, so SignalR sends the token as `access_token` in the query string. Read it in `JwtBearerEvents.OnMessageReceived` for requests to `/hubs/live`, and keep it out of access logs.
- **OR terminals:** the board route is a public kiosk page with no user signed in. Each terminal needs a **device token**:
  - issued when an administrator registers the terminal (System → OR Suite Terminals);
  - bound to the terminal id, the tenant and the locations it may show (its own location, plus its facility's locations if Multi-Suite is allowed);
  - revocable, and rotated on a schedule.
- **Client side:** since Batch 343 (PS-60) the client sends the signed-in user's SSO access token (`services/auth/accessTokenSource.ts`). Password (demo) sessions and the OR boards have no token yet; the terminal's device token is still to come. **The hub must refuse unauthenticated connections;** those screens then stay on 15-second polling.

## 5. Authorisation (`SetIntraopScope`)

- **Tenant isolation:** group names carry the tenant, so no connection can join another tenant's groups:
  - `t:{tenantId}:intraop:loc:{locationId}`
  - `t:{tenantId}:intraop:all`
- **Locations:** accept only the locations this principal may see (a terminal's allowed set, or a user's facility access). Everything else goes back in `rejectedLocationIds`; the client logs it.
- **`all`:** only for users with intraop queue access (pathologists and intraop staff), never for terminals.
- **Rate limit:** a few `SetIntraopScope` calls per second per connection is plenty.

## 6. Publishing: after the commit, never before

The client re-reads as soon as it gets an event. An event sent before the transaction commits would make every board re-read the old data. That is exactly what the browser check showed when the test harness published early (§8).

- **Transactional outbox:** each intraop write inserts an outbox row (`eventId`, `kind`, ids, `occurredAt`) **in the same transaction** as the change. Since Batch 542 this is the `bus.Outbox` table of `MESSAGE_BUS_API.md` (decision D1); the dispatcher there sends live-update events straight to the hub.
- **Dispatcher:** an `IHostedService` sends pending outbox rows to the groups through `IHubContext<LiveHub>`, then marks them sent. Delivery is at least once, and clients drop duplicates by `eventId`.
  - Wake the dispatcher right after a commit (an in-process channel), and also poll every 100 ms or less as a fallback, so the 500 ms budget holds.
- **Which groups:**
  - an event with a `locationId` goes to `…:loc:{locationId}` and `…:all`;
  - one without a `locationId` goes only to `…:all`.
- **No replay:** the client re-reads after every (re)connection, so events missed while disconnected need no replay.

## 7. Scale-out and deployment

- **Public cloud (Azure):** Azure SignalR Service in Default mode. The API servers stay stateless; no sticky sessions needed.
- **Private cloud:** the Redis backplane (`Microsoft.AspNetCore.SignalR.StackExchangeRedis`) across API instances, or a single instance.
  - Without Azure SignalR Service, the load balancer needs **sticky sessions**, because negotiate and connect must reach the same node.
  - Enable WebSockets on the load balancer, with an idle timeout above 15 s.
- **CORS:** allow the app's origin with credentials. SignalR's negotiate request is cross-origin when the API is on another host.

## 8. Acceptance tests for the hub

1. **Contract.** Run the same scenario as `src/services/liveUpdates/signalRProtocol.integration.test.ts` against the real hub, using the real `@microsoft/signalr` client:
   - two boards (different locations) and a queue connect;
   - scopes are accepted;
   - an event reaches only the matching board and the queue;
   - every connection recovers after the server drops it, re-sends its scope and re-reads.
2. **Latency.** From commit to the second board showing the change: **p95 under 500 ms** with at least 50 connected boards. Browser checks with the test hub (Chromium, dev server, loopback, including the board's re-read):
   - hub publish to the other board's rows: 129 ms;
   - a dismissal on board A to the row gone on board B: 83 ms;
   - a new session to the Intraop Queue: 203 ms.
   Over loopback, the client alone received events in about 10 ms.
3. **Recovery.** Stop the hub for 5 minutes, then restart it. Every board shows *Reconnecting…* or *Offline*, keeps polling every 15 s, returns to *Live* without a reload, and re-reads.
4. **Authorisation.** A terminal can't subscribe outside its allowed locations or to `all`, a user can't reach another tenant, and an unauthenticated connection is refused.
5. **No PHI** in any hub message (automated check on captured frames).

## 9. Open items

- **Network print results (§10):** the API endpoints, the engine's credential, and a way to re-read a job's status after a reconnect are all still to be built.

- **Device tokens** for OR terminals. User tokens are wired (Batch 343; see `AUTHENTICATION_OIDC.md`).
- ~~Runtime configuration~~: since Batch 547 `VITE_LIVE_UPDATES_HUB_URL` is set per deployment in its `config.json` (`RUNTIME_CONFIG.md`).
- **Other screens** (messaging, Facility Ops, engraver monitor) can move onto this hub with their own event types and methods.

## 10. Network print results (Batch 347, Jira PS-54)

**What the user sees:** a label sent to a *Direct via Interface Engine* printer stays in a small list at the bottom left of the screen:
- *sent, waiting for the printer*;
- *printed* (for a few seconds);
- *did not print* with the reason, plus **Retry** and **Dismiss**.

A label with no answer after two minutes can be retried too.

**Retry is manual only** (Pete, Sep 26). An automatic retry could print a label twice when it did print but the answer was lost.

### The path

1. **Browser → API server:** `POST /api/print/jobs` with the `NetworkPrintPayload` (`src/types/printing/NetworkPrintPayload.ts`). Today the browser only records it (`dispatchNetworkPrintJob`, a stub); this is the call to add.
2. **API server → interface engine:**
   - The server forwards the job and sets `callbackUrl` to its own absolute address for the callback endpoint. The browser sends the relative placeholder `/api/print/callbacks`.
   - It stores the job: `eventId`, `idempotencyKey`, `attempt`, tenant, and the user who sent it.
3. **Interface engine → API server:** `POST /api/print/callbacks` with the `NetworkPrintCallback`: `eventId`, `status`, `printerResponse`, `durationMs`, `timestamp`.
   - Authenticate the engine with its own credential (client certificate or an engine token), never a user token.
   - Refuse a callback for a job the tenant doesn't have.
   - Callbacks may repeat: store the first and ignore the rest.
4. **API server → the user:** `PrintJobStatus` on the hub, sent with `Clients.User(userId)` to the user who sent the job (all their windows). There is no scope and no group.
   - Publish after the commit, through the same outbox as §6.
   - Each window ignores jobs it didn't send.

### `PrintJobStatusEvent`

| Field | Type | Notes |
|---|---|---|
| `v` | int | `1` |
| `eventId` | string | Unique per event (the outbox row's `MessageId`). Clients drop duplicates |
| `jobId` | string | The payload's `eventId` for this attempt |
| `idempotencyKey` | string | The same for every attempt at one label |
| `status` | string | `PRINT_SUCCESS`, `PRINTER_UNREACHABLE`, `PAPER_OUT`, `RIBBON_OUT`, `HEAD_OPEN`, `MALFORMED_ZPL`, `INVALID_GS1` |
| `printerResponse` | string? | The engine's own text, for the audit trail. Printer text only, never PHI |
| `durationMs` | number? | |
| `occurredAt` | string | ISO 8601 UTC |

The source of truth is `src/services/liveUpdates/liveUpdateContract.ts` (`HUB_PRINT_JOB_STATUS`, `parsePrintJobStatusEvent`).

### Retries and idempotency

- **What a retry sends:** the same payload with a new `eventId` (`{idempotencyKey}-R{n}`), `attempt` n, and the **same `idempotencyKey`**.
- **What the engine must enforce:**
  - A key that has **printed** (`PRINT_SUCCESS`) is never printed again. Answer a repeat with `PRINT_SUCCESS` and don't print.
  - A key whose attempts all failed may be printed on a retry.
- **Late answers:** an answer for an earlier attempt, arriving after a retry, is audited but doesn't change what the user sees.

### Payload additions in Batch 347

- `labelData.labelType`: `CASSETTE` or `SLIDE`. If absent, treat the label as a cassette.
- `labelData.slide`: `{ level, stainName }`, for slides.
- Template versions: `ZPL-CASSETTE-V3` or `ZPL-SLIDE-V1`.
- `attempt`.
- `eventId` values are now unique per label, even for a batch sent in the same millisecond. The old `EVT-{case}-{ms}` could repeat, and an engine enforcing the key would have dropped the repeats.

### Audit

The browser records these today; the server must write the same entries:
- *Network Print Dispatched*;
- *Network Print Succeeded* / *Network Print Failed*;
- *Network Print Retried*, with the user who retried.

The detail carries `eventId`, `idempotencyKey`, `attempt`, the status and the printer.

### Tests the server should pass

1. **Success.** A job and its success callback: exactly one `PrintJobStatus`, sent only to the sender's connections.
2. **Failure, then retry.** The engine gets the same `idempotencyKey` and prints once.
3. **Duplicate callback.** A second copy of a callback sends no second event.
4. **Wrong tenant or unknown job.** A callback from the wrong tenant, or for a job that doesn't exist, is refused.

### Not built yet

- **Re-reading a job's status after a reconnect or reload:** `GET /api/print/jobs/{eventId}`. Today the list lives in the tab's memory, and answers that arrive while a tab is closed are only audited.

## 11. WSI scan batches (Batch 434)

The Batch Management → Slide scanning page updates on its own when a scan batch changes: the scanner reports a slide (through the interface engine, `docs/architecture/INTERFACE_TRANSACTIONS.md`), or another tech loads, sends or unloads.

### `WsiScanBatchChangedEvent`

| Field | Type | |
|---|---|---|
| `v` | `1` | contract version |
| `eventId` | string | unique per event (the outbox row's `MessageId`); duplicates are dropped |
| `batchId` | string | the scan batch |
| `change` | `loaded` \| `sent` \| `sendFailed` \| `slideStatus` \| `unloaded` | what happened |
| `facilityId` | string? | the batch's lab (the scanner's) |
| `occurredAt` | ISO 8601 | when it was committed |

Ids only, never patient data; the page re-reads through its normal, authorised calls.

### Who gets it

Connections of users who can open Batch Management (`screen:batch-management:open`) in the batch's lab. No client call is needed to join: the server adds the connection to its labs' scan-batch groups when it connects. Publish after the commit (§6), from the same outbox.

### Browser side

`liveUpdateContract.ts` (`HUB_WSI_SCAN_BATCH_CHANGED`, `parseWsiScanBatchChangedEvent`), `subscribeWsiScanBatches` on both transports, and `hooks/useLiveWsiScanBatches.ts`. That hook re-reads, polling every 15 s without a live connection and every 60 s while live. In the demo, `digitalPathology/mockWsiScanBatchService.ts` publishes each write through the local transport.

## 12. Fax transmission reports (Batch 521, PS-281)

**Event:** `ReportDeliveryStatus`, server → client (`services/liveUpdates/liveUpdateContract.ts`):

```json
{ "v": 1, "eventId": "…", "queueEntryId": "<report delivery queue entry>", "status": "TRANSMITTED" | "TRANSMISSION_FAILED", "detail": "Busy", "occurredAt": "…" }
```

- **When.** The interface server sends it when a fax provider reports on a fax it submitted. The report arrives as the provider's webhook, or as the transmission report email to the sending address (`REPORT_DELIVERY_API.md`, "Transmission reports").
- **Content.** Ids and status only, no PHI.
- **Who receives it.** Users of the lab that sent the fax who can open the Audit Log.
- **What the browser does** (`services/delivery/deliveryRetries.ts`, `applyReportDeliveryStatus`):
  - TRANSMITTED confirms the delivery.
  - TRANSMISSION_FAILED fails the queue entry with the provider's reason, and the failure is retried on the lab's schedule, then dead-lettered like any other.
- **Duplicates** (same `eventId`) are ignored. A report for an entry this lab didn't send is ignored.

## 13. Export status (Batch 542, PS-539 phase 2c)

`ExportStatus` tells the user who asked for an export that it changed status (`ASYNC_EXPORT_API.md` §5). The server side is planned with the export endpoints (phase 2e). The browser handles it since Batch 550: `HUB_EXPORT_STATUS` and `parseExportStatusEvent` (`liveUpdateContract.ts`), `subscribeExports` on the live-update service, and the export notices.

- **Who gets it:** only the requester, with `Clients.User(userId)` (all their windows), like `PrintJobStatus` (§10). No scope and no group.
- **Payload:** `ExportStatusEvent` in `src/services/exports/asyncExportContract.ts`: `type`, `v` (the contract version), `eventId` (the outbox `MessageId`), `exportId`, `status`, `title`, `rowCount`. No patient data; the title is built from the screen name and date.
- **When:** `ready`, `failed`, `cancelled` and `expired`. Not `queued` or `running`: the requesting window already knows.
- **Published:** after the commit that changes the export's status, from the same outbox (§6).

## 14. Data topics: push instead of polling (Batch 559, PS-539 phase 2d)

Readiness review §5 lists the screens that re-read on a timer. One event serves them all: after a committed write that changes what a topic's screen shows, the server sends `DataChanged`, and the screen re-reads through its normal, authorised call. The event carries ids only and grants nothing. The browser side is in `src/services/liveUpdates/dataTopics.ts` (topics and rules) and `liveUpdateContract.ts` (`HUB_SET_DATA_TOPICS`, `HUB_DATA_CHANGED`, `parseDataChangedEvent`); the client is `subscribeData` on the live-update service. The screens are switched over in Batch 560.

**Topics:**

| Topic | Screen | Key | The server accepts it for |
|---|---|---|---|
| `registryExceptions` | the registry exceptions badge | none (the user's organisation) | `screen:registry-exceptions:open` |
| `messages` | the inbox | none: the server sends it with `Clients.User(userId)` to the recipient only, never to an organisation group | any signed-in user, for their own inbox |
| `facilityOps` | Facility Ops | facility id | the facilities whose summary the user can read |
| `heldReleases` | a case's reports waiting out the release delay | none (a case id can be an accession number, which a hub message never carries); the report page re-reads its own case | users of the organisation who can open the cases concerned |
| `engravers` | the Engraver Monitor | none (it lists the organisation's engravers) | `screen:batch-management:open` |
| `siteAgents` | Site agents, the Print Queue's agent line | site (facility) id | the sites whose agents the user can see (`config:site-agents:enroll` or `config:site-agent-config:manage`) |
| `interfaceEngines` | Interfaces → Engines, the Interfaces line | none | `interface:engine-status:view` |
| `molecularQueue` *(Batch 562)* | the Molecular Workcenter's Order Queue | none | `screen:molecular:open` |
| `caseReport` *(Batch 572)* | an open case report ("Someone else saved this case") | the case's **support reference** (`SR-XXXX-XXXX`: random, never derived from the case number, `ISupportReferenceService.ts`); never the case id, which can be an accession number | users who can open that case (the case access rules, `CASE_PRIVACY_MODEL.md`). Sent after **every committed write to the case** that moves its version (`row_version`), organ-map figures included, to every connection subscribed to that reference, **the writer's own included** (the writer's page has already moved its known version on, so it shows nothing). **The server issues the reference** (the browser gets it with the case) and keeps the reference → case mapping; `SetDataTopics` resolves each reference and checks the user may open that case, and answers a reference that doesn't exist exactly as one the user may not open (rejected, nothing more), so the answer never reveals whether a case exists. A case with no reference yet sends no event (the version check on save still applies) |

**Decided (Pete, Oct 14, 2026): one general event, `DataChanged` with topics, on the one hub, `/hubs/live`.** It replaces the separate `ReceiveExceptionCountUpdate` event and `/hubs/quality-metrics` hub first proposed in `REGISTRY_ACKNOWLEDGEMENT_API.md`. **A screen that needs live updates in future gets a topic here, not an event of its own:** the event says only what changed (a topic, and a facility or site id for a keyed topic), never the change itself, and the screen re-reads through its normal, authorised call.

*Batch 562: the molecular queue's `molecularQueueChanged` (`MOLECULAR_ORDERS_API.md` §6) is now the `molecularQueue` topic. The organ-map events (`ORGAN_MAPPING_API.md` §6) stay proposed: no screen polls for them.* *Batch 572 (Pete, Oct 14, 2026): an open case report now hears of any other save of its case through the `caseReport` topic, keyed by the case's support reference, and says so at once ("Someone else saved this case", with Show their changes, which takes the newer case up in place from Batch 575) instead of the next save being refused; the version check stays as the safety net. That covers `organMapFigureChanged`. `organMapConfigChanged` (configuration screens) stays proposed. Presence (who else has the case open) is Batch 573.*

**`SetDataTopics(DataTopicScope)`:**
- `DataTopicScope { topics: { topic, keys: string[] }[] }`: each topic once, keys sorted. A keyed topic with no keys isn't sent. At most 100 keys per topic, each at most 200 characters; the server refuses a larger scope.
- It replaces the connection's whole data scope, like `SetIntraopScope`. The server removes the connection from the groups it no longer asks for and adds it to the new ones (suggested group names: `data:<topic>` or `data:<topic>:<key>`, per organisation).
- The server checks each topic and key against the signed-in user (table above) and answers `SetDataTopicsResult { accepted, rejected }`. The client logs refusals; the screen's own read still decides what it shows.
- The client sends it after every connect and reconnect (groups don't survive a reconnection), and whenever a screen subscribes or leaves, one call at a time (a change made meanwhile is sent next). A failed call is retried on the reconnect back-off. An empty scope leaves every topic; the client sends one when its last data screen goes.

**`DataChangedEvent`:**

| Field | Type | Notes |
|---|---|---|
| `type` | `"DataChanged"` | |
| `v` | int | `1`; clients ignore other versions |
| `eventId` | string | the outbox `MessageId` (§6); clients drop duplicates |
| `topic` | string | one of the topics above |
| `key` | string | the facility or site for a keyed topic, or the case's support reference for `caseReport` (required there, at most 200 characters); absent otherwise. Never a patient identifier |
| `occurredAt` | string | ISO 8601 |

No other field is passed on, so nothing else (patient data included) reaches a screen.

**When:** after the commit (§6), once per write that changes what the topic shows. Bursts are fine: from Batch 560 the screens combine events that arrive within 100 ms into one re-read.

**The screens (Batch 560).** They use one hook, `src/hooks/useLiveData.ts`:

| Screen | Topic | Key | Interval before (kept without a live connection) |
|---|---|---|---|
| Registry exceptions badge (`hooks/useRegistryExceptionCount.ts`) | `registryExceptions` | | 60 s |
| Inbox (`contexts/MessagingContext.tsx`) | `messages` | | 20 s |
| Facility Ops | `facilityOps` | the display profile's facility | 20 s |
| Held reports banner (`hooks/useHeldReports.ts`) | `heldReleases` | | 5 s |
| Engraver Monitor | `engravers` | | 30 s |
| Site agents, per site (`hooks/useSiteAgents.ts`) | `siteAgents` | the site | 60 s |
| Interfaces → Engines (`hooks/useInterfaceEngines.ts`) | `interfaceEngines` | | 60 s, not while the tab is hidden |
| The Print Queue's agent line (`useSiteAgentCounts`) *(Batch 562)* | `siteAgents` | every site with an agent not revoked, from its last read (an agent at a new site shows at the next minute's read; over 100 sites, it polls only) | 60 s |
| Molecular Order Queue *(Batch 562)* | `molecularQueue` | | none: it read on open and after its own actions, and still does without the hub (`pollMs: null`, events only) |
| An open case report (`hooks/useCaseUpdateNotice.ts`) *(Batch 572)* | `caseReport` | the case's support reference | none: events only (`pollMs: null`); in the demo another tab's save stands in for the event. Without the hub, the version check on save is what catches another user's save |

**How a screen reads:**
- **Safety poll.** Only once the hub has taken the screen's topic (its `SetDataTopics` answer) on a live connection does the screen poll just once a minute (or at its own interval, if longer), in case an event was missed. Otherwise (no hub, the hub unreachable, the topic refused) it polls as it always has. With no API server (the demo) nothing sends `DataChanged`.
- **Not too often.** Events close together become one read, at most one read a second per screen, one at a time, after up to a second at random so a whole organisation's screens don't read at the same instant.
- **Reconnections.** After a reconnection each screen reads once (events may have been missed), but not for the first connection, which the screen's own first read covers.
- **Only signed-in users.** A screen subscribes only with an SSO access token. Password and demo sessions, and wall boards without a user, never open a hub connection; they poll.
- **One connection per window.** The inbox is mounted for the whole app, so every signed-in user's window holds one hub connection while the hub is configured, and the connection banner (`hooks/useConnectionBanner.ts`) reflects the hub's state for everyone. That is the design (one hub, one connection per window), not an extra cost per screen.
- **Out of date.** Facility Ops shows "out of date" after two of its current read intervals: 40 s without a live connection, two minutes while live (a quiet minute is normal then).

**Connections without a signed-in user** (password and demo sessions, OR wall boards) stay on polling until device tokens exist (§4, §9).

## 15. Who else has a case open (presence; Batch 573)

**Decided (Pete, Oct 14, 2026):** an open case report shows who else has the same case open, and whether they are editing it (have unsaved changes), so people can talk before two saves collide. It goes with the `caseReport` topic (§14), which says when someone saved. The browser side is built: `src/services/liveUpdates/casePresence.ts` (the wire types and rules), the SignalR client (`signalRLiveUpdateService.ts`, `joinCasePresence`), `hooks/useCasePresence.ts`, and the strip above the report's tabs (`CasePresenceStrip.tsx`).

**Methods** (on `/hubs/live`, the same connection as everything else):

| Direction | Name | Arguments | Returns |
|---|---|---|---|
| client → server | `JoinCasePresence` | `{ ref, presenceId, editing }` | `{ accepted: bool, presenceId?: string, viewers?: CasePresenceViewer[] }` |
| client → server | `SetCasePresenceEditing` | `ref, presenceId, editing` | — |
| client → server | `LeaveCasePresence` | `ref, presenceId` | — |
| server → client | `CasePresenceChanged` | `{ v: 1, ref, viewers: CasePresenceViewer[] }` | — |

`CasePresenceViewer`:

| Field | Type | Notes |
|---|---|---|
| `presenceId` | string | The id the server lists the presence under: its own, unique, never the browser's id as sent (so nobody can claim another's). The join answer returns it, and the browser recognises itself by it. One window with the case open is one presence |
| `userId` | string | From the user's token, never from the browser |
| `name` | string | The display name from the user record. Staff names are not patient data (Pete's decision) |
| `editing` | bool | The window has unsaved changes on the case |
| `since` | string | ISO 8601, the server's clock, when the presence joined |
| `email`, `phone` | string, optional | Work contact details from the staff directory, when the lab has them. Leave them out where a lab doesn't want them shown |

**Rules:**
- **The reference.** `ref` is the case's support reference (§14), never the case number. The browser gets it from the server (`GET /api/cases/{caseId}/support-reference`, `CASE_API.md` §8), so every user of a case has the same one; the server issues references and keeps the table. Resolve it and check that the user may open the case, as for `SetDataTopics`. A reference that doesn't exist and a case the user may not open get the same answer, `{ accepted: false }`, so the answer never reveals whether a case exists. Presence groups are per organisation, like every group (§5).
- **Losing access.** If a user may no longer open the case (access removed, the case restricted), remove their presences on it and send the new list.
- **Identity from the token.** The user id, name and contact details come from the token and the user record. The browser sends only `ref`, `presenceId` and `editing`.
- **The whole list each time.** After any join, editing change or leave, send `CasePresenceChanged` with the full list for that case to every connection that has joined it (the one that changed included). The `JoinCasePresence` answer carries the list too. The browser leaves its own presence out, and shows the same user's other windows as "You, in another window".
- **Lifetime.** A presence belongs to its connection and is keyed by (connection, `ref`, the browser's `presenceId`). Remove every presence of a connection when it disconnects (`OnDisconnectedAsync`), and send the new list. The browser joins again after every reconnection (presences don't survive one), and shows nobody while it isn't connected. A join with a key the connection already has replaces that presence. A `LeaveCasePresence` for a presence the hub doesn't have does nothing (the browser sends one if it left while its join was on the way).
- **Own presences only.** `SetCasePresenceEditing` and `LeaveCasePresence` take the browser's `presenceId` and act only on a presence this connection joined; otherwise do nothing.
- **Limits.** At most 20 presences per connection, 50 viewers in a list, and 30 joins a minute per connection. `SetCasePresenceEditing` may be merged to one a second per presence, but the latest value is always applied (never dropped), so "editing" can't stick.
- **Order.** Send each case's lists in order on a connection, and the join answer before any later `CasePresenceChanged` for that case; the browser takes the newest it has.
- **Scale-out.** With more than one hub server (§7), keep presences in the shared store (the backplane or SQL) keyed by case, and remove a server's presences if that server stops, so nobody is shown as present for ever.
- **Retries.** The browser retries a failed join on the reconnect back-off while connected.
- **Not an audit record.** Opening a case is audited where it already is. Presence is display only, so it isn't stored after the connection goes.

**Without the hub (the demo):** this browser's windows tell each other through a `BroadcastChannel` (`pathscribe-case-presence`). Each window says it is there every 10 seconds and as soon as it is shown again, says goodbye when the page is closed (`pagehide`), and is dropped after 150 seconds without a word (longer than a hidden tab's slowed timers).

**What "editing" means:** the page has unsaved changes the person made. Changes the page marks while setting itself up just after loading don't count (`services/cases/caseEditingSignal.ts`, the rule the page's own unsaved-changes warning uses). Known limit: a real edit made while that set-up mark is still standing shows as viewing until the person saves.

**What is announced to screen readers:** one polite message for the latest change (someone starting to edit, opening the case, or no longer having it open). Nothing for the first list after opening or reconnecting, nor for a dropped connection.

**Acceptance tests for the server:** two users open the same case and each sees the other within a second; one types (unsaved changes) and the other sees "editing"; one closes the tab or loses the network and disappears from the other's list once the connection is gone; a user who may not open the case, and a made-up reference, both get `accepted: false` and no events; the same user in two windows sees "You, in another window" in each.

*Batch 573: the edit hold (the first person to open a case for editing holds it, others read-only) is a separate idea and is not built or specified; presence only shows who is there.*

