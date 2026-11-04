# services/healthStatus

Batch 669h (footer). The system status the Home footer shows, replacing the fixed "SYSTEMS OPERATIONAL" text. Contract: `docs/architecture/HEALTH_STATUS_API.md`.

- `healthStatusContract.ts`: states, the four fixed components, strict `parseHealthStatus`, `footerStatusKind` (a failed check is `statusUnavailable`, never operational), `shouldRecheck` (visible and five minutes old).
- `IHealthStatusService.ts`: `check()`.
- `mockHealthStatusService.ts`: the demo. Probes whether the browser is online; labelled simulated; `setMockResult` for tests. Stores nothing.
- `httpHealthStatusService.ts`: `GET /api/health/health-status/check`.
- `healthStatusServiceInstance.ts`: `healthStatusService` in `@/services`.

The server decides the overall state. The browser checks on page load and when the tab becomes visible after five minutes (`hooks/useSystemStatus.ts`), never on a timer.

Tests: `healthStatus.test.ts`.
