## Batch 618 (part C) — server version of case material (PS-482)

`caseMaterialService` is now a service with a demo version and an API-server version (`services/material/`, `docs/architecture/CASE_MATERIAL_API.md`): one `POST /api/material/case-material/apply-decant-change` returns the whole updated material tree and the affected billing lines. Exported from `@/services`; `applyDecantChangeLive` calls the chosen version. The optimistic store and selection state stay in the browser. Nothing was tried against a real server.

## Batch 617 (part R) — one route style for every server version of a service (PS-488 dev notes, Pete)

- **One route style.** Every server (HTTP) version now uses `/api/<area>/<service>/<method-kebab>`; a read whose arguments are all plain values is `GET` (arguments in the query string), everything else is `POST`; `PUT`, `PATCH` and `DELETE` are no longer used and no id or text is in the path. About 85 services written as REST resources were converted (code, fake-fetch tests, contract docs); the earlier-to-current path of every call is in `docs/architecture/HTTP_ROUTE_MAPPING.md`.
- **Why method routes:** the interface already has one method per action, so the server's route table is the interface's method list; the kit generates the path, so it cannot be misspelt; commands carry what they change in a body, which keeps patient text out of URLs and logs.
- **Guard:** `src/services/apiServer/httpRoutes.guard.test.ts` fails on any other verb or path shape. Three files keep their own contracts (job polling and binary downloads): `exports/httpExportApi.ts`, `reportDocuments/httpReportDocumentService.ts`, `reports/httpReportVersionService.ts`.
- **Wire changes the server author must know:** an id that was in the path is now in the query string or the body (`update(id, changes)` sends `{ id, changes }`); `deny` and `revoke` still send only the reason (plus `id`); the audit log and error log filters are sent as a body (the value `all` is still left out); a case list sends its filters as a body and ignores a cursor with no page size, as before; the follow-up commands send only the key and the choice.
- Screens are unchanged. No new permissions, no new strings. Not built: the endpoints themselves (India team).

**Batch 618 (part B):** the partial nephrectomy drawing shows Gerota's fascia and the adrenal only when the extent reports them (PS-492); a size guard stops source files over 1,000 lines from growing (PS-497).


**Batch 618 (part A):** a second facility for the technical component of a split case (PS-336): `services/accessioning/resolveTechnicalFacilityOffer.ts`, `services/billing/resolveChargeFacilities.ts`, `pages/AccessionPage/AccessionTechnicalFacilityField.tsx`.
