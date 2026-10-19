# Routing: server calls

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the PathScribe API server for these services, written for the India team. Built on `HTTP_SERVICES_PATTERN.md`: `/api/...` paths, ids URL-encoded, JSON bodies, bearer token, fixed error codes only.

## Routing rules (facility, physician and protocol maps)

Browser service: `routingRuleService` (`src/services/routingRules/httpRoutingRuleService.ts`, interface `IRoutingRuleService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `getAll` | `GET /api/routing-rules/routing-rule/get-all` | - | the item(s) as JSON; failure = fixed error code |
| `getByType` | `GET /api/routing-rules/routing-rule/get-all?type={type}` | - | the item(s) as JSON; failure = fixed error code |
| `getById` | `GET /api/routing-rules/routing-rule/get-by-id` | - | the item(s) as JSON; failure = fixed error code |
| `add` | `POST /api/routing-rules/routing-rule/add` | the `rule` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `update` | `POST /api/routing-rules/routing-rule/update` | the `changes` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `remove` | `POST /api/routing-rules/routing-rule/remove` | - | the item(s) as JSON; failure = fixed error code |
| `getFacilityMap` | `GET /api/routing-rules/maps/facility?performingLabFacilityId={performingLabFacilityId}` | - | the item(s) as JSON; failure = fixed error code |
| `getPhysicianMap` | `GET /api/routing-rules/maps/physician?performingLabFacilityId={performingLabFacilityId}` | - | the item(s) as JSON; failure = fixed error code |
| `getProtocolMap` | `GET /api/routing-rules/maps/protocol?performingLabFacilityId={performingLabFacilityId}` | - | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.

## Print routing rules

Browser service: `printRoutingRuleService` (`src/services/printRouting/httpPrintRoutingRuleService.ts`, interface `IPrintRoutingRuleService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `getAll` | `GET /api/print-routing/print-routing-rule/get-all` | - | the item(s) as JSON; failure = fixed error code |
| `getActive` | `GET /api/print-routing/print-routing-rule/get-all?active=true` | - | the item(s) as JSON; failure = fixed error code |
| `create` | `POST /api/print-routing/print-routing-rule/create` | the `rule` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `update` | `POST /api/print-routing/print-routing-rule/update` | the `changes` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `remove` | `POST /api/print-routing/print-routing-rule/remove` | - | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.
