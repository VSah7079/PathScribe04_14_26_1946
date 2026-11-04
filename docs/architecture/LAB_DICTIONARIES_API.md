# LAB_DICTIONARIES_API.md: departments, locations, container types, ink colours, cassette colours, physicians, reasons

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616 (PS-507). The browser side is the `http*Service.ts` file next to each mock. Rules for every call are those of `STAFF_ADMIN_API.md` §0. Reads need a signed-in user; every write needs the dictionary's own configuration permission, listed per dictionary below and in `AUTHORIZATION_API.md` under "Configuration: lab dictionaries and case workflow", checked by the server. The server stamps `createdAt` and `updatedAt`.

## 1. Departments (`IDepartmentService`)

Writes need `config:departments:manage`.

`GET /api/departments/department/get-all`, `GET /api/departments/department/get-by-id`, `POST /api/departments/department/add`, `POST /api/departments/department/update`, `POST /api/departments/department/verify`, `POST /api/departments/department/deactivate`, `POST /api/departments/department/find-or-create-by-name` with `{ name, note }` (find by name, or create an Unverified one: order intake).

## 2. Locations (`ILocationService`)

Writes need `config:facilities:manage`.

`GET /api/locations/location/get-all`, `GET /api/locations/location/get-all?facilityId=` (the facility's list), `GET /api/locations/location/get-by-id`, `POST /api/locations/location/create`, `POST /api/locations/location/update`, `POST /api/locations/location/deactivate`, `.../reactivate`, `.../verify`, and `POST /api/locations/location/find-or-create-by-pv1` with `{ facilityId, pointOfCare, room?, bed?, hl7FacilityCode?, locationStatus?, personLocationType?, building?, floor? }` (the inbound-message PV1 location: replies `{ location, outcome: "matched" | "created" }`; a created one is Unverified and auto-created).

## 3. Container types (`IContainerTypeService`)

Writes need `config:container-types:manage`.

`GET /api/container-types/container-type/get-all`, `GET /api/container-types/container-type/get-by-id`, `POST /api/container-types/container-type/create`, `POST /api/container-types/container-type/update`, `POST /api/container-types/container-type/deactivate`, `.../reactivate`.

## 4. Ink colours (`IInkColorService`)

Writes need `config:ink-color:manage`.

`GET /api/ink-colors/ink-color/get-all`, `GET /api/ink-colors/ink-color/get-by-id`, `POST /api/ink-colors/ink-color/create`, `POST /api/ink-colors/ink-color/update`, `POST /api/ink-colors/ink-color/deactivate`, `.../reactivate`.

## 5. Cassette colours (`ICassetteColorService`)

Writes need `config:cassette-colors:manage`.

As ink colours at `/api/cassette-colors`, plus `GET /api/cassette-colors/cassette-color/get-by-key` (the colour definition for a key such as a specimen-type colour).

## 6. Physicians (`IPhysicianService`)

Writes need `config:physicians:manage`.

| Method | Call |
|---|---|
| `getAll()` | `GET /api/physicians/physician/get-all` |
| `getById(id)` | `GET /api/physicians/physician/get-by-id` |
| `getByNpi(npi)` | `GET /api/physicians/physician/get-by-npi`; `404` = no match, a successful "none" |
| `search(query, limit?)` | `GET /api/physicians/search?q=&limit=`; the text is a query value and is never logged |
| `findOrCreateByName(name, clientId?)` | `POST /api/physicians/physician/find-or-create-by-name` with `{ name, clientId }` |
| `findOrCreateByStructuredName(name, clientId?)` | `POST /api/physicians/physician/find-or-create-by-structured-name` with `{ name, clientId }` |
| `findOrCreateByNpi(npi, name)` | `POST /api/physicians/physician/find-or-create-by-npi` with `{ npi, name }` |
| `add(p)` / `update(id, changes)` | `POST /api/physicians/physician/add`, `POST /api/physicians/physician/update` |
| `verify(id)` / `deactivate(id)` | `POST /api/physicians/physician/verify`, `.../deactivate` |

A `resolve` call that creates a physician makes an Unverified, auto-created one for an administrator to reconcile; it is a service call from order intake, not a screen action.

## 7. Reason dictionary (`IReasonDictionaryService`)

Writes need `config:revision-reasons:manage`, except the bench categories (`BENCH_BLOCK_EXHAUSTED`, `BENCH_ADDON_EXHAUSTED`, `BENCH_BATCH_ABORT`, `BENCH_BATCH_OVERRIDE`, `BENCH_BATCH_COLD_CHAIN`, Batch 736), which need `config:bench-reasons:manage`. The server decides by the category of the entry being written.

`GET /api/reasons?category=` (the category is always sent; the server returns that category only), `POST /api/reasons/reason-dictionary/add`, `POST /api/reasons/reason-dictionary/update` (neither the id nor the category can change), `POST /api/reasons/reason-dictionary/deactivate`, `.../reactivate`.

**Bench reasons (Batch 736).** The entry's `id` is the reason's **code**: it never changes, so a lab can reword (`name`) without breaking reports. Entries carry `sortOrder` (the bench shows active reasons lowest first). The server seeds the 18 defaults with the ids in `services/reasons/benchReasons.ts` (`BE_*`, `AE_*`, `BA_*`, `BO_*`, `CC_*`) and their English wording; the browser shows the translation while the wording is the default. Every action that takes a bench reason sends its code beside the text and stores both: `AddOnOrderException.reasonCode` / `responseReasonCode` (CASE_WORKFLOWS_API.md), `Batch.abortReasonCode`, `BatchOverride.reasonCode`, `coldChainExcursion.acknowledgedReasonCode` (the batch routes take `reasonCode`), and the audit detail ends `[reason code <code>]`.
