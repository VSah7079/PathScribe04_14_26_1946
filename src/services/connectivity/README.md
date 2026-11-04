# services/connectivity/

Batch 548 (PS-539 phase 2d; readiness review §8 and §9 item 2). `latencyStates.ts` holds the rules for what a screen shows while it waits, and when the connection is lost. Pure.

- **Waiting for data** (`loadingPhase`):
  - nothing under 300 ms;
  - a placeholder from 300 ms;
  - "still working" as well from 3 s.

  Used by `hooks/useLoadingPhase.ts`, `components/Common/LoadingState.tsx` and `components/Common/PageLoader.tsx`.
- **The connection** (`connectionProblem`, `connectionBanner`):
  - The browser's own network comes first. The live-updates hub counts only when it's in use; 'idle' and 'local' are never a problem.
  - A problem shows after 2 s. "Connection restored" shows for 4 s, and only when the hub is really live again.
  - A problem that returns during that time shows at once.

  Used by `hooks/useConnectionBanner.ts` and `components/Connectivity/ConnectionBanner.tsx`.

`latency.guard.test.ts` keeps the converted screens on `LoadingState`, the route fallbacks on the shared `PageLoader`, and the banner mounted once in `SignedInApp.tsx`.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- `latency.guard.test.ts`: every line in the app that shows a loading text (`t('…loading…')`) must use `LoadingState`. Exceptions: upload and download wording, comments, `PageLoader.tsx` and `LoadingState.tsx` themselves.

## Batch 563 (PS-622)

- `pageWaitClock.ts` (new): the page loaders share one waiting clock, so a loader that replaces another (a cold start) keeps counting. Test: `pageWaitClock.test.ts`.
