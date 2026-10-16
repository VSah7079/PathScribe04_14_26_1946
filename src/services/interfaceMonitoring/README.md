# services/interfaceMonitoring

Batch 554 (PS-539 phase 2d; readiness review §9 item 4; `docs/architecture/INTERFACE_ENGINE_EDGE.md` §9a): interface monitoring. Each hospital's interface engine (BridgeLink, hosted or on site) posts a heartbeat every minute with its listeners and channels. The API keeps the last one per engine and returns them, with its own time, from `GET /api/interface/engines`.

- **`interfaceMonitoringContract.ts`** (pure, tested):
  - the wire types;
  - `channelProblem` (error, stopped, paused, waiting over 15 minutes, dead letters);
  - `interfaceEngineStatus` (the server's status, else `engineStatus` by the server's time);
  - `engineViews` (worst engines first, problem channels first, totals, listeners down);
  - `engineCounts`, `engineLineParts` and `engineLineIsProblem` for the Interfaces line;
  - `normaliseEnginesResponse` (a bad row is dropped or made safe, so one never stops the rest from showing).
- **`interfaceMonitoringService.ts`:**
  - checks `interface:engine-status:view` before asking the server (standard risk, so there is no audit entry on each poll);
  - the HTTP client, which gives up after 15 s;
  - read only.
- **`interfaceMonitoringInstance.ts`:** `interfaceMonitoringService` in `@/services`. In the demo there is no engine (`viaServer` false).
- **Tests:** `interfaceMonitoring.test.ts`. The status rules themselves are `interfaceEngine/engineEdgeContract.ts` `engineStatus`; since Batch 554 a stopped channel is degraded, and a time that can't be read is offline.
