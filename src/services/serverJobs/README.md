# services/serverJobs

Batch 551 (PS-539 phase 2d; readiness review §9 item 10; `docs/architecture/MESSAGE_BUS_API.md` §4 and §4a).

With the API server, the work the browser does today runs on the server as background jobs on the message bus:
- interface messages, deliveries, prints, held releases, charges, exports and event handlers;
- recurring jobs, such as the delivery retry sweep and the consult link expiry.

A job that fails for good is dead-lettered. The **Server jobs** view (System Logs → Server jobs) shows each kind's health, the recurring jobs, and the dead letters, and lets staff requeue them.

## Files

- **`serverJobsContract.ts`:** the wire contract.
  - Types and constants: the job kinds, the recurring jobs and how often each runs, the health and dead-letter types.
  - Rules:
    - `REQUEUE_ROUTE`: interface and print jobs are resent from their own screens with their own capabilities; the rest from here.
    - `recurringJobOverdue`: more than three intervals, against the server's time; optional or self-scheduled jobs are left to the server.
    - `kindNeedsAttention`: more than 5 minutes past due, or a dead letter today.
    - `deadLetterContext`: the job's facility and case, or every facility when it names neither.
    - `normaliseJobKind`: `event:{consumer}` is shown as an event job.
  - Unknown kinds are shown as the server names them, with no action.
- **`serverJobsService.ts`:** the service, which checks capabilities here (CLAUDE.md rule 7), and the server checks them again.
  - `jobs:server-job:view` to see the jobs. Dead letters are filtered to the viewer's facilities.
  - `jobs:server-job:requeue` to requeue, at the job's facility and case.
  - Interface, print and unknown kinds are refused with `WRONG_SCREEN`.
  - Also contains the HTTP client for `/api/jobs`.
- **`serverJobsInstance.ts`:** `serverJobsService` in `@/services`. The API address comes from `apiServer/apiServerUrl.ts`.

## Elsewhere

- **The screen:** `pages/ServerJobsSection.tsx`, with `hooks/useServerJobs.ts`.
- **Capabilities:** seeded for Admin (`authorization/capabilitySeeds.ts`, `SERVER_JOBS`).
- **The demo:** with no API server, the browser does this work itself, and the view says so.

**Tests:** `serverJobs.test.ts`; `pages/ServerJobsSection.test.tsx`.

## Batch 555 (PS-539 phase 2d: browser stand-ins for server jobs)

- `browserStandIns.ts` (Batch 555, new) registers the server jobs the browser stands in for (readiness review §7), each against its recurring job (`MESSAGE_BUS_API.md` §5).
  - `browserRunsServerJob('<job>')` is false only when an API server is configured and config.json's `VITE_SERVER_JOBS` lists that job as the server's. Until a job is listed, the browser keeps running it, so a job is never done twice and never left with no runner.
  - `browserStandIns.guard.test.ts` checks two things: every stand-in calls the check with its own job name, and the work is started only from the listed files.
  - `browserStandIns.behaviour.test.ts` checks that a listed job doesn't run in the browser.

## Batch 605

`simulatedServerJobsApi.ts` stands in for the server jobs API in the demo: jobs show a Simulated badge and run against browser stand-ins. `createServerJobsService({api, simulatedApi})` reports `simulated` when only the simulated API is present.
