# Template Signals: server calls

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the PathScribe API server for these services, written for the India team. Built on `HTTP_SERVICES_PATTERN.md`: `/api/...` paths, ids URL-encoded, JSON bodies, bearer token, fixed error codes only.

## Template suggestion signals

Browser service: `templateSuggestionSignalService` (`src/services/templateSuggestions/httpTemplateSuggestionSignalService.ts`, interface `ITemplateSuggestionSignalService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `recordSignal` | `POST /api/template-suggestions/template-suggestion-signal/record-signal` | the `signal` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `getAll` | `GET /api/template-suggestions/template-suggestion-signal/get-all` | - | the item(s) as JSON; failure = fixed error code |
| `getByTemplate` | `GET /api/template-suggestions/template-suggestion-signal/get-all?templateId={templateId}` | - | the item(s) as JSON; failure = fixed error code |
| `getStats` | `GET /api/template-suggestion-signals/stats?studyId={studyId}` | - | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.

## Narrative edit signals

Browser service: `narrativeSignalService` (`src/services/narrativeSignals/httpNarrativeSignalService.ts`, interface `INarrativeSignalService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `recordSignals` | `POST /api/narrative-signals/narrative-signal/record-signals` | JSON `{ signals }` | the item(s) as JSON; failure = fixed error code |
| `getAll` | `GET /api/narrative-signals/narrative-signal/get-all` | - | the item(s) as JSON; failure = fixed error code |
| `getByTemplate` | `GET /api/narrative-signals/narrative-signal/get-all?reportTemplateId={reportTemplateId}` | - | the item(s) as JSON; failure = fixed error code |
| `getByStudy` | `GET /api/narrative-signals/narrative-signal/get-all?studyId={studyId}` | - | the item(s) as JSON; failure = fixed error code |
| `getAccepted` | `GET /api/narrative-signals/narrative-signal/get-all?accepted=true&reportTemplateId={reportTemplateId}` | - | the item(s) as JSON; failure = fixed error code |
| `getStats` | `GET /api/narrative-signals/stats?studyId={studyId}` | - | the item(s) as JSON; failure = fixed error code |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.
