# services/authorization/

Capabilities and the permission check (PS-355, Batch 369). This is the part
of a role PathScribe enforces. The voice and keyboard commands in
`constants/systemActions.ts` (the Role Dictionary's Commands tab) are not
access control.

Server contract: [`docs/architecture/AUTHORIZATION_API.md`](../../../docs/architecture/AUTHORIZATION_API.md).

## Files

- **`capabilityCatalog.ts`**: the one list. Each capability has:
  - a `domain:object:verb` key;
  - a locale `labelId`;
  - an admin-facing `group`;
  - a `risk` (`high` = every check at an action is audited);
  - `requires`, the capabilities it can't work without.

  `catalogProblems()` checks the key shape, duplicates, unknown requirements and cycles.
- **`capabilityDependencies.ts`** (pure): `requirementsOf`, `dependentsOf`, `planGrant`, `planRevoke`, `unmetRequirements`. The Role Dictionary uses the plans to tell the administrator when one capability needs another, and offers to turn it on (or off) too.
- **`evaluateCapability.ts`** (pure):
  - `heldRoles`, `evaluateCapability`, `grantedCapabilities`;
  - `capabilityAuditEntry`, the literal-English audit record naming the granting role or the refusal reason.

  A PathScribe support sign-in (session role `superadmin`) holds the built-in Superadmin role. A staff record naming that role gets nothing from it. There is no bypass.
- **`capabilitySeeds.ts`** (pure): the day-one grants (Superadmin gets everything; Admin gets every export plus the Batch 370 administration capabilities; QA Reviewer gets the exports; nobody else gets anything). `applyCapabilitySeeds` offers each built-in role only the seeds it hasn't been offered before (`Role.seededCapabilities`), so an administrator's removal sticks and a new capability still arrives.
- **`roleCapabilityRules.ts`** (pure):
  - `roleCapabilityProblem`: the role service refuses a save with an unknown key or an unmet requirement.
  - `roleCapabilityChangeAudit`: the "Role capabilities changed" entry.
- **`authorizationService.ts`**: `createAuthorizationService(deps)`.
  - `evaluate` decides without writing anything.
  - `enforce` decides and audits high-risk checks.
  - `grantedCapabilities` returns everything the signed-in user holds.

  It reads the session, the staff record and the role catalog fresh on every call.
- **`defaultAuthorizationService.ts`**: the app instance, exported from `@/services` as `authorizationService`.

## Facility scope (phase 2, Batch 370)

`StaffUser.facilityIds` is the facilities someone works for; empty means all. Per Pete, scope lives on the staff assignment, not the role. For someone limited to some facilities, `evaluateCapability` refuses:
- actions on another facility's data (`outOfScope`, naming the facilities);
- actions spanning all facilities: enterprise or organisation QA scopes, and QA reports with no scope switcher (`outOfScope`);
- case actions on a case with no facility recorded (`facilityUnknown`).

Actions with no facility dimension (managing roles) aren't affected. Scope never grants anything. The context comes from `qaScopeContext(scope)` for QA exports, and from the case's `order.facilityId` for the change-history export.

## Where it is enforced

| Capability | Checked in |
|---|---|
| `report:change-history:export` | `services/reportChangeLog/exportChangeLog.ts` |
| the 14 `qa:<report>:export` | `services/qualityAssurance/qaExport.ts`, called from each Quality Assurance tab through `qaReportUtils.exportQaReportRows(capability, …, context)`; the cytology–histology print view calls `enforce` before opening |
| `config:roles:manage` (Batch 370) | `services/roles/roleAdministration.ts` `saveRole`, which also refuses a save that leaves no assignable role able to manage roles |
| `config:staff:edit`, `config:staff-access:assign` (Batch 370) | `services/staff/staffAdministration.ts` `saveStaffMember`. The second is needed when roles, facilities, pediatric, orchestration or cross-tenant access, or credentials change |
| `config:demo-data:reset` (Batch 370) | `services/demoReset/demoReset.ts` `resetAllDemoData` |
| `platform:cross-tenant-cases:view` (Batch 371) | `services/cases/CaseRouter.ts` `getCase`, when support opens another organisation's case |
| `platform:governing-bodies:manage` (Batch 371) | `services/governingBodies/governingBodyAdministration.ts` `saveGoverningBodies` |

Screens use `hooks/useCapabilities.ts` and `components/Common/CapabilityButton.tsx` to grey out what the user can't do, with the reason in a tooltip.

## Guard

`capabilities.guard.test.ts` fails the build if:
- a catalog capability has no check at an action;
- a key used in the app isn't in the catalog;
- a gated button has no check behind it;
- a capability lacks locale text, or text is left for a capability that no longer exists.

## Not done yet

- Everything else that should be a capability: phase 3 (PS-357). That includes the other CSV exports outside Quality Assurance: the waste-tracking (disposal) report, the audit log, billing logs, dictionary exports, contribution and search.
- API server enforcement: phase 4 (PS-358).

## Batch 370 (PS-356): phase 2

- **The self-escalation path is closed.** Before this batch, anyone signed in could open Configuration, edit any role's capabilities (their own included) and change any staff member's roles. Saving a role now needs `config:roles:manage`, and saving a staff record needs `config:staff:edit`. Changing someone's roles, facilities, access flags or credentials also needs `config:staff-access:assign`, per Pete's split. The full demo reset needs `config:demo-data:reset`.
- **Facility scope** (above).
- **Screens:** `authorizationService.snapshot()` feeds `useCapabilities`, whose `has` / `decide` now take the action's context. `CapabilityButton` takes a `context`, and its tooltip gives the reason: not granted, a missing requirement, or outside the facility assignment.

## Batch 371: Superadmin reserved for ForMedrixAI support

Pete: Superadmin is for ForMedrixAI support staff, and hospital administrators have no control over it.

- **Platform-only capabilities** (`platformOnly: true`, group "ForMedrixAI platform support") count only from a role staff can't be given, which is Superadmin. `roleCapabilityProblem` refuses them on any hospital role, and a copy of Superadmin drops them. There are two so far:
  - `platform:cross-tenant-cases:view`: support opening another organisation's case. `CaseRouter.getCase` checks and audits it on every such open. Lists aren't audited per case.
  - `platform:governing-bodies:manage`: the platform-wide governing-body content settings (`services/governingBodies/governingBodyAdministration.ts`).
- **Superadmin is locked.** `lockPlatformRoles` puts it back to the whole catalog on every load. `saveRole` refuses any edit to it (`platformRole`), and so does the mock role service. The Role Dictionary shows it read-only with a banner.

## Batch 374: screens

- **17 screen capabilities** (`screen:<name>:open`, group "Screens", standard risk): one per screen reached from Home or its hubs. See [`../screens/README.md`](../screens/README.md).
- **Seeds** (`SCREEN_SEEDS`, Pete's matrix): every built-in role with app access now starts with its screens, including the four new bench roles. Admin also keeps its exports, administration and support-access capabilities; QA Reviewer keeps its exports.
- **A hospital's own roles** are now offered screens, once: every screen except Configuration and Quality & Compliance if the role has case access, and those if it has configuration access (`customRoleScreenSeed`). Before this batch, custom roles were never touched.

## Batch 376

- `config:field-requirements:manage` (administration group, high risk): change which fields a page requires, for the person's own organisation (PS-359). Seeded to Admin.

- **Batch 378:** `case:grossing:complete` (new group "Case work"), seeded to Pathologist, Fellow, Resident and PA.

## Batch 381: holds and delegation

Pete: "Add, keep today's users". Five new `casework` capabilities, all high-risk, so every check is audited:
- `case:hold:place`, `case:hold:release`
- `case:retention-hold:place`, `case:retention-hold:release`
- `case:delegation:create`

They're seeded to every built-in role with case access: Pathologist, Fellow, Resident, PA, Accessioner, Histotechnologist, Cytotechnologist, Molecular Technologist. A hospital's own roles with case access are offered them too (`customRoleScreenSeed`). Checked in `services/cases/caseHolds.ts` and `delegations/mockDelegationService.ts`; the buttons are `CapabilityButton`s.

## Batch 382: correcting an applied billing code

Pete: keep today's users, but as a permission of its own so a hospital can later take it off its clinical roles. One new capability in a new **Billing** group:
- `billing:applied-code:correct` (high risk): credit the original charge of an applied billing code and bill the corrected one.

Seeded to every role with case access and to Admin, Lab Director and QA Reviewer (who resolve billing deficiencies); a hospital's own roles with case or configuration access are offered it too. It sits in its own list in `capabilitySeeds.ts`, not in the case report actions. Checked in `services/billing/correctServiceCharge.ts` (`enforceAppliedCodeCorrection`), for the case, by the report page's correction and the QA resolution alike; the modal's button is a `CapabilityButton`. The Discordance and post-sign-out reason modals got no capability: they are steps inside sign-out and billing.

## Batch 383: releasing an autopsy body

Same approach as the billing correction: one new capability, in a new **Autopsy** group.
- `autopsy:body:release` (high risk): record the release of a body to a funeral home or family, which ends the mortuary's custody.

Seeded to every role with case access (the people who could release a body before); a hospital's own roles with case access are offered it too. Checked in `services/autopsy/releaseAutopsyBody.ts`, for the case; the form's button is a `CapabilityButton`. Recording the written order or consent (the authorization completion form) got no capability: it completes paperwork, and the gross-examination gate already controls what follows.

## Batch 385: sending messages

- **`message:internal:send`** (standard) and **`message:secure-email:send`** (high, it leaves the organisation), in a new **Messaging** group. Seeded to every built-in role and offered to every hospital-made role, so nobody loses sending today.
- Checked in `services/messages/mockMessageService.ts`: `send` and `reply` when a person composed the message (`composedByPerson`), and `sendSecureEmail`. Notices the app sends itself (access requests, template and LIS notices) are not held to it, so someone without the permission can still ask for access. The drawer greys out Send and says why.

## Batch 390: correcting a signed-out cytology report (PS-340)

Two capabilities in the **Casework** group, one per act (a correction replaces what was reported; an addendum leaves it standing):
- `cytology:report:correct` (high risk): release a corrected diagnosis for a signed-out cytology report.
- `cytology:report:addend` (high risk): release an addendum to one.

Seeded to **Pathologist only**: nobody had a screen for either before, and signing out a cytology diagnosis is already a pathologist act. A hospital's own roles are offered neither until an administrator grants them (`customRoleScreenSeed` is unchanged). Checked in `services/cytology/releaseCytologyCorrection.ts` and `releaseCytologyAddendum.ts`, before anything is written; the buttons on the Cytology screening page are `CapabilityButton`s.

## Batch 396: peer-review verdicts

- `cytology:qc-review:record` (high risk): take a cytology QC peer review and record concurrence or a discrepancy. Checked in `services/cytologyQc/mockCytologyQcCaseAssignmentService.ts`.
- `surgical:qa-review:record` (high risk): record a surgical post-sign-out QA review, or dismiss a correlation candidate. Checked in `services/quality/surgicalQaReview.ts`.
- Both seeded to Pathologist and Fellow, who had the two review queues, so nobody loses what they could do. A hospital's own roles get them only when an administrator grants them.

## Batch 399

`config:intraop-critical-results:manage` (high risk, administration): change the critical intraoperative results dictionary. Checked in `services/intraop/mockIntraopCriticalResultService.ts`; Admin gets it with the administration group.

## Batch 403: add-on orders

`add-on:order:place` and `add-on:exception:approve-destructive-cut` (high risk, casework). Pete chose both, for all three roles. Placing an add-on order, and cancelling it or modifying and resubmitting it after a block exception, need the first. Approving destructive cutting needs the second. Both are checked in `services/addOnOrders/addOnOrderActions.ts`. They are seeded to Pathologist, Fellow and Resident, who had the Add-On Orders screen, and offered to a hospital's own roles that have case access.

## Batch 404: Batch Management overrides

Three new permissions (high risk, casework): `batch:reconciliation:override`, `batch:run:abort` and `batch:cold-chain-excursion:acknowledge`. Pete: one permission each, keeping today's users. They're checked in `services/batches/mockBatchService.ts`, seeded to every built-in role with the Batch Management screen (Histotechnologist, Cytotechnologist, Molecular Technologist), and offered to a hospital's own roles with case access.

## Batch 405

`molecular:batch:supersede` (high risk, casework) covers Clone & Supersede, which retires a molecular run and starts its replacement. Pete: keep today's users. It's checked in `services/molecular/mockMolecularBatchService.ts`, seeded to the Molecular Technologist (the only built-in role with the Molecular screen), and offered to a hospital's own roles with case access.

## Batch 406

`config:molecular-control-rules:manage` (high risk, administration) covers adding, changing and deleting a molecular assay control rule: its required controls and the deck slots its sample rack may use. Pete: "default to admin but it remains an assignable permission". It's in the administration group, so Admin starts with it and nobody else does; a Lab Director (or any role) gets it in the Role Dictionary. Checked in `services/molecular/mockMolecularAssayControlRuleService.ts`.

**System Capabilities:** `docs/architecture/AUTHORIZATION_API.md` now has a "Capability catalog" section listing all 64 capabilities with their group, risk, default roles and the service that checks each. Its endpoint table had stopped at Batch 380 and now covers every action through Batch 406. `capabilityDocs.guard.test.ts` fails when the catalog and that list disagree.

## Batch 407

Two permissions (high risk, casework), both seeded to every role with the Batch Management screen (Histotechnologist, Cytotechnologist, Molecular Technologist) and offered to a hospital's own roles with case access. Pete: keep today's users.
- `retention:material:dispose`: disposing of retained material from the Disposal Queue, checked in `services/retentionPolicy/disposeItemByScan.ts`.
- `retention:disposal-report:export`: exporting the disposal report, checked in `services/retentionPolicy/exportDisposalReport.ts`. This export had no check before.

The catalog in `docs/architecture/AUTHORIZATION_API.md` now lists 66 capabilities.

## Batch 409

`cytology:report:sign-out` (high risk, casework): signing out a cytology specimen, or releasing it for countersign. Checked in `services/cytology/signOutCytologyCase.ts`. Pete: keep today's users, so it's seeded to Pathologist, Fellow, Resident and Cytotechnologist, and offered to a hospital's own roles with case access. It sits on top of signing authority and the CT and countersign rules, never instead of them. The catalog now lists 67 capabilities.

## Batch 410

Five new casework capabilities, all high risk, for the rest of the Cytology Workspace (Pete: each its own permission, today's users keep them):
- `cytology:review:record`, checked in `services/cytology/saveCytologyReview.ts`.
- `cytology:final-diagnosis:select`, checked in `services/cytology/cytologyCaseActions.ts`, like the three below.
- `cytology:qc-flag:remove`.
- `cytology:retrospective-review:record`.
- `cytology:histology-correlation:record`.

`CYTOLOGY_SIGN_OUT` in `capabilitySeeds.ts` now holds sign-out and these five. They are seeded to Pathologist, Fellow, Resident and Cytotechnologist (the roles with the Cytology Workspace screen) and offered to hospital roles with case access. The catalog lists 72 capabilities.

## Batch 411

`cytology:case:finalize` (high risk, casework): finalizing a cytology case before every specimen is signed out, with a reason and an audit entry. Checked in `services/cytology/cytologyCaseFinalization.ts`. It's an override, so it's seeded to Pathologist only and not offered to a hospital's own roles; an administrator grants it in the Role Dictionary. Otherwise a case finalizes itself when its last cytology specimen is signed out. The catalog now lists 73 capabilities.

## Batch 412

`cytology:revision:request` (high risk, casework): marking a note on someone's cytology review "Requires revision". It stops a cytotechnologist signing out until the author revises or a pathologist records their own review. Plain notes need no permission. Checked in `services/cytology/cytologyReviewNotes.ts`. It's seeded with the Cytology Workspace's other actions: Pathologist, Fellow, Resident, Cytotechnologist and hospital roles with case access. The catalog lists 74 capabilities.

## Batch 414

`config:screening-registry:manage` (high risk, administration): which cervical screening registry each facility reports to, and each registry's code mappings and hold rules. Checked in `services/screeningRegistry/saveScreeningRegistrySettings.ts`. Admin holds it by default. The catalog lists 75 capabilities.

## Batch 415

- `cytology:ct-report:sign-out` (high, casework, requires `cytology:report:sign-out`): a cytotechnologist signing out.
  - Seeded to Cytotechnologist and offered to hospital roles with case access (keep today's users).
  - A lab in a country where cytotechnologists may not sign reports removes it from the role.
- `config:cytology-compliance:manage` (high, administration; Admin): switching the CLIA workload cap and CAP 5-year lookback.
- The catalog lists 77 capabilities.

## Batch 417

`patient:national-identifier:record` (high risk, case work): recording or removing a patient's national identifier. Seeded to every case-access role (today's accessioners keep it) and to hospital roles with case access. Checked in `services/patientIdentifiers/recordNationalPatientIdentifier.ts`. 78 capabilities.

## Batch 418

`patient:registry-consent:record` (high risk, case work): recording or clearing a patient's registry opt-outs. Seeded like `patient:national-identifier:record`. Checked in `services/registryConsent/recordPatientRegistryConsent.ts`. 79 capabilities.

## Batch 421

`screen:registry-exceptions:open` (screens; Admin, Lab Director, QA Reviewer, and hospital roles with configuration access, through the Quality & Compliance screen list) and `registry:submission:resend` (administration, high, requires the screen; Admin through the group, Lab Director explicitly; QA Reviewer sees the list but can't resend). 81 capabilities.

## Batch 422

`config:cancer-registry:manage` (administration, high; Admin): the cancer registry Configuration screen's saves. 82 capabilities.

## Batch 423

Two capabilities (84 in the catalog):
- `registry:live-register:approve` (high, administration): approving a registry's go-live, re-entering credentials. Admin and Lab Director (`REGISTRY_GO_LIVE_APPROVE`).
- `config:registry-go-live:manage` (high, administration): the two go-live approval settings. Admin.

Preparing a request and returning to test use the existing `config:screening-registry:manage` / `config:cancer-registry:manage`. All are checked in `services/registryGoLive/registryGoLive.ts`. `AUTHORIZATION_API.md`'s catalog has been regenerated.

## Batch 424

`registry:test-suite:run` (high, administration, Admin) covers sending the synthetic test suite to a registry's test system, on a validation instance only. It is checked in `registryGoLive.ts`. The catalog now has 85 capabilities.

## Batch 425

Three capabilities, 88 in all:

| Capability | Group | Who has it | Checked in |
|---|---|---|---|
| `qa:registry-transmission-audit:export` | qaOperations | Admin and QA Reviewer, like every QA export | `qualityAssurance/qaExport.ts`, from `registrySubmission/registryExceptionsService.ts` and the cytology QA tab |
| `registry:revision:review` | administration | Admin and the Lab Director, like resend | `registrySubmission/recordRegistryRevision.ts` |
| `config:template-governance:manage` | administration | Admin | `templates/templateGovernanceSettings.ts` |

`docs/architecture/AUTHORIZATION_API.md`'s catalog is regenerated.

## Batch 428: Configuration permissions

84 Configuration capabilities (one per section, Pete's choice) and `platform:signing-rules:manage`. `guardConfigWrites.ts` (new) wraps a service so each listed method is checked against its capability; `permitConfigChange` does the same at a single action; refusals reach `ConfigRefusalBanner` through `onConfigRefused`. `capabilities.guard.test.ts` reads the wrapper's rules. Seeds: Admin all; Lab Director all but drafting synoptic protocols; Template Author and Template Approver only the protocol and template ones; a hospital's own roles none.

## Batch 429: view-only sections, equipment log for the bench

`equipment:maintenance:record` (new), seeded to the three bench roles, Admin and Lab Director. `docs/architecture/AUTHORIZATION_API.md` has a new section listing every Configuration write and the capability its endpoint must check (PS-345).

## Batch 432

Three new capabilities (177 in all; the `AUTHORIZATION_API.md` catalog is regenerated):
- `audit:error:resolve` (qaOversight, high): mark an Audit Log error resolved. Seeded to everyone who opens the Audit Log: Admin, Lab Director, QA Reviewer, and hospital roles with configuration access.
- `cytology:qc-review:bypass` (casework, high): the Cytology QC supervisor bypass. Pete: nobody by default; an administrator assigns it. Holding it also opens the Cytology QC queue (`services/screens/screenAccess.ts` `SCREEN_ALSO_OPENED_BY`).
- `referral:transit-status:update` (casework, high): mark a referral batch in transit or delivered. Seeded to every role with the Batch Management screen, and hospital roles with case access.

## Batch 433

`billing:charge:approve` (high risk, billing): approve, reject, hold and release charges waiting for billing approval, checked against the charge's performing lab in `services/billing/chargeApproval.ts`. Nobody holds it by default, custom roles included (Pete: an administrator gives it to whoever does billing audits). The person who drafted a charge can't approve or reject it.

`billing:applied-code:correct` now covers every billing correction (`services/billing/billingCorrection.ts`): code, modifier, reversal and missing charge.

178 capabilities. `docs/architecture/AUTHORIZATION_API.md`: catalog regenerated, and a "Billing corrections and charge approval (Batch 433)" section for the server. The Access Control doc is updated. `authorization.test.ts` checks the capability has no seed.

## Batch 434

`wsi:scan-batch:load`, `wsi:scan-batch:send` and `wsi:scan-batch:unload` (standard risk, casework), checked against the scanner's lab in `services/digitalPathology/wsiScanBatchWorkflow.ts`. They are seeded to every role with the Batch Management screen (Histotechnologist, Cytotechnologist, Molecular Technologist) and to hospital roles with case access. 181 capabilities. The `AUTHORIZATION_API.md` catalog is regenerated, and there is a new "WSI scan batches and corrections to Batch 433" section.

## Batch 435

Admin opens Batch Management (`screen:batch-management:open`), so it sees Slide scanning. It gets the screen only: the scan-batch actions and Batch Management's overrides stay with the bench roles, and an administrator can add them to any role. The catalog in `AUTHORIZATION_API.md` is regenerated.

## Batch 437 (PS-282, PS-357, PS-128)

- 8 new capabilities (189 in all), one per export:
  - `audit:audit-log:export`, `audit:error-log:export`, `audit:interface-log:export`, `audit:qa-log:export` and `audit:billing-log:export`, for the Audit Log page's CSVs, which had no check;
  - `search:case-results:export`;
  - `contribution:trainee-case-reference:export` and `contribution:case-mix-summary:export`.
- Each is checked in `printing/exportGate.ts` (case search: in its service) and seeded to the roles that open the screen it sits on (keep today's users).
- `guardConfigWrites.ts` now also tells listeners when a configuration write went through (`onConfigWritten`). The Configuration page's unsaved-changes guard uses it.
- The catalog in `AUTHORIZATION_API.md` is regenerated, with a new section on exports and the audit.

## Batch 438

Two capabilities (191 in all):
- `qa:capa-recommendation:decide` (high): confirm or dismiss a CAPA recommendation. Requires `screen:quality-assurance:open`; seeded for every role that opens Quality Assurance. Checked in `quality/capaRecommendationService.ts`.
- `config:revision-reasons:manage` (high, Configuration): the revision reasons and their switch. Checked in `reasons/mockReasonDictionaryService.ts`.

The Admin and QA Reviewer "exports" seed now takes only the `qa:` keys ending in `:export`; before, any `qa:` key counted, which would have given the decision twice. The catalog in `docs/architecture/AUTHORIZATION_API.md` is regenerated, with a Batch 438 section for the server.

## Batch 439

Six capabilities (197 in all): `case:peer-review:request`, `case:clinical-mismatch:record` and `case:outside-consult:assess` (Pathologist, Fellow); `case:peer-review:record` and `case:peer-review:override` (Pathologist); `config:peer-review:manage` (Configuration; Admin and Lab Director). Catalog regenerated in `docs/architecture/AUTHORIZATION_API.md`, with a Batch 439 server section.

## Batch 440

`cytology:pathologist-review:take` (high risk, casework; Pathologist and Fellow): take a positive GYN cytology case from the Worklist's Cytology Review tile. Checked in `cytology/cytologyQueuesLive.ts` `takeCytologyReview`. 198 capabilities. The server contract is in `docs/architecture/AUTHORIZATION_API.md` ("GYN cytology QC queue and pathologist review tray").

## Batch 441

`case:team:manage` (high risk, casework): change a case's team in Case Team, including its primary pathologist. Seeded with the case-report actions to every role that could open a case report before (Pete's "keep today's users", as for delegation). Checked in `cases/saveCaseTeam.ts`. 199 capabilities. `docs/architecture/AUTHORIZATION_API.md` has a Batch 441 server section for the cytotech rule.

## Batch 442 (PS-147)

- `config:qa-trend-policy:manage` (configQuality): Admin and Lab Director.
- `qa:pathologist-trend:view` (requires the Quality Assurance screen) and `qa:pathologist-trend:decide` (requires view): Lab Director only. These are personnel-sensitive; the reviewed pathologist doesn't hold them.

202 capabilities. `docs/architecture/AUTHORIZATION_API.md` has the server section.

## Batch 447

`config:feedback:manage` (configSystem, so Admin and Lab Director): the QA feedback button and its recipients. 203 capabilities. `docs/architecture/AUTHORIZATION_API.md` catalog regenerated.

## Batch 448

`config:staff-password:manage` (administration, so Admin; requires `config:staff:edit`): set, reset or remove a staff sign-in password. 204 capabilities. Catalog regenerated in `docs/architecture/AUTHORIZATION_API.md`.

## Batch 451 — screen-level test evidence for Priority 2 tickets

`capabilityToggle.ts`: the Role Dictionary's click and prompt decisions (PS-355).

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

Two new capabilities:
- `config:cytology-histology-correlation:manage` (PS-156, configCytology): Admin and Lab Director.
- `case:decant:delete`, checked in `services/material/caseMaterialService.ts`: given to the same roles as material disposal.

## Batch 453 — The Batch 452 open items, and the native-speaker review register

New capability `config:biopsy-resection-correlation:manage` (high risk, Configuration → quality). Admin and Lab Director start with it. It's checked in `services/quality/biopsyResectionCorrelationSettings.ts`. The catalog now has 207 capabilities.

## Batch 454 — Follow-up not received: report, alerts and clinician email

Five new capabilities (212 in all):
- `case:follow-up:expect`: Pathologist, Fellow.
- `qa:follow-up:record` and `qa:follow-up-clinician:email`: the roles that open Quality Assurance, and a hospital role with configuration access.
- `qa:follow-up:export`: Admin, QA Reviewer, like every QA export.
- `config:follow-up-tracking:manage`: Admin, Lab Director.

All are checked in `services/followUp/`.

## Batch 458 — PS-71: every case save carries its version

PS-71 (Pete's optimistic-locking spec, Oct 4): a save made from an old copy of a case no longer overwrites someone else's newer save. See `services/cases/caseWrite.ts` and `docs/architecture/CASE_API.md`.

New capability `case:edit-conflict:override` (high risk, casework): "Save mine anyway" on the Edit Conflict dialog. Seeded for Pathologist, Admin and Lab Director (Pete's decision). For Pathologist this is an exception to least privilege, recorded in `capabilitySeeds.ts`. Checked in `cases/caseWrite.ts` `overwriteAfterConflict`. Catalog: 213 capabilities.

## Batch 460

`billing:applied-code:review` ("Review a case's billing codes", high risk): approving, declining, overriding, adding and deleting a case's billing codes, on the report page, in the Cytology Workspace and at Microtomy.
- It's checked in `services/billing/caseBillingCharges.ts` (`enforceBillingReview`) before any change.
- Seeds (`BILLING_REVIEW`): the same roles as `billing:applied-code:correct`, so nobody loses it.
- `authorization.test.ts` checks the two always go together in the seeds.
- `docs/architecture/AUTHORIZATION_API.md` lists it.

## Batch 461: organ maps (217 capabilities)

- `report:organ-map:insert` (casework, standard): insert the anatomical map into the report, insert it again, or remove it; refused once signed out. Seeded to Pathologist, Fellow and Resident (`ORGAN_MAP_INSERT`). Checked in `organMapping/organMapFigures.ts`.
- `config:organ-map-scheme:manage` (configSystem, high): colours, patterns and legend wording by enterprise, jurisdiction and facility (facility-scoped for a facility layer). Checked in `organMapping/organMapConfig.ts`.
- `config:organ-map-bindings:manage` (configSystem, high): which of a template's questions feed its map. Checked in `organMapping/organMapConfig.ts`.
- The two configuration capabilities reach Admin and Lab Director through `CONFIG_SECTIONS` (now 94). `AUTHORIZATION_API.md` has the rows and a new "Anatomical maps" section; `authorization.test.ts` expects the new seeds.

## Batch 467 — In-house molecular orders

Two capabilities (219 in all): `molecular:order:assign-plate` (standard) and `molecular:order:cancel` (high risk, also re-routing), both requiring `screen:molecular:open`; seeded for the roles with the Molecular screen. Checked in `services/molecularOrders/molecularOrderEngine.ts`.

## Batch 467b

`molecular:order:set-lab` (standard; requires `screen:molecular:open`) chooses or changes a queued send-out molecular order's reference lab. It is seeded with the other molecular order actions, which makes 220 capabilities. Checked in `services/molecularOrders/molecularOrderEngine.ts`. `AUTHORIZATION_API.md`: its status line said 88 capabilities (as of Batch 425) and now says 220; Case work is 51.

## Batch 468

`autopsy:custody:transfer` (high risk; no requirements) records a forensic autopsy case's chain-of-custody transfer. Its own capability, never reusing `autopsy:body:release` — a distinct, append-only-log action. Seeded alongside `autopsy:body:release` for the same case-access roles. Makes 221 capabilities. Checked in `services/autopsy/recordAutopsyCustodyTransfer.ts`. `AUTHORIZATION_API.md`: 220 → 221; Autopsy section is now 2.

## Batch 469

Four new autopsy capabilities, all seeded alongside the existing case-access-role autopsy capabilities:
- `autopsy:toxicology:order` (standard risk) — checked in `services/autopsy/orderAutopsyToxicology.ts`.
- `autopsy:toxicology:result` (high risk) — checked in `services/autopsy/recordAutopsyToxicologyResult.ts`.
- `autopsy:retention-disposal:record` (high risk) — checked in `services/autopsy/recordAutopsyOrganRetentionDisposal.ts`. Key kept 3-segment (`domain:object:verb`, hyphen inside a segment) — the first cut used a 4-segment `autopsy:retention:disposal:record`, which silently failed `capabilities.guard.test.ts`'s regex; caught and renamed before delivery.
- `autopsy:consent:manage` (high risk) — checked in `services/autopsy/applyAutopsyConsentStatusChange.ts`.

Makes 225 capabilities. `AUTHORIZATION_API.md`: 221 → 225; Autopsy section is now 6.

## Batch 478

Two new autopsy capabilities (230 in all; Batch 471 had already taken it to 228 — see `services/autopsy/README.md`'s own Batch 471/477 entries, not repeated here):
- `autopsy:gross-exam-gate:override` (high risk) — the audited override for `resolveAutopsyGrossExaminationGate.ts`'s hard stop, now actually enforced in `services/autopsy/signAutopsyReport.ts`. Nobody by default, same as `cytology:qc-review:bypass` — an administrator assigns it. Every use is logged on the case (`AutopsyCaseDetails.gateOverrides`) and to the audit trail.
- `autopsy:organ-tag:record` (standard risk) — recording a per-organ gross-exam finding. Seeded to `GROSSERS` (Pathologist, Fellow, Resident, PA) alongside `case:grossing:complete`, never the broader case-access group the other autopsy capabilities use — this is ordinary clinical documentation, not a legal/custody action. Checked in `services/autopsy/recordAutopsyOrganTag.ts`.

`AUTHORIZATION_API.md`: 228 → 230; Autopsy section is now 11.

## Batch 480 — Structured Inking, Module 1 (PS-359)

Two new capabilities (232 in all):
- `grossing:margin-ink:record` (standard risk, `casework`) — recording a margin's ink application during grossing. Seeded alongside `case:grossing:complete` for `GROSSERS` (Pathologist, Fellow, Resident, PA). Checked in `services/grossing/recordMarginInkApplication.ts`.
- `config:inking-validation-mode:manage` (high risk, `configSystem`) — changing a site's `inking_validation_mode` (`WARN_ONLY`/`STRICT_ENFORCE`). `group: 'configSystem'` means `CONFIG_SECTIONS` sweeps it into Admin's and Lab Director's seeds by default, same as its siblings `config:report-appearance:manage` and `config:organ-map-scheme:manage` — **not** "nobody by default" the way `cytology:qc-review:bypass` and `autopsy:gross-exam-gate:override` are. Checked in `services/grossing/inkingSiteSettings.ts`.

`AUTHORIZATION_API.md`: 230 → 232; Case work section 51 → 52, Configuration: security and system 8 → 9 (`capabilityDocs.guard.test.ts` enforces this stays in sync).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
