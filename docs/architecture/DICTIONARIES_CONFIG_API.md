# Dictionaries, stains, subspecialties, system settings, workstations: the API server's calls (PS-514)

Batch 617. The server version of each service the browser holds as a mock today. The browser side is built (`services/<area>/http<Name>Service.ts`, one per service, each with a fake-fetch test); the India team's API server honours this contract. The rules are the ones in `HTTP_SERVICES_PATTERN.md` §4: the server decides permission, a refusal is a fixed code, no patient text in an error, no browser storage of results.

**How a call is written (the wide-interface convention, `HTTP_SERVICES_PATTERN.md` §7).** One route per interface method, `/api/<area>/<service>/<method-name>` in kebab-case. Reads are `GET` with the arguments in the query string (a list repeats the name, empty values are left out); a read whose arguments are not plain values is a `POST` with the arguments as the body. `delete`, `remove`, `clear`, `revoke`, `discard` are `DELETE` (or `POST`); `save`, `set`, `update`, `upsert`, `replace` are `PUT`; everything else is `POST`. A write with one object argument sends that object as the body; with several arguments it sends an object named by the argument names. An answer is `{ ok, data }`; `403` is `NOT_PERMITTED`, `404` `NOT_FOUND`, `409` `CONFLICT`, `400` `INVALID`. Methods that return a plain value or a list (not a result) answer the bare value or `{ items }`; a failure there is the quiet default (`null`, `false`, `[]`) except where the table says otherwise.

## ISpecimenCategoryService

`/api/specimen-categories/specimen-category`. Service: `services/specimenCategories/httpSpecimenCategoryService.ts`; chosen in `specimenCategoryServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/specimen-categories/specimen-category/get-all` | none |
| `getById` | `GET /api/specimen-categories/specimen-category/get-by-id` | `id` (query) |
| `add` | `POST /api/specimen-categories/specimen-category/add` | `category` (the body) |
| `update` | `PUT /api/specimen-categories/specimen-category/update` | `id`, `changes` (body fields) |
| `verify` | `POST /api/specimen-categories/specimen-category/verify` | `id` (body fields) |
| `deactivate` | `POST /api/specimen-categories/specimen-category/deactivate` | `id` (body fields) |
| `findOrCreateByName` | `GET /api/specimen-categories/specimen-category/find-or-create-by-name` | `name`, `note?` (query) |

## ICustomDictionaryService

`/api/spellcheck/custom-dictionary`. Service: `services/spellcheck/httpCustomDictionaryService.ts`; chosen in `customDictionaryServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `listPersonal` | `GET /api/spellcheck/custom-dictionary/list-personal` | `userId` (query) |
| `addPersonal` | `POST /api/spellcheck/custom-dictionary/add-personal` | `userId`, `word`, `actor` (body fields) |
| `removePersonal` | `DELETE /api/spellcheck/custom-dictionary/remove-personal` | `userId`, `word` (query) |
| `listFacility` | `GET /api/spellcheck/custom-dictionary/list-facility` | `facilityId` (query) |
| `addFacility` | `POST /api/spellcheck/custom-dictionary/add-facility` | `facilityId`, `word`, `actor`, `facilityLabel?` (body fields) |
| `removeFacility` | `POST /api/spellcheck/custom-dictionary/remove-facility` | `facilityId`, `word`, `actor`, `facilityLabel?` (body fields) |

## IStainTypeService

`/api/stains/stain-type`. Service: `services/stains/httpStainTypeService.ts`; chosen in `stainTypeServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/stains/stain-type/get-all` | none |
| `add` | `POST /api/stains/stain-type/add` | `entry` (the body) |
| `update` | `PUT /api/stains/stain-type/update` | `id`, `changes` (body fields) |

## ISectioningProtocolService

`/api/stains/sectioning-protocol`. Service: `services/stains/httpSectioningProtocolService.ts`; chosen in `sectioningProtocolServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/stains/sectioning-protocol/get-all` | none |
| `add` | `POST /api/stains/sectioning-protocol/add` | `entry` (the body) |
| `update` | `PUT /api/stains/sectioning-protocol/update` | `id`, `changes` (body fields) |

## IMolecularTargetService

`/api/stains/molecular-target`. Service: `services/stains/httpMolecularTargetService.ts`; chosen in `molecularTargetServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/stains/molecular-target/get-all` | none |
| `add` | `POST /api/stains/molecular-target/add` | `entry` (the body) |
| `update` | `PUT /api/stains/molecular-target/update` | `id`, `changes` (body fields) |

## ISubspecialtyService

`/api/subspecialties/subspecialty`. Service: `services/subspecialties/httpSubspecialtyService.ts`; chosen in `subspecialtyServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/subspecialties/subspecialty/get-all` | none |
| `getById` | `GET /api/subspecialties/subspecialty/get-by-id` | `id` (query) |
| `add` | `POST /api/subspecialties/subspecialty/add` | `subspecialty` (the body) |
| `update` | `PUT /api/subspecialties/subspecialty/update` | `id`, `changes` (body fields) |
| `deactivate` | `POST /api/subspecialties/subspecialty/deactivate` | `id` (body fields) |
| `reactivate` | `POST /api/subspecialties/subspecialty/reactivate` | `id` (body fields) |
| `assignUser` | `POST /api/subspecialties/subspecialty/assign-user` | `subspecialtyId`, `userId` (body fields) |
| `removeUser` | `DELETE /api/subspecialties/subspecialty/remove-user` | `subspecialtyId`, `userId` (query) |
| `assignSpecimen` | `POST /api/subspecialties/subspecialty/assign-specimen` | `subspecialtyId`, `specimenId` (body fields) |
| `removeSpecimen` | `DELETE /api/subspecialties/subspecialty/remove-specimen` | `subspecialtyId`, `specimenId` (query) |

## ISupportReferenceService

`/api/support-references/support-reference`. Service: `services/supportReferences/httpSupportReferenceService.ts`; chosen in `supportReferenceServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `forRecord` | `GET /api/support-references/support-reference/for-record` | `kind`, `recordId` (query) |
| `resolve` | `POST /api/support-references/support-reference/resolve` | `ref`, `actor` (body fields) |
| `recordIdFor` | `POST /api/support-references/support-reference/record-id-for` | `ref`, `kind` (body fields) |

## ISystemConfigService

`/api/system-config/system-config`. Service: `services/systemConfig/httpSystemConfigService.ts`; chosen in `systemConfigServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `get` | `GET /api/system-config/system-config/get` | none |
| `update` | `PUT /api/system-config/system-config/update` | `changes` (the body) |

## ITatTargetService

`/api/tat-config/tat-target`. Service: `services/tatConfig/httpTatTargetService.ts`; chosen in `tatTargetServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/tat-config/tat-target/get-all` | none |
| `add` | `POST /api/tat-config/tat-target/add` | `entry` (the body) |
| `update` | `PUT /api/tat-config/tat-target/update` | `entry` (the body) |
| `remove` | `DELETE /api/tat-config/tat-target/remove` | `id` (query) |

## IWorkstationGroupService

`/api/workstation-groups/workstation-group`. Service: `services/workstationGroups/httpWorkstationGroupService.ts`; chosen in `workstationGroupServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `getAll` | `GET /api/workstation-groups/workstation-group/get-all` | none |
| `getById` | `GET /api/workstation-groups/workstation-group/get-by-id` | `id` (query) |
| `getByFacility` | `GET /api/workstation-groups/workstation-group/get-by-facility` | `facilityId` (query) |
| `create` | `POST /api/workstation-groups/workstation-group/create` | `draft` (the body) |
| `update` | `PUT /api/workstation-groups/workstation-group/update` | `id`, `changes` (body fields) |
| `deactivate` | `POST /api/workstation-groups/workstation-group/deactivate` | `id` (body fields) |
| `reactivate` | `POST /api/workstation-groups/workstation-group/reactivate` | `id` (body fields) |

## WorkstationRegistryService

`/api/workstation-registry/workstation-registry`. Service: `services/workstationRegistry/httpWorkstationRegistryService.ts`; chosen in `workstationRegistryServiceInstance.ts`.

| Method | Call | Arguments |
|---|---|---|
| `list` | `GET /api/workstation-registry/workstation-registry/list` | none |
| `get` | `GET /api/workstation-registry/workstation-registry/get` | `id` (query) |
| `register` | `POST /api/workstation-registry/workstation-registry/register` | `raw` (the body) |
| `update` | `PUT /api/workstation-registry/workstation-registry/update` | `id`, `raw` (body fields) |
| `rotateToken` | `POST /api/workstation-registry/workstation-registry/rotate-token` | `id` (body fields) |
| `revoke` | `POST /api/workstation-registry/workstation-registry/revoke` | `id`, `reason` (body fields) |
| `checkIn` | `GET /api/workstation-registry/workstation-registry/check-in` | `token` (query) |
| `printRoutingInput` | `POST /api/workstation-registry/workstation-registry/print-routing-input` | `id` (body fields) |

