# Front-end audit against the serverless, event-driven direction (Oct 21, 2026)

Rule 11 in `CLAUDE.md` sets the target: a stateless front end, admin screens that manage stateless configuration (webhooks, event triggers, queues, endpoints, mappings), BridgeLink as the always-on MLLP-to-HTTP/event bridge, and FHIR/OAuth2 client management over stateless REST. This audit checked the code and every README and architecture document for statements or behaviour that cut against it. It changed no behaviour. Status words: **Clear** (nothing against the direction), **Stand-in** (the browser does work the server will do; documented as a stand-in), **Decision** (needs Pete).

## A. Screens and services

| Area | Finding | Status |
|---|---|---|
| Server-process controls (start, stop, restart, port switch, daemon status as a control) | None exist. No component or service calls a start, stop or restart. The Interface Monitoring screen and `EngineStatusLine` only read status ("listeners down" is displayed, never controlled). `IInterfaceMonitoringService` says so in its header. | Clear |
| Interface engine service (`IInterfaceEngineService`) | Only posts and lists order-created events and the dispatch trail. No channel, port or process control. | Clear |
| Planned HL7 listener screen (handover section 19) | Was written with port switches and start/stop. **Rewritten Oct 21** to channel mappings, event-bus queues, webhook routes and an error queue through BridgeLink API calls. | Fixed (doc) |
| Sections 17 (FHIR/OAuth2) and 18 (EHR connectors) | Client registration, secret rotation, webhook subscriptions and connector setup forms. No process control. | Clear |
| Assist LIS polling screen | A schedule (enabled, interval) and **Poll now**. Configuration, not a process control. README says nothing runs on a timer yet. | Clear; production side must be a scheduled function |
| Browser timers doing server work | `startReleaseBackgroundWork` (held-report release, 15 s) and `deliveryRetryDeps` (30 s sweep) run in the browser while someone is signed in. `MESSAGE_BUS_API.md` §7 records them as stand-ins that stop when the API server runs the job. Other `setInterval` uses are clocks, countdowns, fallback polling when the live connection is down, and idle timeout. | Stand-in (documented) |
| Browser storage | 65 service files use `localStorage`, nearly all `mock*` demo services. Real uses: `sessionProfile` (minimal profile), the signing lock, the cross-tab session marker (`sessionSupersedeService`), draft cache. These are per-browser conveniences and hold no authoritative state. | Clear for demo; the production services (http) must not write domain data to the browser |
| Live updates | The front end holds one SignalR connection (`signalRLiveUpdateService`), with polling fallback. A persistent connection conflicts with a stateless-everything reading. | Decision |
| Local hardware | The PathScribe site agent and the label tray bridge are on-site software that connects outward. They are not the web front end. | Clear |

## B. Documents that cut against the direction (not changed; need your decision)

| Where | What it says | Conflict |
|---|---|---|
| `DEPLOYMENT_READINESS_REVIEW.md` §1, §3 | "Scaling to zero is not compatible with a 1-second refresh or STAT cases"; API server, SignalR hub, outbox dispatcher (`IHostedService`) and report renderer rated **always-on** | The review rates these parts always-on because cold starts conflict with a 1-second refresh. It does not say 1 second is unreachable: a warm minimum with pushed updates can meet it |
| `LIVE_UPDATES_SIGNALR.md`, `DEPLOYMENT_READINESS_REVIEW.md` §5 | Self-hosted hub needs Redis and **sticky sessions** | A stateful hub |
| `AUTHENTICATION_OIDC.md`, `docs/README.md` | **Server-held tokens** and server-held sessions | Conflicts with a stateless front end; signed tokens from the identity provider fit |
| `ASYNC_EXPORT_API.md`, `MESSAGE_BUS_API.md` | `export.build` runs on an **always-on worker** (builds can take 30 minutes) | Needs a queue-triggered function or job, with a limit |
| `INTERFACE_ENGINE_EDGE.md`, `DEPLOYMENT_READINESS_REVIEW.md` §6 | Interface engine "always-on, or on-site" | Matches the target for BridgeLink (always-on pod). The edge document's wording should name the pod, the event bus and the error queue |
| Admin Guide chapter 1 (`01-system-overview.md`) and chapter 7 | Describes the always-on parts, the hub and the sticky-session choices exactly as the contracts above state them | Accurate to the contracts today; revise when the decisions are made |
| `CLAUDE.md` rule 11 and `docs/architecture/README.md` | Now state the target | Fixed |

## C. Decisions for Pete

1. **Live updates:** a managed SignalR service (the server stays stateless, connections are held by the managed service), or event subscriptions delivered to the browser another way.
2. **Sessions:** replace server-held tokens and sessions with signed tokens from the identity provider.
3. **Always-on parts:** the API server, report renderer and export worker become scheduled or event-triggered functions and containers that scale to zero, or stay always-on with a stated reason. BridgeLink stays always-on.
4. **Background jobs (PS-809):** scheduled or event-triggered functions, never timers inside a process.

## D. Method

Searched `src` for start/stop/restart/port/listener controls, `setInterval`, `WebSocket`/`EventSource`/SignalR, and `localStorage`; read the service interfaces and the monitoring, assist-polling, release and delivery code; searched every `*.md` (READMEs, `docs/`, the Admin Guide chapters) for daemon, on-premises, sticky, server-held, always-on, hosted-service and start/stop wording. Matches about keyboard "always-on commands" and CSS `sticky` are unrelated and were ignored.
