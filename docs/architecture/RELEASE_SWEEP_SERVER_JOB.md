# Release sweep as a server job (Batch 658, finding 16)

**Status: Planned. The server job is not built.** Today the release sweep runs in the browser (`startReleaseBackgroundWork`, every 15 seconds) while PathScribe is open, so a held report is sent late, or not at all, if nobody has it open. This note says what the server job takes over. It follows CLAUDE.md rule 11 (serverless, event-driven; timers become scheduled or event-triggered functions, PS-809).

## What already supports it
- Every held report stores its own due time: `HeldRelease.expiresAt` (Batch 534). The surgical sign-out buffer is tracked the same way (`kind: 'surgical-sign-out'`), so one list covers every kind.
- `releaseDueReports(deps)` is a pure function of its dependencies (the held store, the clock, publish, audit). Nothing in it needs a browser.
- `held.settle(id, 'released', at)` is a compare-and-set: the first caller wins and a second one skips, so two sweepers (a browser and the server, or two server instances) never send the same report twice.

## The job
1. A scheduled function runs every minute (or a timer message queued at `expiresAt`, which is more exact). It calls the same release rules against SQL Server: `SELECT ... WHERE status = 'held' AND expiresAt <= now`, oldest first.
2. For each row it does the compare-and-set to `released`, then runs the publish, follow-ups (cancer registry) and audit exactly as `releaseDueReports` does.
3. A failure leaves an audit entry and a retry on the next run; it never silently drops a report.
4. The SignalR hub (or the existing refresh) tells any open screen the case is now released.

## What changes in the front end when it is built
- `startReleaseBackgroundWork` is removed (or kept only as a display refresh); the countdown banner keeps reading `expiresAt`.
- Recall stays a call to the API that moves a `held` row to `recalled`; it competes with the job through the same compare-and-set.

## Decisions (Pete, Oct 23, 2026)
- **Schedule: a sweep every minute for v1.** The release is already safe to run twice (first run wins), so the only job is making sure something checks the clock. Exact per-report timers can be added later if users need second-level precision; the sweep stays as the safety net.
- **Missed window: release late, but flag it (option C).** If the server was down when a report came due, the next sweep releases it, the audit entry records that it was late and by how long, and the report owner and the Lab Director are notified. No one has to confirm. 
- **Surgical sign-out hold: the sweep never releases a held report; a person does (Pete, Oct 23, 2026).** If the sweep meets a report under a hold (pending IHC, second opinion, frozen section reconciliation, a QA audit flag), it skips it, sets the case to "Sign-Out Hold - Pending Manual Review", writes an audit entry saying the sweep skipped it because of the hold, and puts it in the assigned pathologist's (or supervisor's) queue for manual sign-off. The recall-window release (the buffer after sign-out) is unchanged: it releases when the window ends, late and flagged if missed.
