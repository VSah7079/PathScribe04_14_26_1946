**Batch 617 (part R):** `httpServiceKit.ts` gained `kebabCase` and `methodPath(base, method)`; `httpRoutes.guard.test.ts` enforces the one route style (`/api/<area>/<service>/<method-kebab>`, `GET` for plain-value reads, `POST` for the rest, no `PUT`/`PATCH`/`DELETE`, no id in a path; three listed exceptions). `outboundQueueRoutes.ts` uses the same rule.

## Batch 616 (part F) — follow-up tracking by commands, and biometric signing through one flow (PS-483, PS-512)

Follow-up tracking now has a server version that works by commands (`IFollowUpService`): the browser says what the user did and the server works out the window, the status and who did it; the demo works it out locally as before. Biometric enrolment, the sign-out check, the policy card and the invitation after sign-in go through one flow (`biometricFlow`): the labelled Simulated check in the demo, the API server's challenge and verification with an address (no simulated fallback). Contracts: `docs/architecture/FOLLOW_UP_API.md` (Browser commands) and `ACCESS_SESSION_API.md` (3a). Folders: `src/services/followUp/`, `src/services/biometric/`.

# services/apiServer

Batch 551 (PS-539).

**`apiServerUrl.ts`** gives the PathScribe API server's address to the services that call it directly:
- the exports (`exports/exportTrackerInstance.ts`);
- the server jobs (`serverJobs/serverJobsInstance.ts`).

**How the address is checked:** the same way sign-in checks it (`utils/serviceEndpoint.ts`): https, or plain http only to this computer in a development build.

**When there is no address:** it returns null when there is no API server (the demo), and also when the address fails the check. A failed check is logged, and the service then works without the server.

## Batch 592 (PS-481) — the shared HTTP client

**`apiHttpClient.ts`** is the one client the server-backed services use to call the API server (`get`, `post`, `put`, `patch`, `delete`).
- **Token:** it sends the signed-in user's access token, and none when nobody is signed in.
- **Results:** every call returns a `ServiceResult`. A failure carries a short fixed code (`SIGNED_OUT`, `NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `INVALID`, `TOO_MANY_REQUESTS`, `TIMED_OUT`, `UNAVAILABLE`), or the server's own code when it is a short upper-case code such as `CASE_CHANGED`.
- **PHI:** the server's message text is never used, because it could name a patient.
- **Time-out:** a call is given up after 30 seconds by default.
- **`selectByConfiguration(baseUrl, mock, makeHttp)`** picks the server version of a service when an API address is configured, and the mock otherwise (the demo).

**Next:** the new HTTP services (PS-482 onward) are built on this client. The older export, report-version and report-document clients keep their own error shapes until each is moved over on its own ticket.

## Batch 615 (PS-481, PS-482) — the pattern every server version follows

Full description: `docs/architecture/HTTP_SERVICES_PATTERN.md`.

| File | What it does |
|---|---|
| `httpServiceKit.ts` | A server version of a service is a table: one entry per interface method (`value`, `list`, `result`, `done`), checked by the type so none is forgotten. `enc` and `queryString` build paths. `ApiCallError` carries a fixed code. |
| `serviceSelection.ts` | `chooseService(component, mock, makeHttp)`: the mock without an API address, the server version with one. `usesApiServer()`, `clientFor(url)`. |
| `apiHttpClient.ts` | A call can carry headers (`If-Match`); a 409 with `currentVersion` returns it. |
| `httpServiceKit.test.ts`, `serviceSelection.test.ts` | The kit and the choice. |

`IS_MOCK_BACKEND` is still the demo-tools flag, not how a service is chosen. The first service moved over is the case service (`cases/httpCaseService.ts`).


Batch 616 (part B, PS-484, PS-507, PS-512): `notFoundAsNull.ts` (an interface whose "nothing there" is a successful null, e.g. no override, no enrolled device, no physician for an NPI) and the tests `httpStaffAdmin.test.ts`, `httpAccessSession.test.ts`, `httpLabDictionaries.test.ts`. Server versions now exist for audit, authorization, users, roles, facilities, registry settings, access requests, session time-out, biometric and seven lab dictionaries (contracts `STAFF_ADMIN_API.md`, `ACCESS_SESSION_API.md`, `LAB_DICTIONARIES_API.md`).

Batch 616 (part D, PS-510): `httpServiceExtras.ts` (`notOffered`, a demo-only method answers `NOT_SUPPORTED` and makes no call) and its test. The part D server versions follow section 3 of the pattern doc with hand-drawn routes and use `notFoundAsNull` for a "none" that is a successful null.

Batch 616 (part A, PS-483, PS-503, PS-505): `required()` in the kit (a record that must come back, or a thrown code), `replyShapes.ts` (`itemsOf`), `outboundQueueRoutes.ts` (the six shared queue calls), `httpTestHelpers.ts` (`fakeApi`, `expectCalls`, `expectEveryMethod`: the route-table test) and the instance files that choose mock or server per area.

## Batch 616 (part E) — build and same-origin guards (PS-486, PS-488)

`productionBuild.guard.test.ts` fails if a demonstration screen, demo account or the Simulated authenticator is reachable without `__DEMO_TOOLS__`, if AI or terminology-search code names an outside host, or if the UMLS and AI routes leave `/api`. The public NLM look-up is the one outside host the browser calls itself (allowed by the security headers). The mock services are still bundled in a server build.

**Batch 617:** `productionBuild.guard.test.ts` now also checks that the NLM look-ups use `/api/terminology/nlm` routes and that a server deployment's security policy leaves the NLM host out.
