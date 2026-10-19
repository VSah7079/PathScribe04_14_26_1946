# Protocols: server calls

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the PathScribe API server for these services, written for the India team. Built on `HTTP_SERVICES_PATTERN.md`: `/api/...` paths, ids URL-encoded, JSON bodies, bearer token, fixed error codes only.

## Processing protocols

Browser service: `protocolService` (`src/services/protocols/httpProtocolService.ts`, interface `IProtocolService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `getAll` | `GET /api/protocols/protocol/get-all` | - | the item(s) as JSON; failure = fixed error code |
| `add` | `POST /api/protocols/protocol/add` | the `entry` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `update` | `POST /api/protocols/protocol/update` | the `changes` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `restoreVersion` | `POST /api/protocols/protocol/restore-version` | JSON `{ version }` | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.

## Fixative dictionary

Browser service: `fixativeDictionaryService` (`src/services/protocols/httpFixativeDictionaryService.ts`, interface `IFixativeDictionaryService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `getAll` | `GET /api/protocols/fixative-dictionary/get-all` | - | the item(s) as JSON; failure = fixed error code |
| `add` | `POST /api/protocols/fixative-dictionary/add` | the `entry` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `update` | `POST /api/protocols/fixative-dictionary/update` | the `changes` argument as JSON | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.

## Processing format dictionary

Browser service: `processingFormatDictionaryService` (`src/services/protocols/httpProcessingFormatDictionaryService.ts`, interface `IProcessingFormatDictionaryService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `getAll` | `GET /api/protocols/processing-format-dictionary/get-all` | - | the item(s) as JSON; failure = fixed error code |
| `add` | `POST /api/protocols/processing-format-dictionary/add` | the `entry` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `update` | `POST /api/protocols/processing-format-dictionary/update` | the `changes` argument as JSON | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.
