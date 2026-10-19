# Macros: server calls

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the PathScribe API server for these services, written for the India team. Built on `HTTP_SERVICES_PATTERN.md`: `/api/...` paths, ids URL-encoded, JSON bodies, bearer token, fixed error codes only.

## Text macros

Browser service: `macroService` (`src/services/macros/httpMacroService.ts`, interface `IMacroService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `getAll` | `GET /api/macros/macro/get-all` | - | the item(s) as JSON; failure = fixed error code |
| `getById` | `GET /api/macros/macro/get-by-id` | - | the item(s) as JSON; failure = fixed error code |
| `getByShortcut` | `GET /api/macros/macro/get-by-shortcut` | - | the macro, or `null` (200 with a null body) when none has that shortcut |
| `getForSubspecialty` | `GET /api/macros/macro/get-all?subspecialtyId={subspecialtyId}` | - | the item(s) as JSON; failure = fixed error code |
| `add` | `POST /api/macros/macro/add` | the `macro` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `update` | `POST /api/macros/macro/update` | the `changes` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `deactivate` | `POST /api/macros/macro/deactivate` | - | the item(s) as JSON; failure = fixed error code |
| `reactivate` | `POST /api/macros/macro/reactivate` | - | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.

## Voice macros

Browser service: `voiceMacroService` (`src/services/voicemacro/httpVoiceMacroService.ts`, interface `IVoiceMacroService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `getMacros` | `GET /api/voicemacro/voice-macro/get-macros` | - | a JSON array; empty on failure |
| `addMacro` | `POST /api/voicemacro/voice-macro/add-macro` | the `macro` argument as JSON | the item as JSON; the id is read from `id` |
| `updateMacro` | `POST /api/voicemacro/voice-macro/update-macro` | the `updates` argument as JSON | 204; failure throws a fixed error code |
| `deleteMacro` | `POST /api/voicemacro/voice-macro/delete-macro` | - | 204; failure throws a fixed error code |
| `bulkImport` | `POST /api/voicemacro/voice-macro/bulk-import` | JSON `{ macros }` | 204; failure throws a fixed error code |
| `getMacrosForCurrentUser` | `GET /api/voicemacro/voice-macro/get-macros-for-current-user` | - | a JSON array; empty on failure |
| `addPersonalMacro` | `POST /api/voicemacro/voice-macro/add-personal-macro` | the `macro` argument as JSON | the item as JSON; the id is read from `id` |
| `importPersonalMacros` | `POST /api/voicemacro/voice-macro/import-personal-macros` | JSON `{ macros }` | 204; failure throws a fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.

## Stain order macros

Browser service: `stainOrderMacroService` (`src/services/stains/httpStainOrderMacroService.ts`, interface `IStainOrderMacroService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `getAll` | `GET /api/stains/stain-order-macro/get-all` | - | the item(s) as JSON; failure = fixed error code |
| `add` | `POST /api/stains/stain-order-macro/add` | the `entry` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `update` | `POST /api/stains/stain-order-macro/update` | the `changes` argument as JSON | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.
