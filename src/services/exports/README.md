# services/exports/

Batch 542 (PS-539 phase 2c, decision D7, Pete, Oct 13, 2026: "request it, get notified, download it").

- **`asyncExportContract.ts`** (pure): the wire contract for asynchronous exports, the source of truth for [`docs/architecture/ASYNC_EXPORT_API.md`](../../../docs/architecture/ASYNC_EXPORT_API.md).
  - `EXPORT_KINDS`: one kind per export capability (26), named `domain.object` after `domain:object:export`, with how its capability is checked today (`ExportScope`) and its formats (CSV).
  - `EXPORT_LIMITS`: 1,000,000 rows; 3 open exports per user; files kept 7 days (1–30); download links valid 15 minutes; a 3-second wait before a quick export downloads with no extra click; a 30-minute build limit (an always-on worker, not a serverless function).
  - `ExportRequest`, `ExportJob`, `ExportErrorCode`, `ExportStatusEvent` (the hub message), `EXPORT_TRANSITIONS` / `canTransition`, `exportExpiresAt`, `downloadRefusal` (requester only, ready, not expired), `exportKindFor`.
- **Tests:** `asyncExportContract.test.ts`; `deploymentReadiness/phase2cContracts.guard.test.ts` keeps the kinds equal to the catalog's export capabilities.

**Batch 611 (#194): the simulated export server.** `demoExportApi.ts` is an in-memory `IExportApi` used when no API URL is set. It runs the page's own export in the browser (`utils/downloadCapture.ts` keeps the file the download helpers would have saved), holds it as a job (quick at 500 rows or fewer, 10 ms per extra row up to 30 s, or 8 s with the long-export switch), enforces 3 open per user and the 7-day expiry, and answers the same calls as the HTTP client. `exportTrackerInstance.ts` wires it in; My exports and the notices show **Simulated**. Cleared at sign-out. Tests: `demoExportApi.test.ts`, `utils/downloadCapture.test.ts`.

Since Batch 550 the browser's export service uses it (see the Batch 550 entry); the server comes in 2e.

## Batch 613 (part A) — case search reporting

Export kind `search.case-report` (capability `search:case-report:export`). 29 kinds.

## Batch 544

`ExportScope` comment: QA reports with facility rows can now be exported for one facility (Pete, Oct 13); the enterprise rollup, management reviews and patient match stay "all".

## Batch 550 (PS-539 phase 2d: exports through the server)

Phase 2d, browser side. With an API server configured, every export goes through the server; the demo still builds exports in the browser. `ASYNC_EXPORT_API.md` §2a, §3, §5 and §7 describe it.

**`exportTracker.ts`** (`createExportTracker`) is the one export service:
- `run({ kind, title, parameters, facilityId, buildInBrowser })`:
  - **No API server:** builds the file in the browser.
  - **With one:** posts the request and asks for the status every 0.5 s.
    - Ready within 3 s: downloads it with no notice.
    - From 1 s: shows "preparing".
    - After 3 s: waits for the hub's `ExportStatus`, or a re-read every 15 s.
  - A second identical request while the first is in flight sends nothing new (`exportRequestKey`).
  - A notice never goes back from ready to preparing (`noticeMayChange`).
- Download, cancel and list.
- The notices store.
- `reset()` on sign-out.
- Wording: `exportNoticeMessage`, `exportProblemKey` and `EXPORT_PROBLEMS`.

**`httpExportApi.ts`** is the client for `/api/exports`. It sends the access token, and `exportApiError` maps statuses and bodies to codes (401 is `SIGNED_OUT`).

**Other files:**
- `exportTrackerInstance.ts`: the app's instance, `exportService`. The API address is checked as sign-in checks it, and sign-out clears the notices (`auth/sessionEndHooks.ts`).
- `runExport.ts`: the call each screen makes.
- `asyncExportContract.ts` now also has `ExportErrorBody`, `ExportDownloadLink`, `exportFacilityId` and `exportTitleFromFilename`.

**Guard:** `exportRouting.guard.test.ts`. Every export kind has a button that goes through the service, and every browser export a screen starts sits inside `runExport`.

**Tests:** `exportTracker.test.ts`.

## Batch 551 (PS-539 phase 2d: the Server jobs view)

- `exportTrackerInstance.ts` takes the API address from `apiServer/apiServerUrl.ts` (shared with the server jobs).

## Batch 730

- `asyncExportContract.ts`: seven `report.*` kinds for the lab workflow reports.
