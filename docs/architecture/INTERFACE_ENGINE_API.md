# Interface Engine: server calls

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the PathScribe API server for these services, written for the India team. Built on `HTTP_SERVICES_PATTERN.md`: `/api/...` paths, ids URL-encoded, JSON bodies, bearer token, fixed error codes only.

## Interface engine: order-created events

Browser service: `interfaceEngineService` (`src/services/interfaceEngine/httpInterfaceEngineService.ts`, interface `IInterfaceEngineService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `postOrderCreated` | `POST /api/interface-engine/interface-engine/post-order-created` | the `payload` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `listDispatchedEvents` | `GET /api/interface-engine/dispatched-events?organisationId={organisationId}` | - | the item(s) as JSON; failure = fixed error code |
| `listDispatchTrail` | `GET /api/interface-engine/interface-engine/list-dispatch-trail` | - | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.
