# Ai Vendor Policy: server calls

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the PathScribe API server for these services, written for the India team. Built on `HTTP_SERVICES_PATTERN.md`: `/api/...` paths, ids URL-encoded, JSON bodies, bearer token, fixed error codes only.

## AI vendor policy (allowed services and regions per jurisdiction)

Browser service: `aiVendorPolicyService` (`src/services/aiIntegration/httpAiVendorPolicyService.ts`, interface `IAiVendorPolicyService`). Used when an API server address is configured; otherwise the demonstration service answers.

| Method | Call | Sent | Answer |
|---|---|---|---|
| `list` | `GET /api/ai-vendor-policy/rules` | - | the item(s) as JSON; failure = fixed error code |
| `save` | `POST /api/ai-integration/ai-vendor-policy/save` | the `rule` argument as JSON | the item(s) as JSON; failure = fixed error code |
| `remove` | `DELETE /api/ai-vendor-policy/rules?jurisdiction={scope.jurisdiction}&facilityId={scope.facilityId}` | - | the item(s) as JSON; failure = fixed error code |
| `rulesForCheck` | `GET /api/ai-vendor-policy/rules` | - | the item as JSON |
| `served` | `GET /api/ai-integration/ai-vendor-policy/served` | - | the item as JSON |

Permission: decided by the server on every call (`AUTHORIZATION_API.md`); a refusal is `403` and arrives as `NOT_PERMITTED`. A missing item is `404` (`NOT_FOUND`). No patient text is returned in an error.
