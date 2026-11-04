# Models: server calls

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the PathScribe API server for these services, written for the India team. Built on `HTTP_SERVICES_PATTERN.md`: `/api/...` paths, ids URL-encoded, JSON bodies, bearer token, fixed error codes only.

## AI models

Browser service: `modelService` (`src/services/models/httpModelService.ts`, interface `IModelService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `getAll` | `GET /api/models/model/get-all` | - | the item(s) as JSON; failure = fixed error code |
| `getById` | `GET /api/models/model/get-by-id` | - | the item(s) as JSON; failure = fixed error code |
| `getActive` | `GET /api/models/model/get-all?active=true` | - | the item(s) as JSON; failure = fixed error code |
| `getDefault` | `GET /api/models/model/get-default` | - | the item(s) as JSON; failure = fixed error code |
| `getDefaultVoiceModel` | `GET /api/models/model/get-default-voice-model` | - | the item(s) as JSON; failure = fixed error code |
| `setDefault` | `POST /api/models/model/set-default` | - | the item(s) as JSON; failure = fixed error code |
| `update` | `POST /api/models/model/update` | the `changes` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `retire` | `POST /api/models/model/retire` | - | the item(s) as JSON; failure = fixed error code |
| `adopt` | `POST /api/models/model/adopt` | JSON `{ modelId }` | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.

## AI model store

Browser service: `modelStoreService` (`src/services/models/httpModelStoreService.ts`, interface `IModelStoreService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `checkAuthorization` | `GET /api/models/model-store/check-authorization` | - | the item(s) as JSON; failure = fixed error code |
| `getAvailable` | `GET /api/models/model-store/get-available` | - | the item(s) as JSON; failure = fixed error code |
| `download` | `POST /api/models/model-store/download` | - | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.
