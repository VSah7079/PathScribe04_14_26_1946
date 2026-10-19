# Reagents, cold chain and label hardware: server calls (PS-508)

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the API server for these services, in the order of the interface. The browser side is `services/<area>/http<Name>Service.ts`, built from the shared kit (`HTTP_SERVICES_PATTERN.md`); the demo keeps the mock. The server team implements the table below.

## Rules for every call

- Bearer token on every request; the server decides permission from the token and returns `403` (`NOT_PERMITTED`). The browser hides buttons; it never replaces the check (`AUTHORIZATION_API.md`).
- Errors are fixed codes only: `NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `INVALID`, `SIGNED_OUT`, `TOO_MANY_REQUESTS`, `TIMED_OUT`, `UNAVAILABLE`. The browser never shows or logs the server's message text.
- Patient names, MRNs and other patient text travel in the **body**, never in a URL or query string. Ids and short codes may be in the path.
- Every change is audited by the server with the authenticated user (a name the browser sends, such as `activatedBy` or `updatedBy`, is advisory: the server records the token's user). The audit row has ids and the action, no patient text.
- A `404` on a read that can legitimately have no answer is returned to the screen as "none" (`null`) where the interface allows it; on any other call it is `NOT_FOUND`.
- A list may come back as `{ "items": [...] }` or as a bare array only if the interface returns a list; these services return the record or list as the body.

## Reagent lots (`IReagentLotService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/reagent-lots/reagent-lot/get-all` | none |  |
| `getById` | GET `/api/reagent-lots/{id}` | none |  |
| `create` | POST `/api/reagent-lots` | `draft` | audited |
| `update` | PATCH `/api/reagent-lots/{id}` | `changes` | audited |
| `deactivate` | POST `/api/reagent-lots/{id}/deactivate` | none | audited |
| `reactivate` | POST `/api/reagent-lots/{id}/reactivate` | none | audited |

## Storage condition types (`IStorageConditionTypeService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/cold-chain/storage-condition-type/get-all` | none |  |
| `getActive` | GET `/api/cold-chain/storage-condition-type/get-active` | none |  |
| `getById` | GET `/api/cold-chain/condition-types/{id}` | none |  |
| `add` | POST `/api/cold-chain/condition-types` | `entry` | audited |
| `update` | PATCH `/api/cold-chain/condition-types/{id}` | `changes` | audited |
| `deactivate` | POST `/api/cold-chain/condition-types/{id}/deactivate` | none | audited |
| `reactivate` | POST `/api/cold-chain/condition-types/{id}/reactivate` | none | audited |
| `remove` | DELETE `/api/cold-chain/condition-types/{id}` | none | audited |

## Storage units (`IStorageUnitService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/cold-chain/storage-unit/get-all` | none |  |
| `getActive` | GET `/api/cold-chain/storage-unit/get-active` | none |  |
| `getById` | GET `/api/cold-chain/storage-units/{id}` | none |  |
| `add` | POST `/api/cold-chain/storage-units` | `entry` | audited |
| `update` | PATCH `/api/cold-chain/storage-units/{id}` | `changes` | audited |
| `deactivate` | POST `/api/cold-chain/storage-units/{id}/deactivate` | none | audited |

## Telemetry readings (`ITelemetryReadingService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/cold-chain/telemetry-reading/get-all` | none |  |
| `getByAsset` | GET `/api/cold-chain/telemetry-reading/get-all?assetType&assetId` | none |  |
| `getExcursions` | GET `/api/cold-chain/telemetry-reading/get-excursions` | none |  |
| `record` | POST `/api/cold-chain/readings` | `reading` | audited |

## Label layouts (`ILabelLayoutService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `listVersions` | GET `/api/labels/layouts/versions?labelType&facilityId` | none |  |
| `restoreVersion` | POST `/api/labels/layouts/versions/{versionId}/restore` | `{restoredBy}` | audited |
| `getByLabelType` | GET `/api/labels/layouts?labelType&facilityId` | none | `404` returns `null` to the screen |
| `save` | PUT `/api/labels/layouts` | `{layout,savedBy}` | audited |
| `reset` | DELETE `/api/labels/layouts?labelType&facilityId` | none | audited |

## Printer profiles (`IPrinterProfileService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/printer-profiles/printer-profile/get-all` | none |  |
| `getById` | GET `/api/printers/profiles/{id}` | none | `404` returns `null` to the screen |
| `add` | POST `/api/printers/profiles` | `profile` | audited |
| `update` | PATCH `/api/printers/profiles/{id}` | `changes` | audited |
| `remove` | DELETE `/api/printers/profiles/{id}` | none | audited |

The mock stays the default when no API server address is configured. See `HTTP_SERVICES_PATTERN.md` §6 for which services still have only the mock.
