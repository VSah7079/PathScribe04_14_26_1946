# Lis Ingestion: server calls

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the PathScribe API server for these services, written for the India team. Built on `HTTP_SERVICES_PATTERN.md`: `/api/...` paths, ids URL-encoded, JSON bodies, bearer token, fixed error codes only.

## LIS ingestion: the staging queue

Browser service: `lisStagingQueueService` (`src/services/lisIngestion/httpLisStagingQueueService.ts`, interface `ILisStagingQueueService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `load` | `GET /api/lis-ingestion/lis-staging-queue/load` | - | a JSON array; empty on failure |
| `save` | `POST /api/lis-ingestion/lis-staging-queue/save` | the `queue` argument as JSON | 204; failure throws a fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.
