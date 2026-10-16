# services/liveUpdates/

**Live updates across devices (PS-262, Batch 342).** Keeps the OR Suite Live Boards and the Intraop Queue current when anything changes on another device. In production that means a dismissal on one terminal reaches every other board for that theatre within 500 ms.

**Decision (Pete, Sep 26, 2026):** the PathScribe API server is ASP.NET Core, and live updates come from its **SignalR** hub. The hub is specified in [docs/architecture/LIVE_UPDATES_SIGNALR.md](../../../docs/architecture/LIVE_UPDATES_SIGNALR.md); it isn't built yet.

**Network print results (Batch 347, PS-54).** The same connection also carries the interface engine's answers for labels a user sent to a *Direct via Interface Engine* printer (`PrintJobStatus`). They go to that user only, with no scope. `services/networkPrint/` subscribes while a label is waiting. See spec §10.

## How a screen uses it

`hooks/useLiveIntraopUpdates(scope, reRead)`:
- **Subscribing:** it subscribes for the screen's scope: the board's OR locations, or everything for the queue.
- **Re-reading:** it calls the screen's normal re-read when a change arrives. Bursts are coalesced into one call (100 ms), and it also re-reads after every reconnection.
- **Polling:** it polls every 15 s without a live connection, and every 60 s as a safety net while live.
- **State:** it returns the connection state for `components/LiveUpdates/LiveStatusBadge.tsx`.

Events carry **identifiers only** (session, specimen, location), never patient data. A screen re-reads through the normal authorised service call, so an event never grants access to anything.

## Files

- **`liveUpdateContract.ts`:** the wire contract with the .NET hub. It has the hub path (`/hubs/live`), the methods (`SetIntraopScope`, `IntraopChanged`, and since Batch 347 `PrintJobStatus`), and the `IntraopChangedEvent` / `IntraopScope` / `PrintJobStatusEvent` types. `parseIntraopChangedEvent` and `parsePrintJobStatusEvent` validate incoming events and drop unknown fields.
- **`liveUpdatePolicy.ts`** (pure, tested):
  - reconnect back-off: 0, 2, 5, 10, 20, then 30 s, with ±20 % jitter, never giving up;
  - polling intervals per state;
  - scope matching and combining;
  - the duplicate filter;
  - the transport choice (`selectLiveUpdateTransport`).
- **`ILiveUpdateService.ts`:** `subscribeIntraop`, `subscribePrintJobs` (Batch 347), `getState`, `onStateChange`, `onResync`.
- **`signalRLiveUpdateService.ts`:** the production client (`@microsoft/signalr` 10).
  - **Connection:** one per browser window. It opens on the first subscription and closes 1 s after the last (so moving between screens reuses it).
  - **Scope:** the combined scope is sent on connect and on every reconnect.
  - **Recovery:** automatic reconnect never gives up, and a failed first start or a closed connection is retried on the same schedule. After each (re)connection the screens re-read.
  - **Print results (Batch 347):** a print-result subscriber keeps the connection open too. A connection open only for print results sends no `SetIntraopScope`.
- **`localLiveUpdateService.ts`:** used when no hub is configured. The mock services publish each write here (`announceIntraopChange` in `intraop/mockIntraoperativeService.ts`, standing in for the API server). A `BroadcastChannel` carries it to this browser's other windows; other devices are covered by polling (state `local`). Since Batch 347 it also has `publishPrintJobStatus`, which the demo uses to simulate the engine's answer.
- **`liveUpdateService.ts`:** picks the transport once. `VITE_LIVE_UPDATES_HUB_URL` set (https:// in production; loopback http in development) means SignalR, otherwise local. It is exported from `@/services` as `liveUpdateService`.
- **`testing/fakeSignalRHub.ts`:** **test infrastructure only, never deployed.** A minimal server speaking the SignalR JSON hub protocol (using the `ws` dev dependency), so the real client can be tested end to end in Node.

## Tests

- **`liveUpdates.test.ts`:** the contract (including print results, Batch 347), the policy, both transports (the SignalR one against a fake connection: scope, delivery, reconnect, never giving up, the close grace period), and that the mock intraop service publishes ids only.
- **`signalRProtocol.integration.test.ts`:** the real `@microsoft/signalr` client through this service against `fakeSignalRHub`.
  - Two boards and a queue get only their own locations.
  - Delivery is under 500 ms (about 10 ms over loopback).
  - Everyone recovers after the server drops all connections, re-sending scope and re-reading.
  - A print result reaches a print-only connection, which sends no scope (Batch 347).

## Verified in the browser

Chromium, dev server, with the OR board open twice and the Intraop Queue.
- **Local transport:** a demo started on board A showed on board B in 143 ms; a dismissal on A cleared the row on B in 120 ms; a new session reached the queue in 206 ms.
- **SignalR** (the app pointed at a protocol-compatible test hub):
  - the badges showed *Live*;
  - a hub publish reached board B's rows in 129 ms;
  - a dismissal cleared the row on B in 83 ms;
  - a new session reached the queue in 203 ms;
  - after the hub dropped every connection the badge showed *Reconnecting…*, then *Live* again, with no reload.
- **Timing includes** the screen's re-read through the mock services.

## Open

- **Authentication:** since Batch 343 (PS-60) `liveUpdateService.ts` passes `accessTokenFactory: getAccessToken` (`services/auth/accessTokenSource.ts`), so SSO users connect with their access token. Demo password sessions and OR terminals have none yet (terminal device tokens are still to come); the hub must refuse unauthenticated connections (spec §4).
- **Runtime configuration:** `VITE_LIVE_UPDATES_HUB_URL` is fixed at build time.

## Batch 435 — WSI scan batch changes

A third kind of event, `WsiScanBatchChanged` (ids only: batch, change, lab), keeps Batch Management → Slide scanning current:
- `liveUpdateContract.ts`: `HUB_WSI_SCAN_BATCH_CHANGED`, `WsiScanBatchChangedEvent`, `parseWsiScanBatchChangedEvent`.
- `ILiveUpdateService.subscribeWsiScanBatches`, on both transports. The SignalR one keeps the connection open for it and sends no scope.
- `localLiveUpdateService.publishWsiScanBatchChange`. `digitalPathology/mockWsiScanBatchService.ts` publishes after every write: loaded, sent, send failed, a slide's status, unloaded.

The hub side is `docs/architecture/LIVE_UPDATES_SIGNALR.md` §11. Tests are in `liveUpdates.test.ts`.

## Batch 444

Environment settings here are read by full name (`import.meta.env.VITE_X`). The previous whole-object forms made Vite copy every `VITE_` variable into the bundle (`services/security/envExposure.guard.test.ts`).

## Batch 521 (PS-281)

A fourth event, `ReportDeliveryStatus` (fax transmission reports), in the contract, both transports (`subscribeReportDeliveries`; the local one can `publishReportDeliveryStatus`) and `docs/architecture/LIVE_UPDATES_SIGNALR.md` §12. Test: `reportDeliveryStatus.test.ts`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*

## Batch 547

Deployment settings here are read through `appEnv()` (`services/runtimeConfig/`): the deployment's `config.json` at start-up, else the build's `VITE_*` value (`docs/architecture/RUNTIME_CONFIG.md`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- `retryNow()` on `ILiveUpdateService`: when a restart is waiting out its back-off, start it now (the SignalR client; the local stand-in does nothing). Called when the browser fires `online`. Test in `liveUpdates.test.ts`.

## Batch 550 (PS-539 phase 2d: exports through the server)

- `ExportStatus` (`HUB_EXPORT_STATUS`, `parseExportStatusEvent` in `liveUpdateContract.ts`) and `subscribeExports` on `ILiveUpdateService`: the SignalR client delivers it, once per event id; the local service has nothing to send (exports are built in the browser). Test in `liveUpdates.test.ts`.

## Batch 559 (PS-539 phase 2d: data topics)

- `dataTopics.ts` (new): the topics for the screens that poll today, combining subscriptions, matching events, limits, the poll interval rule. `liveUpdateContract.ts`: `HUB_SET_DATA_TOPICS`, `HUB_DATA_CHANGED`, `parseDataChangedEvent`. `subscribeData` on both transports (the local one never fires). Test: `dataTopics.test.ts`.

## Batch 560 (PS-539 phase 2d)

- `dataTopics.ts`: `dataSubscriptionAccepted` (whether the hub took a subscription), `dataReadDelayMs` (at most one read a second, plus up to a second at random), `dataStaleAfterMs`. `subscribeData` takes `onAccepted`, told after each `SetDataTopics` answer and false after a drop.

## Batch 562 (PS-539 phase 2d)

- `dataTopics.ts`: topic `molecularQueue`.

## Batch 571

- `dataTopics.ts`: header records Pete's decision (Oct 14, 2026): this one event on `/hubs/live`, in place of per-screen events; future live screens add a topic.

## Batch 572 (PS-539)

- `dataTopics.ts`: topic `caseReport` (keyed by the case's support reference, never the case number): an open case report hears of another user's save. `DataChangedEvent.key` documents the support reference. Contract: `LIVE_UPDATES_SIGNALR.md` §14.

## Batch 573 (PS-539)

- `casePresence.ts` (new): who else has a case open: the hub methods and event (`JoinCasePresence`, `SetCasePresenceEditing`, `LeaveCasePresence`, `CasePresenceChanged`), parsing (contact details checked), and the rules (others in order, the one message to announce, the demo's messages and expiry). Contract: `LIVE_UPDATES_SIGNALR.md` §15.
- `ILiveUpdateService.joinCasePresence`: the SignalR client joins after every (re)connection, retries a failed join, takes back a join answered after leaving, and sends an editing change made while joining; the local transport shares presence between this browser's windows (BroadcastChannel, heartbeat, goodbye on `pagehide`).
