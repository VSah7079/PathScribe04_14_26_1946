# Intraoperative and operations dashboards: server calls (PS-510)

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the API server for these services, in the order of the interface. The browser side is `services/<area>/http<Name>Service.ts`, built from the shared kit (`HTTP_SERVICES_PATTERN.md`); the demo keeps the mock. The server team implements the table below.

## Rules for every call

- Bearer token on every request; the server decides permission from the token and returns `403` (`NOT_PERMITTED`). The browser hides buttons; it never replaces the check (`AUTHORIZATION_API.md`).
- Errors are fixed codes only: `NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `INVALID`, `SIGNED_OUT`, `TOO_MANY_REQUESTS`, `TIMED_OUT`, `UNAVAILABLE`. The browser never shows or logs the server's message text.
- Patient names, MRNs and other patient text travel in the **body**, never in a URL or query string. Ids and short codes may be in the path.
- Every change is audited by the server with the authenticated user (a name the browser sends, such as `activatedBy` or `updatedBy`, is advisory: the server records the token's user). The audit row has ids and the action, no patient text.
- A `404` on a read that can legitimately have no answer is returned to the screen as "none" (`null`) where the interface allows it; on any other call it is `NOT_FOUND`.
- A list may come back as `{ "items": [...] }` or as a bare array only if the interface returns a list; these services return the record or list as the body.

## Intraoperative entries (`IIntraoperativeService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `lookupAdtRecord` | POST `/api/intraop/intraoperative/lookup-adt-record` | `{mrn}` | `404` returns `null` to the screen; audited |
| `getAll` | GET `/api/intraop/intraoperative/get-all` | none |  |
| `getPending` | GET `/api/intraop/intraoperative/get-pending` | none |  |
| `createSession` | POST `/api/intraop/intraoperative/create-session` | `input` | audited |
| `addSpecimen` | POST `/api/intraop/intraoperative/add-specimen` | `{specimenLabel}` | audited |
| `findMatchesForNewCase` | POST `/api/intraop/intraoperative/find-matches-for-new-case` | `caseInfo` | audited |
| `getMatchCandidates` | GET `/api/intraop/intraoperative/get-match-candidates` | none |  |
| `addMilestone` | POST `/api/intraop/intraoperative/add-milestone` | `{milestone,skipReason,skipReasonNote,quickGrossText}` | audited |
| `addDigitalAsset` | POST `/api/intraop/intraoperative/add-digital-asset` | `asset` | audited |
| `setFrozenSectionDiagnosis` | POST `/api/intraop/intraoperative/set-frozen-section-diagnosis` | `{diagnosis,category}` | audited |
| `setSpecimenUrgency` | POST `/api/intraop/intraoperative/set-specimen-urgency` | `{urgency}` | audited |
| `dismissFromBoard` | POST `/api/intraop/intraoperative/dismiss-from-board` | `{dismissedByUserId,dismissedByUserName,surgeonReadbackConfirmed}` | audited |
| `seedOrBoardDemoData` | POST `/api/intraop/demo/seed` | none | **Demo only. Not a server call**: the browser answers `NOT_SUPPORTED` |
| `advanceDemoSpecimen` | POST `/api/intraop/demo/advance` | none | **Demo only. Not a server call**: the browser answers `NOT_SUPPORTED` |
| `addPreparationOutput` | POST `/api/intraop/intraoperative/add-preparation-output` | `{type,identifier}` | audited |
| `merge` | POST `/api/intraop/intraoperative/merge` | `{caseId,resolution}` | audited |
| `recordVerbalReport` | POST `/api/intraop/intraoperative/record-verbal-report` | `input` | audited |

## OR event log (`IOrEventLogService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/intraop-dashboard/or-event-log/get-all` | none |  |
| `getByLocationId` | GET `/api/locations/{locationId}/or-events` | none |  |
| `getByIntraopEntryId` | GET `/api/intraop/entries/{intraopEntryId}/or-events` | none |  |
| `record` | POST `/api/or-events` | `event` | audited |

## OR suite terminals (`IOrSuiteTerminalService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/intraop-dashboard/or-suite-terminal/get-all` | none |  |
| `getActive` | GET `/api/intraop-dashboard/or-suite-terminal/get-active` | none |  |
| `getById` | GET `/api/or-suite-terminals/{id}` | none |  |
| `add` | POST `/api/or-suite-terminals` | `entry` | audited |
| `update` | PATCH `/api/or-suite-terminals/{id}` | `changes` | audited |
| `deactivate` | POST `/api/or-suite-terminals/{id}/deactivate` | none | audited |

## Display profiles (`IDisplayProfileService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/facility-ops-dashboard/display-profile/get-all` | none |  |
| `getActive` | GET `/api/facility-ops-dashboard/display-profile/get-active` | none |  |
| `getById` | GET `/api/ops-dashboard/display-profiles/{id}` | none |  |
| `add` | POST `/api/ops-dashboard/display-profiles` | `entry` | audited |
| `update` | PATCH `/api/ops-dashboard/display-profiles/{id}` | `changes` | audited |
| `deactivate` | POST `/api/ops-dashboard/display-profiles/{id}/deactivate` | none | audited |

The mock stays the default when no API server address is configured. See `HTTP_SERVICES_PATTERN.md` §6 for which services still have only the mock.

**Batch 727 (Lab Workflow & Batch spec, Decisions 2-3, section 9).** A profile carries `addOnAgeLimitMinutes` (X): optional, whole minutes 15 to 1440; refuse anything else on `add` and `update`. Blank means 120. A sixth view id, `station_overview` (Stations), joins `assignedViews`. The server computes the views' figures for a bound display the same way as `src/services/facilityOpsDashboard/` (the Embedding & Microtome view reads add-on slides still Pending Cut, not only batches; `openAddOnOrders.ts`, `stationOverviewRules.ts`). Rows carry accession numbers, batch barcodes and counts; never a name or MRN.
