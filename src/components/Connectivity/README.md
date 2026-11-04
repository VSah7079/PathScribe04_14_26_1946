# components/Connectivity/

Batch 548 (PS-539 phase 2d). `ConnectionBanner` is a slim notice below the top bar on every signed-in screen (mounted in `SignedInApp.tsx`).
- It says "Reconnecting…" or "Offline" when the connection to the server has been lost for 2 s, and "Connection restored" for 4 s when it's back.
- It is inline and never needs a click (CLAUDE.md rule 8). It doesn't catch clicks, so it never blocks the search box.
- It is announced politely to screen readers.

The rules are in `services/connectivity/latencyStates.ts`, and the state in `hooks/useConnectionBanner.ts`. The per-screen `LiveUpdates/LiveStatusBadge` still shows each live screen's own polling.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- The banner's hook asks the hub to reconnect straight away when the browser comes back online (`liveUpdateService.retryNow()`), instead of waiting out its back-off.
