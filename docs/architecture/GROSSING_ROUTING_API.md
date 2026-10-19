# Grossing hardware, cassette routing and dictionaries: server calls (PS-506)

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the API server for these services, in the order of the interface. The browser side is `services/<area>/http<Name>Service.ts`, built from the shared kit (`HTTP_SERVICES_PATTERN.md`); the demo keeps the mock. The server team implements the table below.

## Rules for every call

- Bearer token on every request; the server decides permission from the token and returns `403` (`NOT_PERMITTED`). The browser hides buttons; it never replaces the check (`AUTHORIZATION_API.md`).
- Errors are fixed codes only: `NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `INVALID`, `SIGNED_OUT`, `TOO_MANY_REQUESTS`, `TIMED_OUT`, `UNAVAILABLE`. The browser never shows or logs the server's message text.
- Patient names, MRNs and other patient text travel in the **body**, never in a URL or query string. Ids and short codes may be in the path.
- Every change is audited by the server with the authenticated user (a name the browser sends, such as `activatedBy` or `updatedBy`, is advisory: the server records the token's user). The audit row has ids and the action, no patient text.
- A `404` on a read that can legitimately have no answer is returned to the screen as "none" (`null`) where the interface allows it; on any other call it is `NOT_FOUND`.
- A list may come back as `{ "items": [...] }` or as a bare array only if the interface returns a list; these services return the record or list as the body.

## Grossing hardware profiles (`IGrossingHardwareProfileService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/grossing-hardware/grossing-hardware-profile/get-all` | none |  |
| `getById` | GET `/api/grossing/hardware-profiles/{id}` | none | `404` returns `null` to the screen |
| `create` | POST `/api/grossing/hardware-profiles` | `profile` | audited |
| `update` | PATCH `/api/grossing/hardware-profiles/{id}` | `changes` | audited |

## Grossing routing overrides (`IGrossingRoutingOverrideService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/grossing-routing-overrides/grossing-routing-override/get-all` | none |  |
| `add` | POST `/api/grossing/routing-overrides` | `entry` | audited |
| `update` | PATCH `/api/grossing/routing-overrides/{id}` | `changes` | audited |
| `remove` | DELETE `/api/grossing/routing-overrides/{id}` | none | audited |

## Cassette routing rules (`ICassetteRoutingRuleService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/cassette-routing/cassette-routing-rule/get-all` | none |  |
| `getById` | GET `/api/cassette-routing-rules/{id}` | none |  |
| `create` | POST `/api/cassette-routing-rules` | `draft` | audited |
| `update` | PATCH `/api/cassette-routing-rules/{id}` | `changes` | audited |
| `deactivate` | POST `/api/cassette-routing-rules/{id}/deactivate` | none | audited |
| `reactivate` | POST `/api/cassette-routing-rules/{id}/reactivate` | none | audited |

## Specimen dictionary (`ISpecimenDictionaryService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/specimen-dictionary/specimen-dictionary/get-all` | none |  |
| `addEntries` | POST `/api/specimen-dictionary/entries` | `{entries}` | audited |
| `updateEntries` | PATCH `/api/specimen-dictionary/entries` | `{entries}` | audited |
| `deprecateEntries` | POST `/api/specimen-dictionary/entries/deprecate` | `{ids}` | audited |
| `replaceDictionary` | PUT `/api/specimen-dictionary` | `{entries}` | audited |
| `findOrCreateByName` | POST `/api/specimen-dictionary/find-or-create` | `{name,note}` | audited |

## Hardware container registry (`IHardwareContainerRegistryService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/hardware-containers/hardware-container-registry/get-all` | none |  |
| `getById` | GET `/api/hardware/containers/{id}` | none |  |
| `getByRackId` | GET `/api/hardware/containers/by-rack/{rackId}` | none |  |
| `create` | POST `/api/hardware/containers` | `draft` | audited |
| `update` | PATCH `/api/hardware/containers/{id}` | `changes` | audited |
| `checkOut` | POST `/api/hardware/containers/by-rack/{rackId}/check-out` | `{batchId}` | audited |
| `checkIn` | POST `/api/hardware/containers/by-rack/{rackId}/check-in` | none | audited |

## Scan stations (`IScanStationService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/scan-stations/scan-station/get-all` | none |  |
| `listForFacility` | GET `/api/facilities/{facilityId}/scan-stations` | none |  |
| `getById` | GET `/api/hardware/scan-stations/{id}` | none |  |
| `getByBarcodeCode` | GET `/api/hardware/scan-stations/by-code/{code}` | none |  |
| `create` | POST `/api/hardware/scan-stations` | `draft` | audited |
| `update` | PATCH `/api/hardware/scan-stations/{id}` | `changes` | audited |
| `deactivate` | POST `/api/hardware/scan-stations/{id}/deactivate` | none | audited |
| `reactivate` | POST `/api/hardware/scan-stations/{id}/reactivate` | none | audited |

The mock stays the default when no API server address is configured. See `HTTP_SERVICES_PATTERN.md` §6 for which services still have only the mock.
