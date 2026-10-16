# Jobs and events on SQL Server: the `IMessageBus` contract (PS-539 phase 2c)

**Decision D1** (Pete, Oct 13, 2026; `DEPLOYMENT_READINESS_REVIEW.md` §13): the API server's own events and background jobs live in **SQL Server tables, behind an interface (`IMessageBus`)**. There is no message broker to install, validate and support at each hospital. HL7 traffic is not on this bus: the interface engine (BridgeLink) keeps its own message store. If load testing shows the tables are a bottleneck, RabbitMQ (or a cloud queue) is added as a second implementation of the same interface.

**Pete's check before it is relied on:** the interface can swap its implementation to RabbitMQ without changing any caller. Section 8 is the contract test suite that proves it; it runs against every implementation.

This contract is for the India team's API server (ASP.NET Core). The browser does not use it; it replaces the browser's stand-ins for server work (§6).

## 1. What goes on the bus

| Kind | What it is | Examples |
|---|---|---|
| **Event** | Something that happened, published in the same transaction as the change. Any number of consumers. | A case was signed out; an intraop status changed (live updates, `LIVE_UPDATES_SIGNALR.md` §6); a report document was stored (`REPORT_DOCUMENT_STORE_API.md`). |
| **Job** | A unit of work to do once, now or at a time, retried on failure, dead-lettered when it keeps failing. One handler. | Send a result to the interface engine; retry a fax; release a held report when its delay ends; build a large export (`ASYNC_EXPORT_API.md`). |
| **Recurring job** | A job the scheduler creates on a timetable, with a lease so two runs never overlap. | The 10 timers in `DEPLOYMENT_READINESS_REVIEW.md` §7 (delivery retries, consult link expiry, registry escalation…). |

Not on the bus:
- **HL7 v2 and MLLP:** the interface engine's own store (decisions D1 and D6). The API hands a message to the engine as a job (`interface.dispatch`), and the engine's ACK settles it.
- **Live screen updates to browsers:** SignalR. The bus carries the event to the hub dispatcher; the hub sends it (`LIVE_UPDATES_SIGNALR.md`).

## 2. The interface

```csharp
public interface IMessageBus
{
    // Events: written in the caller's transaction, delivered after it commits.
    Task PublishAsync<TEvent>(TEvent evt, MessageContext ctx, CancellationToken ct = default) where TEvent : IEvent;

    // Jobs: written in the caller's transaction; run at or after dueAt.
    Task<JobId> EnqueueAsync<TJob>(TJob job, MessageContext ctx, JobOptions? options = null, CancellationToken ct = default) where TJob : IJob;

    // Cancel a job: a Ready job at once; a Running one is asked to stop (its handler's CancellationToken fires).
    Task<bool> CancelAsync(JobId id, string reason, CancellationToken ct = default);
}

public readonly record struct JobId(Guid Value);
public interface IEvent { }          // a past-tense fact, e.g. CaseSignedOut
public interface IJob { }            // a unit of work, e.g. DispatchInterfaceMessage

public sealed record MessageEnvelope(
    Guid MessageId,                  // the event's or job's id; consumers and clients deduplicate on it
    string Kind, int Attempt, DateTimeOffset EnqueuedAt,
    string TenantId, string? FacilityId, string CorrelationId);

public sealed record MessageContext(
    DbTransaction? Transaction,   // the caller's transaction: the message is written with the change, or not at all
    string TenantId,
    string? FacilityId,
    string CorrelationId,         // the request or job that caused this, for tracing
    string? ActorUserId);

public sealed record JobOptions(
    DateTimeOffset? DueAt = null,         // default: now
    string? OrderingKey = null,           // jobs with the same key run one at a time, in order (e.g. "interface:case:{caseId}"); keys are per job kind (§5)
    string? DeduplicationKey = null,      // a second job with the same key while the first is open is not added
    int? MaxAttempts = null,              // default per job kind (§5)
    TimeSpan? Timeout = null);            // default per job kind; the lease is renewed while the handler runs

public interface IEventHandler<TEvent> where TEvent : IEvent { Task HandleAsync(TEvent evt, MessageEnvelope env, CancellationToken ct); }
public interface IJobHandler<TJob>   where TJob   : IJob   { Task<JobOutcome> HandleAsync(TJob job, MessageEnvelope env, CancellationToken ct); }

public abstract record JobOutcome
{
    public sealed record Done : JobOutcome;
    public sealed record RetryLater(string Reason, TimeSpan? After = null) : JobOutcome;   // a transient failure
    public sealed record Failed(string Reason) : JobOutcome;                               // permanent: dead-letter now
}
```

Rules every implementation keeps (and §8 tests):
- **Transactional publish.** A message written with `ctx.Transaction` exists if and only if that transaction commits. A rollback leaves no message. (With RabbitMQ this is done with the same outbox table and a relay, never by publishing inside the transaction.)
- **At least once.** A message can be delivered more than once (a crash after the handler ran, before it was marked done). Every handler is idempotent: event handlers through the inbox (§3.2), job handlers by checking whether their effect already happened.
- **Order only by key.** Jobs with the same `OrderingKey` run one at a time in the order they were enqueued; jobs without a key, or with different keys, run in parallel in any order. A job waiting to retry keeps its place, so later jobs with its key wait for it: that is the point of the key. So keys are **per job kind** (`interface:case:{id}`, `charge:case:{id}`), and a job that is due only later on purpose (a held release) has no key, so it never holds up other work on the case.
- **No payload PHI unless needed.** Payloads carry ids (case, document, queue entry), not patient names. A handler reads what it needs, through the same access rules as the API.
- **Tenant and facility on every message,** so a handler never acts across tenants, and so queue views can be filtered by facility.

## 3. The SQL Server implementation

### 3.1 Tables

```sql
CREATE TABLE bus.Outbox (           -- events, written in the caller's transaction
  Id            BIGINT IDENTITY PRIMARY KEY,
  MessageId     UNIQUEIDENTIFIER NOT NULL UNIQUE,     -- the eventId clients and consumers deduplicate on
  EventType     NVARCHAR(200)   NOT NULL,
  Payload       NVARCHAR(MAX)   NOT NULL,             -- JSON
  TenantId      NVARCHAR(64)    NOT NULL,
  FacilityId    NVARCHAR(64)    NULL,
  CorrelationId NVARCHAR(100)   NOT NULL,
  OccurredAt    DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
  DispatchedAt  DATETIME2(3)    NULL                   -- set when every subscriber's job has been created
);
CREATE INDEX IX_Outbox_Pending ON bus.Outbox (Id) WHERE DispatchedAt IS NULL;

CREATE TABLE bus.Inbox (            -- what each consumer has already handled
  Consumer      NVARCHAR(200)   NOT NULL,
  MessageId     UNIQUEIDENTIFIER NOT NULL,
  HandledAt     DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
  PRIMARY KEY (Consumer, MessageId)
);

CREATE TABLE bus.Job (
  Id               BIGINT IDENTITY PRIMARY KEY,
  JobId            UNIQUEIDENTIFIER NOT NULL UNIQUE,
  Kind             NVARCHAR(200)   NOT NULL,          -- e.g. 'interface.dispatch', 'export.build' (§5)
  Payload          NVARCHAR(MAX)   NOT NULL,
  Status           TINYINT         NOT NULL,          -- 0 Ready, 1 Running, 2 Done, 3 DeadLettered, 4 Cancelled
  DueAt            DATETIME2(3)    NOT NULL,
  OrderingKey      NVARCHAR(200)   NULL,
  DeduplicationKey NVARCHAR(200)   NULL,
  Attempts         INT             NOT NULL DEFAULT 0,
  MaxAttempts      INT             NOT NULL,
  LeaseOwner       NVARCHAR(200)   NULL,              -- the worker instance
  LeaseExpiresAt   DATETIME2(3)    NULL,
  LastError        NVARCHAR(2000)  NULL,              -- no PHI (§7)
  TenantId         NVARCHAR(64)    NOT NULL,
  FacilityId       NVARCHAR(64)    NULL,
  CorrelationId    NVARCHAR(100)   NOT NULL,
  CreatedAt        DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
  CompletedAt      DATETIME2(3)    NULL
);
CREATE INDEX IX_Job_Ready ON bus.Job (DueAt, Id) INCLUDE (Kind, OrderingKey) WHERE Status = 0;
CREATE INDEX IX_Job_Lease ON bus.Job (LeaseExpiresAt) WHERE Status = 1;
CREATE INDEX IX_Job_Key ON bus.Job (OrderingKey, Status, Id) WHERE OrderingKey IS NOT NULL AND Status IN (0, 1);
CREATE UNIQUE INDEX UX_Job_Dedup ON bus.Job (Kind, DeduplicationKey) WHERE DeduplicationKey IS NOT NULL AND Status IN (0, 1);
-- plus a CancelRequested BIT NOT NULL DEFAULT 0 column on bus.Job (cooperative cancellation, §4)

CREATE TABLE bus.RecurringJob (     -- the timetable and the lease that stops two runs overlapping
  Name           NVARCHAR(200) PRIMARY KEY,
  Cron           NVARCHAR(100) NOT NULL,              -- UTC
  NextRunAt      DATETIME2(3)  NOT NULL,
  LeaseOwner     NVARCHAR(200) NULL,
  LeaseExpiresAt DATETIME2(3)  NULL,
  LastRunAt      DATETIME2(3)  NULL,
  LastOutcome    NVARCHAR(400) NULL,
  Enabled        BIT           NOT NULL DEFAULT 1
);
```

The schema is created by the pipeline's reviewed scripts (decision D4), never at start-up.

### 3.2 Claiming work without blocking

**The database runs with `READ_COMMITTED_SNAPSHOT ON`.** The ordering-key checks below then read the last committed version of other rows instead of waiting on locks, so claiming never blocks; and because a row another worker is claiming still reads as Ready (committed version), the next job with the same key is correctly held back. (Adding `READPAST` to those checks would be wrong: it would skip the row being claimed and let the next one through.) Deadlocks (error 1205) are retried by the worker.

A worker claims ready jobs in one statement; other workers skip the locked rows instead of waiting:

```sql
WITH next AS (
  SELECT TOP (@batch) j.*
  FROM bus.Job j WITH (ROWLOCK, UPDLOCK, READPAST)
  WHERE j.Status = 0 AND j.DueAt <= SYSUTCDATETIME()
    AND (j.OrderingKey IS NULL OR NOT EXISTS (          -- one at a time per ordering key
          SELECT 1 FROM bus.Job r WHERE r.OrderingKey = j.OrderingKey AND r.Status = 1)
         AND NOT EXISTS (                              -- and the oldest first
          SELECT 1 FROM bus.Job o WHERE o.OrderingKey = j.OrderingKey AND o.Status = 0 AND o.Id < j.Id))
  ORDER BY j.DueAt, j.Id
)
UPDATE next SET Status = 1, LeaseOwner = @worker, LeaseExpiresAt = DATEADD(SECOND, @leaseSeconds, SYSUTCDATETIME()), Attempts = Attempts + 1
OUTPUT inserted.*;
```

- **Wake-up:** a commit that enqueues a job or publishes an event signals the in-process dispatcher at once; a poll every 100 ms (events) and every 1 s (jobs) covers other instances. This keeps the live-update budget (commit to dispatch ≤ 100 ms, `DEPLOYMENT_READINESS_REVIEW.md` §8).
- **Lease:** a running handler renews its lease every third of the lease time. A job whose lease expires (the worker died) goes back to Ready, keeping its attempt count; if that was its last attempt it is dead-lettered instead, so a job that keeps crashing its worker can't loop forever.
- **Fencing:** a handler's final update (Done, RetryLater, Failed) succeeds only `WHERE JobId = @id AND LeaseOwner = @worker AND Attempts = @attempt`. A worker whose lease already expired, and whose job was taken by another, changes nothing.
- **Deduplication:** `EnqueueAsync` with a `DeduplicationKey` inserts with `INSERT … SELECT … WHERE NOT EXISTS (… WITH (UPDLOCK, HOLDLOCK))`, so a second request while the first is open adds nothing and returns the open job's `JobId`, instead of failing the caller's transaction on the unique index.
- **Events:** the dispatcher reads pending outbox rows in `Id` order. A live-update event goes straight to the SignalR hub, as `LIVE_UPDATES_SIGNALR.md` §6 says (the 100 ms budget); every other subscriber gets one job (`event:{Consumer}`), so it has the same retry, dead letter and monitoring as any job. Then `DispatchedAt` is set. The `eventId` clients deduplicate on is the outbox row's `MessageId`.
- **Inbox:** an event handler runs inside a transaction that also inserts `(Consumer, MessageId)` into `bus.Inbox`; a duplicate key means it already ran, and the job is marked done without running it again.

### 3.3 Retention

- Done and cancelled jobs, dispatched outbox rows and inbox rows: purged after 14 days (a recurring job). Long enough to investigate; no clinical record lives here (the clinical record is in the domain tables and the audit log).
- Dead-lettered jobs: kept until someone resolves them (§4), then purged with the rest.
- Payloads hold ids, not PHI (§2). The database is encrypted at rest (TDE) like the rest of the data.

## 4. Retries and dead letters

- **Transient failure** (`RetryLater`, a timeout, an exception the handler marks transient): the job goes back to Ready with `DueAt = now + backoff(Attempts)`. Default backoff: exponential from 10 s, doubling, capped at 15 minutes, with ±20% jitter. A job kind can set its own delays: report delivery keeps the lab's configured retry delays (`src/services/delivery/deliveryRetryPolicy.ts`, default 1, 5 and 15 minutes).
- **Permanent failure** (`Failed`), or `Attempts = MaxAttempts`: the job is **dead-lettered** (Status 3). Then:
  - it is shown where staff already look for undelivered work: Audit Log → Interfaces → Outbound for interface jobs, Audit Log → Interfaces → Print Queue for print jobs, and **System Logs → Server jobs** for the rest (built in Batch 551, §4a);
  - *Correction (Batch 551):* this said deliveries show in the delivery exception queue. That queue shows the delivery's own state (its fallback channels and the alert), not the bus job. A dead-lettered `delivery.attempt` job is requeued from Server jobs, as the readiness review §9 item 10 says; the delivery exception queue still shows the delivery;
  - the job kind's dead-letter hook runs (e.g. a delivery's fallback channels, `src/services/delivery/deliveryRetries.ts`; the Admin and Lab Director message).
- **Requeue by hand:** a dead-lettered job can be sent again (Attempts reset) with the capability of what it carries: `interface:outbound:resend` for interface jobs, `print:job:retry` for print jobs. The other kinds (delivery, charge, release, export, event jobs) need a capability for the "Server jobs" view, added in phase 2d. Each requeue is audited.
- **Cancel:** a Ready job is cancelled at once (a recalled held report: `CancelAsync`). A Running job gets `CancelRequested = 1`; the worker sees it at its next lease renewal and fires the handler's `CancellationToken`. A handler that can stop part-way (an export build) stops and cleans up; one that can't finishes its attempt and is then not retried.

## 4a. The Server jobs view (Batch 551, PS-539 phase 2d)

Source of truth for the wire types: `src/services/serverJobs/serverJobsContract.ts`.

| Call | Capability | What it answers |
|---|---|---|
| `GET /api/jobs/health` | `jobs:server-job:view` | `ServerJobsHealth`: for each job kind, the number Ready, the oldest Ready job's time past its `DueAt` (seconds), the number Running and the dead letters in the last 24 hours; each recurring job's `lastRunAt` and last outcome; and `generatedAt`. No patient data. The same figures as `/health/bus` (§7). |
| `GET /api/jobs/dead-letters?kind=…` | `jobs:server-job:view` | `DeadLetteredJob[]`, newest first: the kind (`event:{consumer}` may be sent as is; the browser shows it as an event job with its consumer), attempts of max, when it was enqueued and dead-lettered, `lastError` (a code and short English, never patient data), `facilityId`, `caseId` (an id only) and `correlationId`. **Only jobs at facilities the user is assigned to** (the browser filters again). |
| `POST /api/jobs/{jobId}/requeue` | `jobs:server-job:requeue` at the job's facility and case (every facility for a job that names neither) | Attempts reset, Ready now; audited. `409 { code: 'NOT_DEAD_LETTERED' }` if it isn't dead-lettered any more. Interface and print jobs are refused here: they are resent from their own screens with `interface:outbound:resend` and `print:job:retry`. |

Errors: 401 (session ended), 403 (`NOT_PERMITTED`), 404 (`NOT_FOUND`), 409 (`NOT_DEAD_LETTERED`), with a body `{ code }`.

**The screen** (System Logs → **Server jobs**, shown to those with `jobs:server-job:view`, seeded for Admin):
- a kind is flagged when work is more than 5 minutes past due or anything was dead-lettered in 24 hours (§7);
- a recurring job is flagged when its last run is more than three intervals old, judged against the server's `generatedAt`, so a workstation clock that is off doesn't matter; one that runs on its own schedule (Assist polling, print batches) or is optional (the ROSE monitor) is left to the server's alert;
- **Requeue** is one click, with the outcome shown above the list (the job leaves it);
- an interface or print job's row opens Interfaces → Outbound or Interfaces → Print Queue, where it is resent;
- a kind or recurring job this version doesn't know is shown as the server names it, with no action.

With no API server (the demo) the browser does this work itself, and the view says so.

## 5. Job kinds

| Kind | Payload | Ordering key | Max attempts | Replaces in the browser |
|---|---|---|---|---|
| `interface.dispatch` | `{ queue, entryId }` | `interface:case:{caseId}` (patient messages: `interface:patient:{patientId}`) | 8 | The outbound queues and their retries: `src/services/interfaceDispatch/outboundQueueAdapters.ts` |
| `delivery.attempt` | `{ deliveryEntryId }` | `delivery:case:{caseId}` | the lab's delays + 1 | `src/services/delivery/deliveryRetries.ts` (`runDeliveryRetrySweep`) |
| `print.dispatch` | `{ printJobId }` | `printer:{destinationId}` (the printer's id in the site agent's configuration, `SITE_AGENT_API.md` §3) | the lab's delays + 1 | `src/services/printing/dispatchPrintJob.ts`; hands the job to the site agent. *(Corrected in Batch 546: this keyed by an id `PrintDestination` doesn't have, gave 4 attempts where print retries follow the lab's delivery delays, and folded in the label tracker's 120 s "no answer" timer (`networkPrintJobs`), which is for labels only and becomes its own delayed job.)* |
| `report.releaseHeld` | `{ heldReleaseId }` | none (due at the delay's end; a key would hold up other work on the case) | 5 | `src/services/reportRelease/releaseReport.ts` (`releaseDueReports`), enqueued with `DueAt` = the delay's end; cancelled by Recall |
| `charge.dispatch` | `{ chargeId }` | `charge:case:{caseId}` | 8 | The charge outbox (enqueued today, never sent) |
| `export.build` | `{ exportId }` | none | 2 | Browser CSV building; see `ASYNC_EXPORT_API.md`. Runs on an always-on worker (a build may take 30 min, longer than a serverless function may run). |
| `event:{consumer}` | the event | none | 8 | Created by the dispatcher from `bus.Outbox` (§3.2) |

**A held result (Batch 561).** A result message can't be built yet when its report PDF isn't available or, with the API server, its workup version isn't known (`prepareOruR01Dispatch.ts`: `pdf_unavailable`, `version_unknown`). For `interface.dispatch` that is a **temporary** failure, retried with the back-off of §4, because both usually clear by themselves (the renderer or the report versions become readable again). After its 8 attempts it is dead-lettered and waits on the failed-messages screen for a person, as in the browser today, with the reason. While it is retried, later messages for the same case wait behind it (the ordering key): that is intended, so a correction never reaches the EHR before the result it corrects. Other cases are not held up.

Recurring jobs (the timers of `DEPLOYMENT_READINESS_REVIEW.md` §7; each run does one batch and ends, so none comes near a serverless time limit):

| Name | Schedule (UTC) | Replaces |
|---|---|---|
| `delivery.retrySweep` | every 30 s | `src/services/delivery/deliveryRetryDeps.ts` (`startDeliveryBackgroundWork`) |
| `release.dueSweep` | every 15 s (a safety net under the delayed `report.releaseHeld` jobs) | `src/services/reportRelease/releaseReportDeps.ts` (`startReleaseBackgroundWork`) |
| `consult.expireLinks` | every 5 min | `mockConsultTokenService.recordExpiries` |
| `registry.escalateStale` | hourly | `registryExceptionsService` (`escalateStaleRegistrySubmissions`) |
| `followUp.dailyAlerts` | daily | `followUpLive` (`sendFollowUpAlertsLive`) |
| `supportAccess.expire` | every 5 min | `supportAccessService.expire` |
| `cytology.histologyCorrelationSweep` | daily | `cytologyHistologyCorrelationLive` |
| `assist.pollLis` | every `intervalMinutes` of each site | none today (manual "Poll now" only) |
| `print.batchAggregation` | per batch schedule (PS-279) | none today (manual only) |
| `cytology.roseSlaMonitor` | every 5 min (optional) | display only today |
| `bus.purge` | daily | — (§3.3) |

## 6. What the browser stops doing

When the API server runs a job, the browser's stand-in for it stops (they already run only while someone is signed in; `DEPLOYMENT_READINESS_REVIEW.md` §7): AppShell no longer starts the delivery and release sweeps, and queue actions call the API, which enqueues jobs. This is a phase 2d change, listed in the review's §9.

*Done in Batch 555:* the browser stops standing in for a recurring job once the deployment's config.json lists it in `VITE_SERVER_JOBS` (`RUNTIME_CONFIG.md`).
- `src/services/serverJobs/browserStandIns.ts` lists each stand-in against the recurring job that replaces it (`delivery.retrySweep` to `cytology.histologyCorrelationSweep`).
- Each checks `browserRunsServerJob('<job>')` where it starts, and a guard test keeps that true.
- **When the server's team ships a job (phase 2e),** the deployment adds it to `VITE_SERVER_JOBS` at the same time. A job not listed keeps running in the browser, so nothing is left without a runner.

Still open: queue actions calling the API (they follow each queue's endpoints, phase 2e).

## 7. Monitoring and security

- **Health:** for each job kind, the number Ready, the age of the oldest Ready job, the number Running, and dead letters in the last 24 hours. Exposed at `/health/bus` (no PHI) and as metrics.
- **Alerts:** a Ready job whose `DueAt` passed more than 5 minutes ago (measured from `DueAt`, so a held release waiting for its delay never alarms); any new dead letter for `interface.dispatch` or `delivery.attempt`; a recurring job whose `LastRunAt` is more than three intervals old.
- **No PHI in `LastError`:** handlers write a code and a short English description (the same rule as audit `detail`), never patient names or report text.
- **Access:** only the API's own identity reads and writes the `bus` schema. Staff see jobs only through the existing screens and capabilities (§4).

## 8. Contract tests (Pete's D1 check)

One test suite, `MessageBusContractTests`, written against `IMessageBus` only and run against **every implementation** (SQL Server now; RabbitMQ if it is ever added). An implementation is accepted only when all pass:

1. A message published in a transaction that rolls back is never delivered; one in a transaction that commits is delivered.
2. Each event reaches every subscriber at least once; a handler run twice for the same `MessageId` has its effect once (inbox).
3. Jobs with the same ordering key run one at a time, in enqueue order; jobs with different keys run in parallel.
4. A job with `DueAt` in the future does not run before it.
5. A `RetryLater` runs again after the backoff; `Failed`, or the last attempt, dead-letters it; the dead-letter hook runs once.
6. A worker killed mid-job: the lease expires and another worker runs it; no job is lost.
7. A duplicate `DeduplicationKey` while the first is open adds nothing.
8. `CancelAsync` on a Ready job stops it; on a Done job it returns false.
9. Two instances of a recurring job never run at the same time.
10. Load: 50 jobs per second for 10 minutes on the reference database, with no due job waiting more than 2 s. If this fails on SQL Server, that is the signal (decision D1) to add RabbitMQ.
11. A worker whose lease expired can't complete a job another worker has taken (fencing); a job that crashes its worker on every attempt is dead-lettered after its last.

**What a RabbitMQ implementation would really be.** RabbitMQ has no native delayed delivery (it needs the delayed-message plugin, or TTL with a dead-letter exchange), no ordering per key across competing consumers, and no way to cancel or deduplicate a message once queued. So a RabbitMQ implementation would keep the job's state (due time, ordering key, attempts, cancel, dedup) in these SQL tables, and use RabbitMQ to carry the work to the workers and to fan events out. Callers don't change, and tests 1–9 and 11 are the target unchanged; expect the adapter to need its own work to meet tests 3, 4 and 8.

## 9. Status

| Part | Status |
|---|---|
| This contract | **Written, Batch 542** |
| SQL Server implementation and the contract tests | **Planned** (India team, phase 2e) |
| Browser stand-ins switched off job by job, as the deployment lists them in `VITE_SERVER_JOBS` (§6) | **Done, Batch 555** (browser side; the jobs are phase 2e) |
| The Server jobs view (§4a): health, recurring jobs, dead letters, requeue; capabilities `jobs:server-job:view` and `jobs:server-job:requeue` | **Done, Batch 551** (browser side; the `/api/jobs` endpoints are the India team's, phase 2e) |
| RabbitMQ implementation | Only if test 10 fails |
