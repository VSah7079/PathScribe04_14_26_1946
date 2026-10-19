# Interface Exceptions: server calls

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the PathScribe API server for these services, written for the India team. Built on `HTTP_SERVICES_PATTERN.md`: `/api/...` paths, ids URL-encoded, JSON bodies, bearer token, fixed error codes only.

## Interface exceptions (messages the interface could not file)

Browser service: `interfaceExceptionService` (`src/services/interfaceExceptions/httpInterfaceExceptionService.ts`, interface `IInterfaceExceptionService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `getAll` | `GET /api/interface-exceptions/interface-exception/get-all` | - | the item(s) as JSON; failure = fixed error code |
| `getPending` | `GET /api/interface-exceptions/interface-exception/get-all?status=pending` | - | the item(s) as JSON; failure = fixed error code |
| `getById` | `GET /api/interface-exceptions/interface-exception/get-by-id` | - | the item(s) as JSON; failure = fixed error code |
| `create` | `POST /api/interface-exceptions/interface-exception/create` | the `input` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `resolve` | `POST /api/interface-exceptions/interface-exception/resolve` | JSON `{ resolvedBy, note }` | the item(s) as JSON; failure = fixed error code |
| `dismiss` | `POST /api/interface-exceptions/interface-exception/dismiss` | JSON `{ resolvedBy, note }` | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.
