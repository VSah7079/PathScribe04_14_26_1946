# Quality, validation studies and deficiencies: server calls (PS-501)

> **Route style (Batch 617).** Every call converted below uses the single route style of `HTTP_SERVICES_PATTERN.md` section 7: `/api/<area>/<service>/<method-kebab>`, `GET` for a plain-value read and `POST` for everything else. The path each call had before is in `HTTP_ROUTE_MAPPING.md` ("earlier path").

Batch 616. The calls the browser makes to the API server for these services, in the order of the interface. The browser side is `services/<area>/http<Name>Service.ts`, built from the shared kit (`HTTP_SERVICES_PATTERN.md`); the demo keeps the mock. The server team implements the table below.

## Rules for every call

- Bearer token on every request; the server decides permission from the token and returns `403` (`NOT_PERMITTED`). The browser hides buttons; it never replaces the check (`AUTHORIZATION_API.md`).
- Errors are fixed codes only: `NOT_PERMITTED`, `NOT_FOUND`, `CONFLICT`, `INVALID`, `SIGNED_OUT`, `TOO_MANY_REQUESTS`, `TIMED_OUT`, `UNAVAILABLE`. The browser never shows or logs the server's message text.
- Patient names, MRNs and other patient text travel in the **body**, never in a URL or query string. Ids and short codes may be in the path.
- Every change is audited by the server with the authenticated user (a name the browser sends, such as `activatedBy` or `updatedBy`, is advisory: the server records the token's user). The audit row has ids and the action, no patient text.
- A `404` on a read that can legitimately have no answer is returned to the screen as "none" (`null`) where the interface allows it; on any other call it is `NOT_FOUND`.
- A list may come back as `{ "items": [...] }` or as a bare array only if the interface returns a list; these services return the record or list as the body.

## Validation studies (`IValidationStudyService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/validation-studies/validation-study/get-all` | none |  |
| `getActive` | GET `/api/validation-studies/validation-study/get-active` | none |  |
| `getById` | GET `/api/validation-studies/{id}` | none |  |
| `create` | POST `/api/validation-studies` | `study` | audited |
| `update` | PATCH `/api/validation-studies/{id}` | `changes` | audited |
| `submitForReview` | POST `/api/validation-studies/{id}/submit` | `submission` | audited |
| `recordApproval` | POST `/api/validation-studies/{id}/approval` | `approval` | audited |
| `activate` | POST `/api/validation-studies/{id}/activate` | `{activatedBy}` | audited |
| `close` | POST `/api/validation-studies/{id}/close` | none | audited |
| `remove` | DELETE `/api/validation-studies/{id}` | none | audited |
| `getStudyForCase` | GET `/api/validation-studies/applicable?clientId&pathologistId&subspecialtyId` | none | `404` returns `null` to the screen |

## Deficiency types (`IDeficiencyTypeService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/deficiencies/deficiency-type/get-all` | none |  |
| `add` | POST `/api/deficiency-types` | `type` | audited |
| `update` | PATCH `/api/deficiency-types/{id}` | `changes` | audited |
| `deactivate` | POST `/api/deficiency-types/{id}/deactivate` | none | audited |
| `reactivate` | POST `/api/deficiency-types/{id}/reactivate` | none | audited |

## Resolution types (`IResolutionTypeService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/deficiencies/resolution-type/get-all` | none |  |
| `add` | POST `/api/resolution-types` | `type` | audited |
| `update` | PATCH `/api/resolution-types/{id}` | `changes` | audited |
| `deactivate` | POST `/api/resolution-types/{id}/deactivate` | none | audited |
| `reactivate` | POST `/api/resolution-types/{id}/reactivate` | none | audited |

## Management reviews (`IManagementReviewService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/deficiencies/management-review/get-all` | none |  |
| `create` | POST `/api/management-reviews` | `review` | audited |

## Specimen deficiencies (`ISpecimenDeficiencyService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/deficiencies/specimen-deficiency/get-all` | none |  |
| `getByCaseId` | GET `/api/cases/{caseId}/deficiencies` | none |  |
| `getBySpecimenId` | GET `/api/specimens/{specimenId}/deficiencies` | none |  |
| `raise` | POST `/api/specimen-deficiencies` | `deficiency` | audited |
| `resolve` | POST `/api/specimen-deficiencies/{id}/resolve` | `resolution` | audited |
| `containImmediately` | POST `/api/specimen-deficiencies/{id}/contain` | `resolution` | audited |
| `verifyEffectiveness` | POST `/api/specimen-deficiencies/{id}/verify` | `verification` | audited |
| `raiseAndResolve` | POST `/api/specimen-deficiencies/raise-and-resolve` | `{deficiency,resolution}` | audited |
| `markReviewed` | POST `/api/specimen-deficiencies/mark-reviewed` | `{deficiencyIds,managementReviewId}` | audited |

## QA activity records (`IQaActivityRecordService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/quality/qa-activity-record/get-all` | none |  |
| `create` | POST `/api/qa/activity-records` | `record` | audited |

## QA activity types (`IQaActivityTypeService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/quality/qa-activity-type/get-all` | none |  |
| `add` | POST `/api/qa/activity-types` | `type` | audited |
| `update` | PATCH `/api/qa/activity-types/{id}` | `changes` | audited |
| `deactivate` | POST `/api/qa/activity-types/{id}/deactivate` | none | audited |
| `reactivate` | POST `/api/qa/activity-types/{id}/reactivate` | none | audited |

## QA supervision assignments (`IQaSupervisionAssignmentService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/quality/qa-supervision-assignment/get-all` | none |  |
| `getActiveAssignmentForUser` | GET `/api/qa/supervision-assignments/active?activityTypeId&userId&subspecialtyId` | none | `404` returns `null` to the screen |
| `create` | POST `/api/qa/supervision-assignments` | `input` | audited |
| `recordCaseReviewed` | POST `/api/qa/supervision-assignments/{assignmentId}/case-reviewed` | none | audited |
| `graduate` | POST `/api/qa/supervision-assignments/{assignmentId}/graduate` | none | audited |

## QA supervision assignment types (`IQaSupervisionAssignmentTypeService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/quality/qa-supervision-assignment-type/get-all` | none |  |
| `add` | POST `/api/qa/supervision-assignment-types` | `type` | audited |
| `update` | PATCH `/api/qa/supervision-assignment-types/{id}` | `changes` | audited |
| `deactivate` | POST `/api/qa/supervision-assignment-types/{id}/deactivate` | none | audited |
| `reactivate` | POST `/api/qa/supervision-assignment-types/{id}/reactivate` | none | audited |

## Reconciliation records (`IReconciliationService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/quality/reconciliation/get-all` | none |  |
| `create` | POST `/api/qa/reconciliations` | `record` | audited |

## Surgical peer review risk weights (`ISurgicalPeerReviewRiskWeightService`)

| Method | Call | Body | Notes |
|---|---|---|---|
| `getAll` | GET `/api/quality/surgical-peer-review-risk-weight/get-all` | none |  |
| `setWeight` | PUT `/api/qa/surgical-risk-weights/{subspecialtyId}` | `{multiplier,updatedBy}` | audited |
| `removeWeight` | DELETE `/api/qa/surgical-risk-weights/{subspecialtyId}` | none | audited |

The mock stays the default when no API server address is configured. See `HTTP_SERVICES_PATTERN.md` §6 for which services still have only the mock.
