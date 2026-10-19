# HTTP services: how a service gets its server version (PS-481)

Batch 615. The one pattern every server-backed service follows, so the 20-odd groups of services (PS-482 to PS-484, PS-498 to PS-515) are built the same way and the India team's API server has one contract per service to honour.

## 1. The rule

- **A deployment with an API server address** (`VITE_API_BASE_URL` in `config.json`) uses the **server version** of a service.
- **A deployment without one** (the demo) uses the **mock**.
- Nobody chooses per service by hand. The runtime-config rules already make a demo build refuse an address and a server build require one (`RUNTIME_CONFIG.md` §3), so the choice can't drift from the build.
- `IS_MOCK_BACKEND` stays what it always was: the demo-tools flag (`__DEMO_TOOLS__`) that shows the demo reset and the simulate buttons. It is **not** how a service is chosen. `usesApiServer()` answers "is there a server?" when a screen needs to know.

## 2. The files

| File | What it does |
|---|---|
| `services/apiServer/apiHttpClient.ts` | The one HTTP client (Batch 592). Token, time-out, fixed error codes, never the server's message text. Since Batch 615 a call can carry headers (`If-Match`), and a 409 with `currentVersion` returns it. |
| `services/apiServer/httpServiceKit.ts` | The kit. A server version is a **table** of calls, one per interface method: `value`, `list`, `result`, `done`; `enc`, `queryString`; `buildHttpService`. |
| `services/apiServer/serviceSelection.ts` | `chooseService(component, mock, makeHttp)`, `usesApiServer()`, `clientFor(baseUrl)`. |
| `services/<area>/http<Name>Service.ts` | The server version: `createHttp<Name>Service(client): I<Name>Service`. |
| `services/<area>/<name>ServiceInstance.ts` | `export const <name>Service = chooseService('<area>', mock<Name>Service, createHttp<Name>Service)`. |
| `services/index.ts` | Re-exports the instance, in place of the mock line. Screens keep importing `<name>Service` from `@/services`. |
| `docs/architecture/<NAME>_API.md` | The contract: every call, its permission, its errors, its audit row. |

The first service built this way is the case service (`cases/httpCaseService.ts`, contract `CASE_API.md` §6).

## 3. Writing a server version

```ts
const BASE = '/api/foos/foo';                       // /api/<area-kebab>/<service-kebab>, named once
const route = (method: string): string => methodPath(BASE, method);   // BASE + '/' + method in kebab-case

export const createHttpFooService = (client: ApiHttpClient): IFooService =>
  buildHttpService<IFooService>(client, {
    listFoos:  list('GET', () => route('listFoos'), { pick: (d: { items: Foo[] }) => d.items }),
    getFoo:    value('GET', (id: string) => `${route('getFoo')}${queryString({ id })}`),
    saveFoo:   result('POST', () => route('saveFoo'), { body: (f: Foo) => f }),
    removeFoo: done('POST', () => route('removeFoo'), { body: (id: string) => ({ id }) }),
  });
```

The route style is the one in §7: every server version uses it, with no exceptions other than the three listed there.

- **Every method of the interface needs an entry.** The type checks it. A method added to the interface later fails the build until the server version has a route for it.
- **Pick the entry by what the interface returns:**

| Interface returns | Entry | On NOT_FOUND | On any other failure |
|---|---|---|---|
| `Promise<ServiceResult<T>>` | `result()` | `{ ok: false, error: 'NOT_FOUND' }` | `{ ok: false, error: <code> }` |
| `Promise<T>` or `Promise<T \| null>` | `value()` (`missing`, `fallback` options) | the `missing` value (default `null`) | the `fallback` (default: same as `missing`) |
| `Promise<T[]>` | `list()` | `[]` | `[]` |
| `Promise<void>` | `done()` | throws `ApiCallError` (`.code`) | throws `ApiCallError` |

- **`required()`** (Batch 616) is for a plain `Promise<T>` that is never "nothing" (a match result, a merge outcome): the data, or a thrown `ApiCallError`. Use it for writes where `value()`'s quiet default would hide a refusal. Where a method's own answer carries a refusal (`{ ok: false, reason }`), wrap the `required()` route and map the code, as `httpReportReleaseService.ts` does.
- **Lists** are `{ items }` and one record is the record (`replyShapes.ts`); the six outbound-queue calls are `outboundQueueRoutes(base)`.
- **A missing record that is a normal answer** (no draft, no encounter) is `{ ok: true, data: null }`: wrap the `result()` route and turn `NOT_FOUND` into null.
- **Nothing that identifies a person goes in a URL** (search terms, identifiers, MRNs): use a POST body.
- **An area with several services** may keep one instance file (`reportServicesInstance.ts`) instead of one per service.
- **Annotate the arguments** of each path, body and headers function (`(id: string) => ...`); they are not inferred.
- **`pick`** takes the part of the reply the method returns (usually `items` out of a page). **`meta`** (on `result`) carries paging (`hasMore`, `nextCursor`).
- **Paths:** one rule for every server version, in §7: `/api/<area>/<service>/<method-kebab>`. An id or a filter is never part of the path; a plain-value read puts it in the query string (`queryString()`: empty values are left out, arrays repeat the name), everything else sends it in the body.
- **Versioned saves:** send `If-Match: "<version>"` through `headers`. Map the 409 to the app's own error where the interface already has one (cases: `ConcurrencyConflictError`). See `httpCaseService.ts`.
- **A service the screens already wrap in a Simulated outcome** (no server yet for that action) keeps the mock for that method. Don't invent an endpoint the contract doesn't have.

## 4. Rules for every server version

1. **No patient text in a failure.** The client already drops the server's message; never add it back, and never log a body.
2. **Fixed codes only.** `NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `INVALID`, `SIGNED_OUT`, `TOO_MANY_REQUESTS`, `TIMED_OUT`, `UNAVAILABLE`, or the server's own short upper-case code.
3. **The server decides permission.** The browser's permission checks hide buttons; they never replace a `403` (`AUTHORIZATION_API.md`).
4. **No browser storage of results.** `browserData` (PS-485) keeps clinical data in memory on a server deployment; a server version must not write its own cache to localStorage.
5. **Same interface, same behaviour.** A screen can't tell which version it has. The service's existing tests (written against the mock) describe the behaviour; the server version gets its own tests with a fake `fetch`.
6. **Don't change a screen to make the server version fit.** Change the contract doc, then the table.

## 5. Testing a server version

- Build the client with a fake `fetch` (`createApiHttpClient({ baseUrl: 'https://api.test', fetch, accessToken })`) and call the service. Copy `cases/httpCaseService.test.ts`.
- Check, for each method: the **verb and path**, the **body**, any **headers**, the **shape of a success**, and what **NOT_FOUND / 403 / 409** become.
- `serviceSelection.test.ts` covers the choice itself, so a service's own test doesn't need to.
- Nothing needs a running server. Against a real one (or a stand-in), set `VITE_API_BASE_URL` in `config.json`: `https://` anywhere, or plain `http://localhost` in a development build only (`RUNTIME_CONFIG.md` §3). The server must allow the app's origin (CORS).

## 6. What is still the mock

A service with no server version yet is still the mock in a server build, and its data lives only as long as the tab (`browserData/README.md`). The list of services and the ticket that gives each its server version:

| Ticket | Services |
|---|---|
| PS-482 | cases (done, Batch 615), case search (done, Batch 617; `CASE_SEARCH_API.md`), case material (done, Batch 618; `CASE_MATERIAL_API.md`) |
| PS-483 | amendments, informal reviews, LIS amendment notices, release buffer, report change log, report parts, report-side queues (done, Batch 616; `REPORTS_API.md`). Follow-up tracking is COMMAND-BASED (Batch 616 part F, Pete's decision Oct 18; `FOLLOW_UP_API.md` "Browser commands"). Synoptic models are PS-511; sign-out and synoptic answers travel with the case save |
| PS-503 | patient index, encounters, patient history, ADT queue (done, Batch 616; `PATIENTS_API.md`) |
| PS-505 | incoming-order intake, crosswalk, drafts, accession queue (done, Batch 616; `ACCESSIONING_API.md`) |
| PS-484 | audit, authorization, users, roles, facilities, registry settings (done, Batch 616; contract `STAFF_ADMIN_API.md`) |
| PS-498 | billing and charge capture (done, Batch 616: 10 services; `BILLING_API.md`) |
| PS-499 | cytology and cytology QC (done, Batch 616: 33 services; `CYTOLOGY_API.md`) |
| PS-500 | molecular batches, racks, control rules and the order queue (done, Batch 616: 4 services; `MOLECULAR_API.md`) |
| PS-504 | registry reporting (done, Batch 616: 5 services; `REGISTRY_API.md`) |
| PS-501 | QA activity records and types, supervision assignments and types, reconciliations, surgical peer-review risk weights, validation studies, deficiency and resolution types, specimen deficiencies, management reviews (done, Batch 616: 11 services; `QUALITY_API.md`). Not built: peer review, peer-review settings, CAPA recommendations and QA trend policy (no interface file yet) |
| PS-502 | AI screening results and stalled-result settings, digital pathology vendors, scan batches, viewer vendors, gross imaging vendors, image management vendors, image upload (done, Batch 616: 8 services; `DIGITAL_PATHOLOGY_API.md`) |
| PS-506 | grossing hardware profiles, grossing routing overrides, cassette routing rules, specimen dictionary, hardware container registry, scan stations (done, Batch 616: 6 services; `GROSSING_ROUTING_API.md`). Routing rules are PS-509/PS-513 (`ROUTING_API.md`) |
| PS-508 | reagent lots, storage condition types, storage units, telemetry readings, label layouts, printer profiles (done, Batch 616: 6 services; `REAGENTS_LABELS_API.md`). Not built: label reprint runs, equipment and the equipment log (no interface file / PS-514) |
| PS-510 | intraoperative entries, OR event log, OR suite terminals, display profiles (done, Batch 616: 4 services; `INTRAOP_OPS_API.md`). Not built: intraoperative critical results (no interface file yet); the two demo-only methods answer `NOT_SUPPORTED` |
| PS-510 to PS-515, remaining | the services above that say "not built", and any mock not in this table (PS-514) |
| PS-509, PS-511, PS-513, PS-515 (Batch 616, part E: done) | interface exceptions, interface engine, LIS staging queue, AI models, model store, protocols, fixatives, processing formats, template and narrative signals, report templates, routing rules, print routing rules, text, voice and stain-order macros, flags, secure messaging settings, internal messages, AI vendor policy |
| PS-514 (Batch 617, part B: done) | delivery rules and retries, print settings, facility print settings, print queue, label reprint runs (`DELIVERY_PRINTING_API.md`); delegations, participation types, internal notes, display access (`DELEGATIONS_NOTES_API.md`); diagnosis codes, external resources, feedback settings, fonts, governing bodies, performance targets, priorities (`CONFIG_DICTIONARIES_API.md`); equipment and log, migration jobs, record results and field mappings, LIS sync, margin extraction, intraoperative critical results (`EQUIPMENT_MIGRATION_API.md`) |
| PS-800 (Batch 619) | delivery schedules (`DELIVERY_SCHEDULES_API.md`), billing release rules (`BILLING_RELEASE_API.md`) |
| PS-800 (Batch 619, part Q) | the Outbound Queue (`OUTBOUND_QUEUE_API.md`, `/api/delivery/outbound-queue`, 7 routes). The queue is the server's own aggregate: its billing and registry feeds are supplied server-side. |
| PS-514 (Batch 617, part A: done) | abnormal trigger rules and signals, action groups, AI behaviour, asset locations, assist polling, batches, BI feed admin, code import, NCCI edits, billing release triggers, case masks, case search, case view tracking, countersign, on-demand case fetch, client SLAs, critical result notifications, alert reference tokens and dispatch, clinical mismatch rules, clinical history dictionary, codes, code system policy, consult tokens, cytology proficiency panels, pathology lexicon, cytology compliance features, delegation types (29 services; `CONFIG_SERVICES_API.md`, `CASE_WORKFLOWS_API.md`, `CRITICAL_RESULTS_API.md`, `BILLING_API.md`, `CYTOLOGY_API.md`, `CASE_SEARCH_API.md`, `BI_FEED_API.md`) |
| PS-514, PS-501 (Batch 617, part C: done) | peer review, peer-review settings, CAPA recommendations, QA trend policy, concordance review settings, referral tracking, research feed settings, saved searches, scheduled reports, signature records, smart capture and its settings, specimen categories, custom dictionaries, stain types, sectioning protocols, molecular targets, subspecialties, support references, system configuration, TAT targets, tumor board and its four rule services, workstation groups, workstation registry (28 services; the contract docs are `QUALITY_SETTINGS_API.md`, `REFERRAL_RESEARCH_API.md`, `SEARCH_REPORTING_API.md`, `SIGNATURES_SMART_CAPTURE_API.md`, `DICTIONARIES_CONFIG_API.md`, `TUMOR_BOARD_API.md`). The research feed's three in-memory methods stay local. |
| PS-514 | everything else: see `HTTP_SERVICES_REMAINING.md` |

Each of those tickets ends with its section of this table updated.

## 7. The route rule: one style for every server version (Batch 617, Pete)

Every server (HTTP) version of a service uses ONE route style, so the API server is written once, the contract tables read the same everywhere, and a screen, a test or a person reading a network trace never has to ask which style a service uses. The calls are listed in the area's contract table. The guard `src/services/apiServer/httpRoutes.guard.test.ts` fails on anything outside this rule.

- **Path:** `/api/<area-kebab>/<service-kebab>/<method-kebab>`, for example `/api/billing/billing-deficiency/get-by-case-id`. The base is named once per file (`const BASE`), and each method's path is `methodPath(BASE, 'methodName')` (or the same text written out as `` `${BASE}/method-name` ``). Digits stay with their word (`recordPdfSha256` is `record-pdf-sha256`).
- **Verb:** `GET` for a read whose arguments are all plain values (text, number, flag, or a list of text or numbers); the arguments, all of them, go in the query string. **Everything else is `POST`.** `PUT`, `PATCH` and `DELETE` are not used: a save, an update, a removal and a revoke are commands, and their names say what they do.
- **No id or text in the path.** The id of a record goes in the query string (a plain read) or in the body (a command). Nothing that names a patient goes in a URL at all (§3).
- **Body:** one object argument is sent as the body itself. Several arguments, or plain ones, are sent as an object named by the argument names (`update(id, changes)` sends `{ id, changes }`; `remove(id)` sends `{ id }`). A body keeps the meaning it had: a command that sent only a reason still sends only the reason plus the key.
- **Answer:** `{ ok, data }` where the data is the body of the 2xx reply; failures are the fixed codes of §4.
- **Exceptions (three files, each with its own contract):** `exports/httpExportApi.ts` (export jobs are polled and downloaded), `reportDocuments/httpReportDocumentService.ts` and `reports/httpReportVersionService.ts` (binary report documents and versions). They are listed with a reason in the guard, and the list does not grow without a decision.
- **Paging, versioned saves and other special handling** still use this path and verb rule: a versioned save is `POST .../update-case` with the `If-Match` header; a page cursor is part of the body or query. Only the shape of the path is fixed.
- The server version's test checks verb, path and body of every method against a fake `fetch`.

### Earlier paths

Before Batch 617 about 85 server versions were written as REST resources (`GET /api/cases/{id}`, `PATCH /api/cases/{id}`, `PUT /api/facilities/{id}/print-settings`, `DELETE /api/roles/{id}`, `POST /api/access-requests/{id}/grant`). They were converted in Batch 617. Each contract table keeps one line, "earlier path", where its route changed, so a server author who read the older table can find the new one. The mapping of every old path to its new path is in `HTTP_ROUTE_MAPPING.md`.

**NLM look-ups (Batch 617, PS-488):** the NLM terminology look-ups are not a service interface; they follow the section 7 route naming and return NLM's raw array. Contract: `TERMINOLOGY_PROXY_API.md`.
