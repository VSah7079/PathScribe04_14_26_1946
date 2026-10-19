# Report Templates: server calls

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the PathScribe API server for these services, written for the India team. Built on `HTTP_SERVICES_PATTERN.md`: `/api/...` paths, ids URL-encoded, JSON bodies, bearer token, fixed error codes only.

## Report templates

Browser service: `reportTemplateService` (`src/services/reportTemplates/httpReportTemplateService.ts`, interface `IReportTemplateService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `getAll` | `GET /api/report-templates/report-template/get-all` | - | the item(s) as JSON; failure = fixed error code |
| `getById` | `GET /api/report-templates/report-template/get-by-id` | - | the item(s) as JSON; failure = fixed error code |
| `create` | `POST /api/report-templates/report-template/create` | the `template` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `update` | `POST /api/report-templates/report-template/update` | the `changes` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `save` | `PUT /api/report-templates/{id}` | the `template` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `publish` | `POST /api/report-templates/report-template/publish` | - | the item(s) as JSON; failure = fixed error code |
| `clone` | `POST /api/report-templates/report-template/clone` | JSON `{ name }` | the item(s) as JSON; failure = fixed error code |
| `remove` | `POST /api/report-templates/report-template/remove` | - | the item(s) as JSON; failure = fixed error code |
| `archive` | `POST /api/report-templates/report-template/archive` | - | the item(s) as JSON; failure = fixed error code |
| `getBySubspecialty` | `GET /api/report-templates/report-template/get-all?subspecialtyId={subspecialtyId}` | - | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.
