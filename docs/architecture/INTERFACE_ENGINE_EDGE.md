# Interface engine edge: BridgeLink ↔ PathScribe API (PS-539 phase 2c)

**Decision D6** (Pete, Oct 13, 2026; `DEPLOYMENT_READINESS_REVIEW.md` §13): the interface engine runs both ways, per hospital, from the same container image. It is either hosted by ForMedrixAI in the tenant's region or installed in the hospital.

**Pete's check before it is relied on:** the container's health checks pass identically when it is cloud-hosted and when it is installed locally (§11, test 1).

This contract turns the readiness review's §6.2 "rules for the edge" into what the India team builds:
- the API endpoints the engine calls;
- what the engine does with each answer;
- how outbound messages reach the engine and are settled;
- health, heartbeat and running the engine on site.

It sits beside three other contracts:
- `MESSAGE_BUS_API.md` (D1): HL7 stays off the bus, in the engine's own message store. The API hands a message over as an `interface.dispatch` job.
- `INTERFACE_TRANSACTIONS.md`: the outbound transaction types.
- `REPORT_DELIVERY_API.md`: fax and file drop, which stay synchronous (§5.6).

**Source of truth for the wire contract:** `src/services/interfaceEngine/engineEdgeContract.ts` (types, the answer table, ACK and retry rules, health limits). Where they differ, the TypeScript file wins and this document is corrected.

## 1. What exists today (checked Oct 13, 2026)

- **Inbound:** no HL7 endpoint exists. The engine reaches PathScribe through four Cassette Engine webhooks in `api/webhooks/engine/` (Vercel functions on Firestore, to be replaced by the API server):
  - block exception (`block-exception.ts`);
  - cassette dispatch outcome (`cassette-dispatch-outcome.ts`);
  - material location (`material-location.ts`);
  - engraver status (`engraver-status.ts`).
  - Each takes a flat JSON event with its own `messageId`. There is no envelope, MSH-10, message type or tenant.
- **Authentication:** a shared secret (`X-API-Key`), optionally with an HMAC of the body (`verifyEngineAuth.ts`). It is the same for every tenant, with no replay protection beyond `messageId`.
- **Idempotency:** `processed_messages/{messageId}`, a global key, not per tenant or sending system.
  - **Finding F10:** the webhooks claimed the key before applying the change. When the case wasn't there yet they answered 404 but kept the claim, so the engine's redelivery got "already processed" and the event was lost. The same happened when the update failed.
  - *Fixed in Batch 545* for the two webhooks that change a case (block exception, material location). They now claim inside the case update's own transaction (`applyEngineCaseUpdate.ts`), so a not-found or a failure leaves no claim.
  - *Fixed in Batch 549* for the other two: cassette-dispatch-outcome writes its record and the claim in one transaction (`createWithClaim`, `_lib/idempotency.ts`), and engraver-status claims inside its status update's transaction (`upsertEngraverStatus.ts`). No engine webhook claims first any more.
- **Outbound:** the browser posts the envelope `{ queueEntryId, transactionType, dispatchedAt, payload }` straight to the interface receiver (`src/services/interfaceDispatch/dispatchInterfaceMessage.ts`).
  - It sends no credential and no tenant.
  - Any 2xx counts as sent; there is no HL7 ACK.
  - The development receiver (`functions/main.py`, `receive_interface_message`) has no authentication and doesn't de-duplicate.
- **Retries:** automatic retries and dead letters exist for print and report delivery only.
  - The default is 3 retries, at 1, 5 and 15 minutes, set in Delivery Rules → Retries (`deliveryRetryPolicy.ts`). Admin and Lab Director are alerted (`deliveryRetries.ts`).
  - The interface queues (ORU, ADT, LIS sync and others, `outboundQueueAdapters.ts`) are resent by hand only, from Audit Log → Interfaces → Outbound (`interface:outbound:resend`). There is no retry limit and no alert.
- **Parsing:** the browser still parses raw HL7 (`src/services/hl7/`: `hl7Parser.ts`, `adtParser.ts`, `processPatientManagementMessage.ts`). The target is that the engine parses and the API takes normalised JSON (§10).
- **Health:** no engine heartbeat or health check exists in the code.
- **Interface exceptions** (unmatched patients, unmapped order codes) go to the case-binding queue (`src/services/interfaceExceptions/IInterfaceExceptionService.ts`), reviewed in Audit Log → Interfaces. It stores the raw message text itself (§7).

**Corrections to the readiness review §6.2, made in Batch 545:**
- **Idempotency:** item 3 said the webhooks already key on MSH-10 or `queueEntryId`. They key on their own `messageId`, globally.
- **Dead letters:** item 4 described dead letters with alerts for interface messages. That exists only for print and report delivery.
- **Outbound ACK:** item 7 described outbound ACK checking. Today a 2xx from the receiver counts as sent.
- **Parsing:** item 8 said PathScribe takes only normalised JSON. The browser still parses HL7.

## 2. Where the engine runs (D6)

- **One image, two places.** The same BridgeLink container image (with PathScribe's channel templates) runs:
  - **hosted:** in the tenant's region, as an always-on container with at least 1 replica (a scaled-to-zero listener can't hold a hospital's connection);
  - **on site:** on a hospital VM (Docker, or rootless Podman), where the hospital requires the HL7 connection to stay on its network. The on-site agent (D3) may host it there.
- **Same configuration either way:** the same environment variables, channel templates and health endpoints. Only the API address, the credential, the listener ports and how outbound work arrives (§5.1) differ.
- **One tenant per engine credential.** Each hospital has its own listener (or its own port and channels) and its own credential. A hosted container serves one tenant, so a wrongly mapped channel can't post as another tenant.
  - The API takes the tenant from the credential, and checks the message's `sourceSystem` against that tenant's registered senders.
- **Network:**
  - **Hospital to engine:** a site-to-site VPN, or MLLP over TLS with certificates, with a fixed IP on both sides for the hospital's allow-list. MLLP itself has no encryption.
  - **On-site engine to the API:** outbound HTTPS only. Nothing is opened inbound in the hospital's firewall. Outbound work and raw-message requests travel over the connection the engine holds open (§5.1).

## 3. Security between the engine and the API

- **The engine authenticates as a system client:** OAuth 2.0 client credentials, one client per tenant's engine, or mutual TLS where the hospital requires it.
  - It is granted scope `interface.engine` for this contract. Where it also posts registry acknowledgements, it gets `registry.ack.write` as well (`REGISTRY_ACKNOWLEDGEMENT_API.md`).
  - This replaces today's shared secret.
- **The tenant comes from the credential, not the message.** An envelope whose `tenantId` isn't the credential's tenant is refused (403).
- **Expiring tokens:** on a 401 the engine gets a new token and retries once. A second 401 pauses the channel and alerts (§4.2).
- **Outbound:** the API never gives the browser a way to the engine. The browser stops posting envelopes in phase 2d.
- **Rotation:** the client secret and the TLS and MLLP-TLS certificates are rotated with an overlap (old and new both valid for a period). Each expiry is reported in the heartbeat (`certExpiresAt`) and alerted 14 days ahead.
- Every call is over TLS 1.2 or later, and no request or response carries a secret in a URL.

## 4. Inbound: engine → API

### 4.1 The call

`POST /api/interface/inbound` with an `EngineInboundEnvelope`:
- `v`, `tenantId`, `facilityId` (when the message names one) and `channelId`;
- `sourceSystem` (MSH-3 and MSH-4 as configured), `messageControlId` (MSH-10), `messageType` (MSH-9), `processingId` (MSH-11) and `hl7Version` (MSH-12);
- `messageDateTime`: the event time with an offset (EVN-2 or EVN-6 for ADT where present, else MSH-7). The engine applies the sending system's time zone, set on the channel, because MSH-7's offset is optional;
- `receivedAt`, `orderingKey`, `rawMessageRef`;
- `ackMode`, plus `acceptAckType` and `applicationAckType` (MSH-15 and MSH-16) when the sender filled them in;
- `payload`: the message normalised to JSON.

The existing event endpoints (the Cassette Engine events and the planned `/api/v1/events/*`) keep their own payloads, with their `messageId` as the key, and follow the same answer table.

**Test and production apart:** a production instance takes only `processingId` P, and a validation instance never takes P (`processingIdProblem`; outbound, `registryPayloadBoundary.ts` does the same). Either mismatch is `rejected` with AR.

### 4.2 Answers, and what the engine does

The engine reads the body's `outcome` first, and the status when there is none.

| Outcome | Status | Engine | When |
|---|---|---|---|
| `applied` | 200 | ack | Applied, or stale and ignored (§4.4), or put in the interface exception queue for a person (an unmatched patient is handled, not retried). |
| `duplicate` | 200 | ack | This key was applied before: the same answer as the first time. |
| `retryLater` | 409 | retry | Something it needs isn't there yet (the case, the patient). Nothing was written, and the key is not used up. |
| `rejected` | 422 | dead letter | It can never succeed as sent. The body (`InboundRejection`) gives a code, plain English with no patient data, and the HL7 ACK to send: AR for a message the API can't take at all (type, version, processing ID), AE for an error in its content. |
| `unauthorized` | 401 | reauthenticate | Get a new token and retry once; a second 401 pauses the channel and alerts. |

Any other status is read by `engineActionForStatus`:
- 2xx: ack.
- 403, and 407 from a hospital proxy: pause the channel, keeping its queue, and alert. A configuration or credential fault would fail every message.
- 404: retry on today's webhooks, which answer 404 for a case that doesn't exist yet. On the API a 404 is a wrong address, so it pauses and alerts.
- 408, 409, 425, 429 and 5xx: retry, honouring `Retry-After` on 429 and 503.
- Anything else (400, 413, 415): dead letter. A 413 also alerts as a configuration problem.

**Retry schedule and limit (`INBOUND_RETRY`):**
- Waits of 10 s, 30 s, 1 minute, 5 minutes, then every 15 minutes.
- A message still not applied **24 hours** after its first attempt is dead-lettered, alerted, and its key released. One message can't hold its key for ever.

### 4.3 Applied exactly once

- **The key is the tenant, sending system and MSH-10** (`inboundIdempotencyKey`), stored as a composite unique key. MSH-10 is unique only per sending system.
- **The claim and the change are one transaction.** The API records the key in the same SQL transaction that applies the message. A crash leaves neither, and the redelivery applies it. (The webhooks do the same: the two case-changing ones since Batch 545, the other two since Batch 549, F10.)
- A `retryLater` or `rejected` answer writes nothing and records no key.

### 4.4 Order

- **The engine keeps order per `orderingKey`:**
  - the MRN qualified by its assigning authority (PID-3.4) for patient messages;
  - else the order or accession number.

  While a message for a key waits for a retry, later messages for that key wait behind it (one channel thread per key, or FIFO queues keyed by it).
  - A merge (A40, A47) names two patients. It waits for both keys.
  - An order that arrives before its patient's ADT (they have different keys) gets `retryLater` until the patient exists.
- **The API ignores an update older than the one it applied last.** It compares the message's own event time with that of the last message applied to the same record from the same sending system (`updateStaleness`), never with the server's clock, so a backlog doesn't drop valid updates. A stale message is answered `applied`, so a late redelivery can't undo a newer change.
  - Equal times count as current, because each key is kept in order.
  - A time without an offset is refused, rather than guessed in the server's time zone.

### 4.5 When the hospital gets its ACK

- **The sender's request wins.** When MSH-15 or MSH-16 is filled in (enhanced mode), the engine follows it: a commit ACK (CA) once stored, and an application ACK when the API has answered.
- **Otherwise the channel's `ackMode` decides** (original mode):
  - **accept:** the engine sends AA once the message is in its durable store. The hospital is told at go-live that this AA means "stored", not "applied".
  - **application:** the engine sends AA, AE or AR once the API has answered, with PathScribe's reason in an AE or AR.
- **The hospital's feed doesn't stall.** Many senders wait for each ACK before the next message. So in application mode the engine waits at most 30 s (`applicationAckBudgetSeconds`). Then it sends a commit ACK and settles the message on its own, on the retry schedule.
- **Never on receipt alone** (§6.2 rule 1). A test kills the engine between receipt and storage, and checks that no ACK went out (§11).

## 5. Outbound: API → engine

### 5.1 How work reaches the engine

- **Hosted engine:** an `interface.dispatch` job (`MESSAGE_BUS_API.md` §5) posts the envelope to the engine's channel for that tenant, with the API's own credential.
- **On-site engine:** the engine pulls the work, so nothing reaches into the hospital network.
  - It holds an outbound connection: a WebSocket to the API, or a long poll of `GET /api/interface/outbound`.
  - It takes the envelopes queued for its channels.
  - Requests to view a raw message (§7) come the same way, as request-and-reply over that connection.

Either way the envelope is today's: `queueEntryId`, `transactionType` and `payload` (`INTERFACE_TRANSACTIONS.md`).

### 5.2 Hand-over

- The engine stores the message durably, then confirms (202, or a reply on the connection). The entry is then **handed over**, not sent.
- **Idempotent on `queueEntryId`.** A repeated hand-over (a lost confirmation, a job retry) gets the same confirmation and current status back. It doesn't send a second copy.
- **Two retry loops, kept apart:**
  - the hand-over job retries only until the engine has the message (`interface.dispatch`, 8 attempts, `MESSAGE_BUS_API.md` §4);
  - resending to the receiving system is the engine's own job, from its stored copy (§5.4).

### 5.3 Settled by the ACK

For each answer from the receiving system, the engine posts `POST /api/interface/outbound-acks` (`EngineOutboundAck`). The post carries:
- the `queueEntryId` and the `attempt`;
- the `stage`: accept or application;
- the MSA-1 code, and any MSA-3 or ERR text.

The outbound MSH-10 is fixed per `queueEntryId` and never regenerated, so a receiver can recognise a resend.

What each answer means (`outboundOutcomeForAck`). A channel may override a code for a receiver known to misuse it.

| Answer | Outcome |
|---|---|
| AA | sent |
| CA | sent, or awaiting the application ACK when one was asked for (MSH-16), which then settles it |
| No answer within the channel's time-out | retry: the receiver may already have it, so the engine resends the same message, with the same MSH-10 |
| AR (original mode: rejected, often for reasons unrelated to the content, such as the receiver being down), CE (commit error, usually temporary) | retry, within the window |
| AE (the receiver's application refused the content), CR (the message type, version or processing ID is unacceptable) | failed at once: sending it again unchanged won't help |

### 5.4 Resends, dead letters and order

- **The window (`OUTBOUND_RETRY`):** the engine resends after 1, 5, 15 and 60 minutes, then hourly, for **24 hours** by default. That is long enough to ride out an EHR's planned downtime. Registry submissions keep their 72 hours (`REGISTRY_ACKNOWLEDGEMENT_API.md`). The lab can set the window per transaction family.
- **Dead letter.** A failed message, or one whose window has passed:
  - goes to the dead letters, shown in Audit Log → Interfaces → Outbound;
  - **alerts Admin and Lab Director**, as report delivery already does;
  - is corrected and resent by a person with `interface:outbound:resend`.

  This is new for the interface queues, which today have no limit and no alert.
- **Order.** Outbound messages for one case go in order (the bus orders `interface.dispatch` by `interface:case:{caseId}`). A dead-lettered result **holds the later messages for that case** until a person resolves it. A corrected report must never reach the EHR ahead of the result it corrects, or alone.

### 5.5 What a person sees

The Outbound view shows each entry as queued, handed over, sent, retrying (with the attempt and the last answer) or failed, and resend is available there. That is phase 2d; the statuses come from the outbound ACK posts.

### 5.6 Fax and file drop are not HL7

`REPORT_DELIVERY` (fax and file drop) has no MSA, so it stays as `REPORT_DELIVERY_API.md` describes: the receiver answers once delivery is done, with the delivery service's own retries. It is exempt from §5.3 and §5.4.

## 6. Running the engine on site

- **Image updates:** a signed image with a pinned tag, pulled by the hospital or the on-site agent within the hospital's change window, with the previous image kept for rollback. The API states the lowest contract version (`v`) it still accepts, and the heartbeat reports the image version.
- **Store and forward:** while the API can't be reached, the engine keeps taking and storing messages and ACKs as its mode allows (§4.5). It is "ready" (§8) as long as its store and listeners work, and forwards the backlog in order when the API is back. The heartbeat shows this as `apiReachable: false`. The backlog is limited by disk, so free disk is reported, with an alert below 15%.
- **Local alert:** when the engine can't reach the API for more than 15 minutes, it also alerts locally (email, or the hospital's monitoring through its health endpoint), because the cloud can't tell anyone at the hospital.
- **Backups:** the message store is backed up by the hospital, under its own policy, or by the on-site agent. Restoring it must not resend acknowledged messages (each keeps its status).
- **Resilience:** a single VM is a single point of failure. Where the hospital needs more, run two VMs, active and standby, sharing the store, with the hospital's load balancer or a floating IP in front of the listener.
- **Time:** the VM keeps time with NTP. Ages in the heartbeat are measured on the engine, and offline is decided by when the server received the heartbeat, so a drifting clock can't hide an outage.
- **Logs:** the engine's logs can contain PHI. They stay on the hospital's VM, are encrypted at rest, and are kept as long as the raw messages.

## 7. Raw messages and retention

- The engine keeps the raw HL7, inbound and outbound, in its own message store, encrypted at rest. PathScribe keeps the normalised data and the `rawMessageRef`.
- **Exception:** the interface exception queue stores the raw message text today (`IInterfaceExceptionService.ts`). On the server it keeps a `rawMessageRef` instead, so the raw text has one home.
- **Outbound answer text** (`ackText`, MSA-3 or ERR) often echoes identifiers. It is stored as PHI and never written into an audit `detail`.
- Raw messages are kept as long as the case record (the period is set per jurisdiction in configuration), and pruned by the engine's own pruner.
- When the engine is on site, raw messages stay in the hospital. Viewing one from PathScribe goes over the engine's connection (§5.1), and is audited.

## 8. Health and heartbeat

- **Endpoints**, the same on every engine (`ENGINE_HEALTH_ENDPOINTS`):
  - They are on the engine's management port, unauthenticated, with no patient data.
  - Each answers **200** when every check passes and **503** otherwise, with a JSON body (`EngineHealthResponse`) naming each check as pass or fail.
  - `/health/live` checks that the process is up.
  - `/health/ready` checks that the message store is writable and every enabled listener is bound. The API being unreachable does **not** make the engine unready, because it stores and forwards (§6). An orchestrator never drops the hospital's listener because the cloud had a blip.
- **Heartbeat:** every 60 s the engine posts `POST /api/interface/heartbeat` (`EngineHeartbeat`). It carries:
  - hosting (`cloud` or `onsite`) and the image version;
  - whether the API was reachable;
  - free disk;
  - the soonest certificate or credential expiry;
  - for each channel: its state, the number queued, the age of the oldest, and its dead letters.

  The tenant comes from the credential.
- **Status** (`engineStatus`):
  - **offline:** no heartbeat received for 180 s, by the server's clock;
  - **degraded:** a channel is in error, paused or stopped (*stopped added in Batch 554*: a listener that isn't taking messages; a channel no longer used is removed from the engine, not left stopped), a message has waited more than 15 minutes, the API is unreachable, disk is below 15%, or a certificate expires within 14 days;
  - **attention:** working, but dead letters wait for a person;
  - **online:** otherwise.
- **Where it shows (phase 2d):** the Interfaces views and the system health page. A change to offline or degraded alerts Admin and Lab Director once.

## 9. Monitoring and audit

- **Audited:** every inbound message applied, rejected or dead-lettered, by key, with no patient data in `detail`; every outbound hand-over, answer and resend; every view of a raw message.
- **Metrics:** for each tenant and channel:
  - messages;
  - the time from `receivedAt` to applied;
  - retries and dead letters;
  - heartbeat age.

## 9a. Interface monitoring in the browser (Batch 554, PS-539 phase 2d)

Readiness review §9 item 4: each hospital's listeners and queues, in the Interfaces view. Source of truth for the wire types: `src/services/interfaceMonitoring/interfaceMonitoringContract.ts`.

| Call | Capability | What it returns |
|---|---|---|
| `GET /api/interface/engines` | `interface:engine-status:view` (Admin by default) | `{ serverTime, engines: [{ engineInstanceId, displayName?, hosting, siteId?, lastHeartbeat?: { heartbeat, receivedAt }, status? }] }`: each engine registered for the tenant, its last heartbeat (§8, `EngineHeartbeat`) and when the server received it, and `status` worked out by the server's clock (`engineStatus`). No patient data. Not audited (a read). |

Errors: 401 session ended, 403 not permitted; anything else is shown as "couldn't be loaded" and tried again in a minute.

**The screen** (Audit Log → Interfaces → **Engines**, shown with the capability):
- Each engine shows:
  - its status (online, needs attention, degraded, offline; the worst first);
  - hosted or on site, and its last check-in;
  - whether it reaches PathScribe (store and forward otherwise), free disk, certificate expiry and version;
  - how much is waiting, the dead letters and the listeners down.
- **Each channel:**
  - its direction, state, how much is waiting, the oldest wait and its dead letters;
  - problem channels come first (error, stopped, paused, waiting over 15 minutes, dead letters);
  - an outbound channel with dead letters has **Open Outbound**.
- **Refreshed every minute,** as often as the engines check in.
- **The status line:** above the Interfaces sub-tabs, one line counts the engines by status and what is waiting. One click opens Engines.
- **The demo:** the browser handles interface messages itself, so there is no engine. The screen says so.
- **Read only:** channels are started and stopped on the engine. Dead letters are resent from Outbound (`interface:outbound:resend`).

## 10. Parsing moves to the engine

- Today the browser's `src/services/hl7/` parses ADT and patient-management messages.
- With this contract the engine sends normalised JSON (`payload`), so the API needs no HL7 library (§6.2 item 8).
- Moving that parsing into BridgeLink channel transformers is a later batch, one message family at a time. Each family keeps its tests, run against the engine's output.

## 11. Acceptance tests (Pete's D6 check first)

1. **Same health checks (Pete's check).** In CI, run the same image twice under docker-compose, with a stub API and a stub MLLP sender: once configured as hosted, once as on site (rootless Podman, behind a proxy).
   - `/health/live` and `/health/ready` give the same status codes and the same check list.
   - The heartbeat reports the same channels, with only `hosting` differing.
   - Stopping the message store makes both not ready. Stopping the API leaves both ready, with `apiReachable: false`.
2. **ACK after storage.** Kill the engine after receipt and before storage: no ACK. Restart it, and the hospital's resend is applied once.
3. **Once only.** The same MSH-10 sent twice is applied once, and both answers are 200. The same MSH-10 from another tenant or sending system is applied separately.
4. **Not there yet.** An event for a case that doesn't exist yet gets 409 (404 on today's webhooks). It is applied when the case appears, with no event lost (F10). One that never resolves is dead-lettered after 24 hours, and the key moves on.
5. **Order and stale updates.** Two updates for one MRN, sent out of order, end with the newer one in force. A time without an offset is refused.
6. **Dead letter.** A 422 dead-letters the message, sends AE or AR in application mode as the body says, and alerts Admin and Lab Director.
7. **Outbound:**
   - AE: failed, alerted, resent after correction.
   - AR, or no answer: resent with the same MSH-10 until the window ends.
   - A repeated hand-over doesn't send twice.
   - A dead-lettered result holds the later messages for that case.
   - An on-site engine receives its work over its own connection, with no inbound port open.
8. **Tenants apart.** Tenant A's credential posting a tenant B envelope gets 403, and the channel pauses with an alert. A `T` message on production is refused.
9. **Heartbeat.** Stop the heartbeat: the engine shows offline after 180 s, and the alert fires once. Put the engine's clock 10 minutes ahead: the status is unchanged.

## 12. Status

| Part | Status |
|---|---|
| This contract and `engineEdgeContract.ts` | **Written, Batch 545** |
| F10: a webhook that finds no case keeps no claim | **Fixed, Batch 545** (block exception, material location) |
| F10: no webhook claims before it writes (cassette dispatch outcome, engraver status) | **Fixed, Batch 549** |
| API endpoints, per-tenant engine credentials, outbound ACKs, retries and alerts for interface queues | **Planned** (India team, phase 2e) |
| Channel templates, health endpoints, heartbeat and the pull connection in the BridgeLink image | **Planned** (phase 2e, with the India team) |
| Engine status in the Interfaces views (§9a) | **Done, Batch 554** (browser side; `/api/interface/engines` is phase 2e) |
| The browser stops posting envelopes | **Planned** (with the server endpoints, phase 2e) |
| HL7 parsing moved from `src/services/hl7/` into the engine | **Planned** (later batches) |
