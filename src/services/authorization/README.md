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

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
