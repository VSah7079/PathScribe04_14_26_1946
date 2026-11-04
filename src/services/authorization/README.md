**Batch 754:** `demoChecklistCapabilities.ts` (new): `platform:demo-checklists:remove` (platformOnly, requires `config:protocol:retire`), checked in `templates/demoChecklistRemoval.ts`.

**Batch 742:** `caseAttachmentCapabilities.ts` (new): `case:attachment:upload`, `case:attachment:link`, `case:attachment:unlink`, seeded with `report:case-images:attach` to every role with case access (`capabilitySeeds.ts`, `REPORT_IMAGES`).

**Batch 741:** `cytologyPrepCapabilities.ts`: `material:specimen:divide`, `material:aliquot-status:update`; seeds `SPECIMEN_DIVIDE`, `ALIQUOT_STATUS`.

**Batch 740:** `cytologyPrepCapabilities.ts` (new): `screen:cytology-prep:open`, `cytology:cell-block:hand-off`; seeds in `capabilitySeeds.ts` (Histotechnologist and Cytotechnologist open the bench; `CELL_BLOCK_HANDOFF` for whoever opens it).

**Batch 736:** `benchReasonCapabilities.ts` adds `config:bench-reasons:manage` (configOperations; Admin and Lab Director), spread into the catalog.

**Batch 734:** `printingPolicyCapabilities.ts` adds `config:direct-device-printing:manage` (configOperations; Admin and Lab Director), spread into the catalog.

**Batch 724:** the English text now says Microtome, not Microtomy (wording only; routes, keys and stored values unchanged). See `src/i18n/README.md`.

**Batch 649:** 17 new capabilities in `workflowCapabilities.ts` (spread into the catalog, like `lockboxCapabilities.ts`), for actions that had none: `surgical:report:sign-out`, `surgical:preliminary:release`, `surgical:amendment:release`, `surgical:correction:release`, `surgical:addendum:release`, `report:release:recall`, `case:pool:claim`, `case:pool:pass`, `case:flag:apply`, `case:flag:remove`, `case:diagnosis-code:apply`, `case:accession:create`, `case:informal-review:request`, `qa:deficiency:raise`, `qa:deficiency:escalate`, `qa:deficiency:contain` and `qa:deficiency:verify` (13 high risk, 4 standard). Each is checked by `authorizationService.enforce` in the service that does the work; screens grey the button with `CapabilityButton`. Seeds (`capabilitySeeds.ts`, least privilege): sign-out, diagnosis codes and informal review requests go to Pathologist, Fellow and Resident; **preliminary release and the amendment, correction and addendum releases go to Pathologist and Fellow only** (Pete, Oct 22, 2026: residents do not issue preliminary releases independently, and a hospital's own roles do not get the preliminary release by default; they do get the three revision releases with case access); pool claim and pass and recall go to Pathologist, Fellow, Resident and Cytotechnologist; flags to every case-access role; creating a case to every role with the Accession screen; the four QA deficiency actions to every role with the Quality Assurance screen. **`admin-override` is gone from `canFinalizeCase`** (`services/auth/`): signing needs the capability *and* being an active participant whose participation type can finalize. The catalog now has **338 capabilities, 287 high risk** (321 and 274 before); rows in `AUTHORIZATION_API.md` and `docs/product/CAPABILITIES.md`. Tests: `authorization.test.ts`, `workflowSeeds.test.ts`.

**Batch 645:** four capabilities for Lockbox Drop-Off, in `lockboxCapabilities.ts` (spread into the catalog so `capabilityCatalog.ts` stays under 1,000 lines): `screen:lockbox-drop-off:open`, and, in the Case work group, `lockbox:specimen:receive`, `lockbox:folder:review` and `lockbox:placeholder:resolve` (all three high risk; each checked with `authorizationService.enforce` in `lockbox/lockboxService.ts`). Seeds: **Accessioner** all four; **Admin** the screen and folder review only (oversight and the QA figures); nobody else, so a Pathologist gets none. Custom roles that get case access are not offered the screen automatically. Locale text in all six languages; rows in `AUTHORIZATION_API.md` and `docs/product/CAPABILITIES.md`. The catalog now has 319 capabilities.

**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

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
- **`capabilitySeeds.ts`** (pure): the day-one grants. Superadmin gets everything except `config:ai-prompt:approve` (separation of duties, Batch 536); Admin gets every export, administration and every Configuration capability; Lab Director every Configuration capability but drafting protocols; QA Reviewer the exports. Every built-in role also gets the screens it opens and the actions it already did before each capability existed (Pete's "keep today's users"; see the batch entries below). Least privilege applies to anything new. `applyCapabilitySeeds` offers each built-in role only the seeds it hasn't been offered before (`Role.seededCapabilities`), so an administrator's removal sticks and a new capability still arrives.
- **`roleCapabilityRules.ts`** (pure):
  - `roleCapabilityProblem`: the role service refuses a save with an unknown key or an unmet requirement.
  - `roleCapabilityChangeAudit`: the "Role capabilities changed" entry.
- **`authorizationService.ts`**: `createAuthorizationService(deps)`.
  - `evaluate` decides without writing anything.
  - `enforce` decides and audits high-risk checks.
  - `grantedCapabilities` returns everything the signed-in user holds.

  It reads the session, the staff record and the role catalog fresh on every call.
- **`defaultAuthorizationService.ts`**: the app instance, exported from `@/services` as `authorizationService`.
- **`guardConfigWrites.ts`** (Batch 428): wraps a Configuration service so each write method is checked against its capability; `permitConfigChange` does the same for a single action. **`configRefusalLabel.ts`**: the refused capability's name for the refusal banner.
- **`capabilityToggle.ts`** (Batch 451): the Role Dictionary's click and prompt decisions.

The catalog has 244 capabilities (Batch 495).

*Corrected in the Batch 496 README audit (Oct 9, 2026): seeds no longer "nobody else gets anything"; added the three later files and the current count.*

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

The table above covers phases 1 and 2 only. Every capability since is checked in the service named in its batch entry below; the full list, with the checking service for each, is the "Capability catalog" section of `docs/architecture/AUTHORIZATION_API.md` (kept in step by `capabilityDocs.guard.test.ts`). QA exports are now 16, not 14.

Screens use `hooks/useCapabilities.ts` and `components/Common/CapabilityButton.tsx` to grey out what the user can't do, with the reason in a tooltip.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the table is phase 1–2 only; pointed to the full catalog.*

## Guard

`capabilities.guard.test.ts` fails the build if:
- a catalog capability has no check at an action;
- a key used in the app isn't in the catalog;
- a gated button has no check behind it;
- a capability lacks locale text, or text is left for a capability that no longer exists.

## Not done yet

- Phase 3 (PS-357) continues: capabilities are added action by action (see the batch entries below). The CSV exports this line used to list now have their own: the disposal report (`retention:disposal-report:export`, Batch 407) and the Audit Log's five logs (billing log included), case search and the two My Contributions files (Batch 437, `printing/exportGate.ts`). Configuration dictionary exports are audited but deliberately not separately permitted; they sit behind their Configuration section (`exportGate.ts` header).
- API server enforcement: phase 4 (PS-358). The API server is not built yet.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the exports listed as not done were done in Batches 407 and 437.*

## Batch 613 (part A) — case search reporting

Two capabilities, both seeded to roles that open Search: `search:case-report:export` (export kind `search.case-report`) and `search:report-schedule:manage` (report schedules).

## Batch 609 (part A)

- New capability `report:case-images:attach` (link and unlink images on a report); seeded for every role with case access.

## Batch 370 (PS-356): phase 2

- **The self-escalation path is closed.** Before this batch, anyone signed in could open Configuration, edit any role's capabilities (their own included) and change any staff member's roles. Saving a role now needs `config:roles:manage`, and saving a staff record needs `config:staff:edit`. Changing someone's roles, facilities, access flags or credentials also needs `config:staff-access:assign`, per Pete's split. The full demo reset needs `config:demo-data:reset`.
- **Facility scope** (above).
- **Screens:** `authorizationService.snapshot()` feeds `useCapabilities`, whose `has` / `decide` now take the action's context. `CapabilityButton` takes a `context`, and its tooltip gives the reason: not granted, a missing requirement, or outside the facility assignment.

## Batch 371: Superadmin reserved for ForMedrixAI support

Pete: Superadmin is for ForMedrixAI support staff, and hospital administrators have no control over it.

- **Platform-only capabilities** (`platformOnly: true`, group "ForMedrixAI platform support") count only from a role staff can't be given, which is Superadmin. `roleCapabilityProblem` refuses them on any hospital role, and a copy of Superadmin drops them. There are two so far:
  - `platform:cross-tenant-cases:view`: support opening another organisation's case. `CaseRouter.getCase` checks and audits it on every such open. Lists aren't audited per case.
  - `platform:governing-bodies:manage`: the platform-wide governing-body content settings (`services/governingBodies/governingBodyAdministration.ts`).
- **Superadmin is locked.** `lockPlatformRoles` puts it back to the whole catalog (minus `config:ai-prompt:approve`, `SUPERADMIN_WITHHELD`) on every load. `saveRole` refuses any edit to it (`platformRole`), and so does the mock role service. The Role Dictionary shows it read-only with a banner.

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

`config:molecular-control-rules:manage` (high risk, administration) covers adding, changing and deleting a molecular assay control rule: its required controls and the deck slots its sample rack may use. Pete: "default to admin but it remains an assignable permission". It's in the administration group, so Admin starts with it; Batch 669 (Pete's ruling, view-only for molecular technologists) also seeds it to the Lab Director (`MOLECULAR_CONTROL_RULES_MANAGE`), and any other role gets it in the Role Dictionary. Without it the Control Rules screen is read-only. It needs `config:molecular-control-rules:view` (Batch 669, ctl). Checked in `services/molecular/mockMolecularAssayControlRuleService.ts`.

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

`billing:applied-code:review` ("Review a case's billing codes", high risk): approving, declining, overriding, adding and deleting a case's billing codes, on the report page, in the Cytology Workspace and at the Microtome.
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

## Batch 482 — Structured Inking, Module 3 (PS-359 follow-up)

One new capability (233 in all):
- `config:ink-color:manage` (high risk, `configLab`) — managing the margin ink-colour dictionary (`services/inkColors/`). `group: 'configLab'` means `CONFIG_SECTIONS` sweeps it into Admin's and Lab Director's seeds by default, same as its sibling `config:stain-dictionary:manage` — no `capabilitySeeds.ts` entry needed. Checked in `services/inkColors/mockInkColorService.ts` (via `guardConfigWrites`).

Also: `services/grossing/inkingSiteSettings.ts`'s `config:inking-validation-mode:manage` check (Batch 480, above) now runs against a `facilityId` rather than a Site id — the capability itself is unchanged, only what id its context carries.

`AUTHORIZATION_API.md`: 232 → 233; Configuration: lab dictionaries and case workflow 18 → 19; `CONFIG_SECTIONS` 95 → 96 (`authorization.test.ts`'s day-one-grants test and `capabilityDocs.guard.test.ts` enforce this stays in sync).

## Batch 484 — Structured Inking Sign-Out & Grossing Gate Logic Engine (PS-519 follow-up)

One new capability (234 in all):
- `case:inking-gate:override` (high risk, `casework`) — the Administrative Override of the Structured Inking sign-out gate (Gate B) for a Severity 3 issue, with a mandatory reason. Pete's own spec names "Clinical Admin, Lead Pathologist" only, never a standard pathologist — mapped onto Admin and Lab Director, the same two roles `config:inking-validation-mode:manage` already trusts. `group: 'casework'`, not a `config*` group, so it is **not** swept in by `CONFIG_SECTIONS`; seeded explicitly (`capabilitySeeds.ts`'s `INKING_GATE_OVERRIDE`) to Admin (explicit array) and Lab Director (per-role conditional) only. Checked in `services/grossing/recordInkingGateOverride.ts`.

`AUTHORIZATION_API.md`: 233 → 234 (now 54 in the Case work group) (`authorization.test.ts`'s day-one-grants test and `capabilityDocs.guard.test.ts` enforce this stays in sync).

## Batch 488 — screen:bench-contributions:open (PS-359 follow-up)

One new capability (235 in all): `screen:bench-contributions:open` (standard risk, `screens` group) — the four bench roles' own dedicated Bench Contributions page, separate from `screen:my-contributions:open` (the two screens show genuinely different, role-appropriate metrics; see `pages/README.md`). Seeded in `capabilitySeeds.ts` to Accessioner, Histotechnologist, Cytotechnologist, and Molecular Technologist, alongside each role's existing screens — the real next step Batch 486 deferred after reverting those four roles' `myContributions` grant. `AUTHORIZATION_API.md` updated to match (`capabilityDocs.guard.test.ts` enforces this stays in sync).

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 489 — case:tumor-board:flag, screen:tumor-board:open (Module 1 of Pete's Tumor Board / MDT Workspace spec; PS-359 follow-up)

Two new capabilities (237 in all):
- `case:tumor-board:flag` (high risk, `casework`) — nominating a case for a board's agenda ("Flag for MDT"), checked in `services/tumorBoard/mockTumorBoardService.ts`'s `create()`. Deliberately its own capability, not a reuse of `case:delegation:create` (which also reaches the bench roles) — this is a clinical/diagnostic judgment call, seeded only to GROSSERS (Pathologist, Fellow, Resident, PA).
- `screen:tumor-board:open` (standard risk, `screens`) — the dedicated Tumor Board workspace, same seeding (GROSSERS).

`AUTHORIZATION_API.md` updated to match (`capabilityDocs.guard.test.ts` enforces this stays in sync).

## Batch 490 — case:margin-exception:resolve (margin-distance extraction layer; PS-359 follow-up)

One new capability (238 in all): `case:margin-exception:resolve` (high risk, `casework`) — manually tagging the real distance for a margin-distance answer the extraction layer's parser couldn't confidently read, or dismissing it with no numeric tag; checked in `services/marginExtraction/mockMarginExtractionService.ts`'s `resolveException()`/`dismissException()`. Same reasoning as `case:tumor-board:flag` above — a clinical judgment call on what the pathologist's own free text means, seeded only to GROSSERS. `AUTHORIZATION_API.md` updated to match.

## Batch 491 — case:tumor-board:manage/dismiss, config:tumor-board-rules:manage, screen:margin-exception-review:open (Hybrid Inheritance Model + Coordinator/Clinical split; PS-359 follow-up)

Four new capabilities (242 in all):
- `case:tumor-board:manage` (standard risk, `casework`) — the broad queue-management side of the Coordinator/Clinical split Pete confirmed: scheduling, assigning a presenter, changing a board, cancelling a manual nomination (any `update()` other than the Dismissed status, which `update()` itself refuses). Seeded to `CASE_ACCESS_ROLES` — broader than GROSSERS, since no dedicated Coordinator role exists in this app yet.
- `case:tumor-board:dismiss` (high risk, `casework`) — the narrow clinical override: closing a listing as Dismissed with a mandatory reason. Seeded only to GROSSERS, same reasoning as `case:tumor-board:flag` and `case:margin-exception:resolve` above.
- `config:tumor-board-rules:manage` (high risk, `configQuality`) — the two-tier (enterprise/facility) auto-flagging rule config in `services/tumorBoardRules/`. Checked via `guardConfigWrites` on both the enterprise-rule and facility-override services.
- `screen:margin-exception-review:open` (standard risk, `screens`) — the deferred Batch 490 review-queue screen, now built (`pages/MarginExceptionReviewPage.tsx`). Seeded the same way as the case-level `case:margin-exception:resolve` action it reaches (GROSSERS), in the Pathology Workspace hub.

`AUTHORIZATION_API.md` updated to match (`capabilityDocs.guard.test.ts` enforces this stays in sync).

## Batch 493 — case:tumor-board:schedule, the scheduling/management split (PS-359 follow-up)

One new capability (243 in all): `case:tumor-board:schedule` (standard risk, `casework`) — Pete, Oct 8: *"There should be a specific permission to schedule these MDT so that an admin assistant can schedule them in advance."* Splits `services/tumorBoard/mockTumorBoardService.ts`'s `update()` so board/meeting-date/meeting-time/presenter changes require only this narrower capability, while status changes (Cancel, Presented, Deferred) still require the existing `case:tumor-board:manage`. Seeded in `capabilitySeeds.ts` alongside `case:tumor-board:manage` (`CASE_ACCESS_ROLES`), but — unlike `case:tumor-board:manage` — intended to also be granted on its own to a custom, non-clinical role (an "Admin Assistant") via Config → Staff → Role Dictionary, which this app already supports for any role. `case:tumor-board:manage`'s own catalog description narrowed to "status only" to match. `requiredTumorBoardCapabilitiesFor()` (new, in `mockTumorBoardService.ts`) is the pure decision of which capability (or both) a given `update()` call needs; both are still checked as their own literal `enforce(...)` calls so this folder's own static guard (`capabilities.guard.test.ts`) can still find each one.

`AUTHORIZATION_API.md` updated to match (`capabilityDocs.guard.test.ts` enforces this stays in sync).

## Batch 495 — `report:case-report:print` (PS-283 §4.2.4)

New capability: printing a case report (print, reprint, preview-print, or opening a stored version's PDF). High risk. Checked in `services/printing/reportPrintGate.ts` with the case and its facility; seeded to every case-access role and to hospital roles with case access (keep today's users — before this, anyone who could open a report could print it). The Print buttons on the report page, CoPilot view, preview window and version history are `CapabilityButton`s.

Not yet restricted by case sensitivity (VIP/confidential): there is no such case flag in the data model. Needs a product decision before a capability can gate on it. *(Done in Batch 516: `report:restricted-case:print`.)*

`docs/architecture/AUTHORIZATION_API.md`: row added; its stated total was stale ("232 as of Batch 480" against a catalog that now has 244) and three section counts were behind their tables (Case work 53→59, Configuration: cytology 12→13, Screens 18→21) — all corrected. `authorization.test.ts`'s day-one seed expectation includes the new key.

## Batch 497

`report:case-report:print`'s description no longer mentions printing from the preview window (retired); updated in all five languages and in `AUTHORIZATION_API.md`.

## Batch 499

New capability `autopsy:retention-tier:record` (choosing the autopsy organ-retention tier and its reason), seeded to the same case-access roles as `autopsy:retention-detail:record`, checked in `services/autopsy/recordAutopsyOrganRetentionTier.ts`. The catalog has 245 capabilities.

## Batch 515

Six capabilities, each checked in its service and listed in `docs/architecture/AUTHORIZATION_API.md`:
- `print:job:hold`, `print:job:cancel`, `print:job:redirect`, `print:job:retry` (PS-283), seeded to the Audit Log roles (`PRINT_QUEUE_ACTIONS`);
- `case:consult-link:issue`, `case:consult-link:revoke` (PS-290), seeded to the case-access roles (`CONSULT_LINK_ACTIONS`).

`guardConfigWrites.ts` exports `notifyConfigWritten` for services that check a Configuration permission themselves (the QA supervision service picks the permission by activity type).

## Batch 517

- **New capability: `config:secure-messaging:manage`** (configIntegrations; Admin and Lab Director through the configuration seed). It lets a person choose the lab's secure messaging gateways and record their BAA or data processing agreements (PS-143).
- **Broader use of `config:print-settings:manage`:** it now also covers a facility's report printing (`facilityService.setPrintSettings`, PS-337).

## Batch 518

Two new capabilities:
- **`interface:outbound:resend`** (qaOversight, Admin; PS-122): send, resend or simulate a failure for an outbound interface message, in any of the seven queues.
  - Pete's accepted default named Admin and an Interface Analyst, but there is no built-in Interface Analyst role. A hospital can grant the capability to its own role.
- **`label:batch:reprint`** (casework, Histotechnologist and Admin; PS-123): reprint labels for many cases at once.

## Batch 522

**`audit:consult-links:view`** (qaOversight; requires `screen:audit-log:open`): Audit Log → Consult links, every outside consult link across all cases (PS-290). Seeded to Admin, Lab Director and QA Reviewer.

## Batch 533

`cytology:preliminary:release` (casework, high): sending an urgent cytology preliminary for one specimen. No role starts with it, Superadmin aside (Pete: who may send one is configurable); a test keeps it off every other built-in role and off hospital roles' seeds.

## Batch 536 (PS-554, PS-558)

- New capabilities: `config:ai-prompt:view` (QA Reviewer, Lab Director), `config:ai-prompt:edit` (no built-in role), `config:ai-prompt:approve` (Lab Director), `config:ai-vendor-policy:manage` (Admin, Lab Director).
- `SEPARATION_OF_DUTIES` / `separationOfDutiesConflicts` (catalog): `config:clinical-mismatch-rules:manage` and `config:ai-prompt:approve` can't be held together. `roleCapabilityRules.roleCapabilityProblem` refuses a role holding both (message starts `SEPARATION_OF_DUTIES`, Superadmin included); `personSeparationOfDutiesConflicts` checks a person's roles together.
- `capabilitySeeds.ts`: `SUPERADMIN_WITHHELD` / `SUPERADMIN_CAPABILITY_KEYS` (Pete, Oct 11: Superadmin doesn't hold the approval); the Superadmin seed and `lockPlatformRoles` use them.

## Batch 551 (PS-539 phase 2d: the Server jobs view)

- `jobs:server-job:view` and `jobs:server-job:requeue` (requires view), seeded for Admin (`SERVER_JOBS`); checked in `serverJobs/serverJobsService.ts`. `AUTHORIZATION_API.md` updated.

## Batch 552 (PS-539 phase 2d: site agent screens)

- `config:site-agents:enroll` and `config:site-agent-config:manage` (configuration group, so Admin and Lab Director by default), checked in `siteAgent/siteAgentAdminService.ts`; `AUTHORIZATION_API.md` updated; the configuration-section count in `authorization.test.ts` is 101.

## Batch 554 (PS-539 phase 2d: interface monitoring)

- Batch 554: `interface:engine-status:view` (standard; Admin, `INTERFACE_MONITORING` seed), checked in `interfaceMonitoring/interfaceMonitoringService.ts`; `AUTHORIZATION_API.md` updated.

## Batch 572

- `cytology:screening-hours:sign-off` (high; its own seed `CYTOLOGY_SCREENING_HOURS` for Pathologist, Fellow, Resident and Cytotechnologist, not a hospital's own roles), checked in `cytology/mockCytologyScreeningHoursService.ts`; `AUTHORIZATION_API.md` updated.

## Batch 588 — Deleting a block in process

One new capability: `material:block:delete-in-process`, checked in `services/material/deleteBlockInProcess.ts`: given to the same roles as material disposal; each facility changes this in its role grants. Billing resolves the resulting finding with the permission that already resolves billing deficiencies.

## Batch 595

New capability `config:code-systems:manage` (group `configSystem`, so Admin and Lab Director by default): set the code systems each jurisdiction uses. Checked in `coding/codeSystemPolicyService.ts`; audited `CODE_SYSTEM_POLICY_CHANGED`.

## Batch 610 (part A) — screen:autopsy-dashboards:open

Standard-risk screen capability, seeded with the Quality & Compliance screens (Admin, Lab Director, QA Reviewer).

Batch 611 (#157): `auth:mfa-enrolment:reset` (administration group, high risk; no requirements) resets a colleague's second-factor enrolment in the administrator's own organisation. Seeded to Admin through the administration group. Checked in `services/auth/mfa/mfaService.ts`. `AUTHORIZATION_API.md` and `CAPABILITIES.md` list it (+1 capability).

- Batch 612 (part A): three platform-only capabilities, `platform:interface-dictionary:manage`, `:publish`, `:simulate` (Superadmin only).


Batch 616: server version in `httpAuthorizationService.ts` (used when the deployment has an API server address; the demo keeps the mock). Chosen in `defaultAuthorizationService.ts`. Contract: `docs/architecture/STAFF_ADMIN_API.md`.
- Batch 630: `cytology:hpv-result:record-manual` (high risk; Pathologist and Lab Director): entering an hrHPV result by hand and approving, as a second person, an entry that replaces an interface result. Checked in `cytology/recordManualHpvResult.ts`.

Batch 653: a check that names a case and no facility is judged against the case's ordering facility (`caseFacility` dependency; looked up only for a facility-limited person; unknown case or failed lookup still refuses). See `caseFacility.test.ts`.

Batch 659: new capability `qa:management-review:submit` (high risk, Quality deficiency actions).

## Batch 669
`config:or-board-demo:run` (high risk, administration): Start and Stop demo on the OR Suite Live Board. Checked in `services/intraop/mockIntraoperativeService.ts`; Admin gets it with the administration group; the board's buttons are `CapabilityButton`s.

## Batch 669f
`add-on:exception:flag` and `add-on:block:mark-retrieved` (standard risk, casework; in `workflowCapabilities.ts`): flagging a block exception and marking a block retrieved, both open to anyone with the screen until now. Seeded (`ADD_ON_BENCH_ACTIONS`) to every role with the Add-On Orders or Microtome screen (Pathologist, Fellow, Resident, Histotechnologist) and to a hospital's own roles with case access. Checked in `addOnOrders/addOnOrderActions.ts`; the Add-On Orders tracking buttons and the Microtome Block exhausted button are `CapabilityButton`s.

## Batch 669 (ctl) — Control Rules view capability
`config:molecular-control-rules:view` (standard risk, administration), defined with `manage` in `molecularControlRulesCapabilities.ts` and spread into the catalog (capabilityCatalog.ts does not grow). The Control Rules route no longer rides on `screen:molecular:open`, which neither Admin nor Lab Director holds by default. Seeds: Admin (administration group), Lab Director (`MOLECULAR_CONTROL_RULES_VIEW` with manage), QA Reviewer, and every role that holds the Molecular screen (Molecular Technologist; a hospital's own role with case access gets it too, keeping today's users). `manage` now `requires` view. Read in `listForReview` (see `services/molecular/README.md`).

- Batch 669 (access-11): `case:consult-link:reveal-identity` (casework, high), opting in when issuing an outside consult link to show the consultant the patient's full name and date of birth (masked by default). Seeded to Pathologist and Lab Director (`CONSULT_LINK_REVEAL_IDENTITY`); checked in `consultAccess/mockConsultTokenService.ts` `issue`, only when the opt-in is ticked.

## noScreensDiagnostic.ts (Oct 28, 2026)

`describeNoScreens(snapshot)` explains, for the browser console, why Home found no screen for the signed-in person: the session id and role, the staff roles, the size of the role list, whether it holds Superadmin, the roles that matched, and a one-line verdict. Home (`pages/Home.tsx`) logs it with `console.warn` when no tile shows. It holds ids, role names and counts only, no patient data.

## Batch 720
New capability `screen:grossing:open`, seeded to pathologist, fellow, resident and pa; pa also gets `screen:add-on-orders:open`.

## Batch 726

New capabilities `batch:manifest:seal`, `batch:carrier:advance`, `station:scan-mismatch:continue`, `station:scan-history:view` (standard risk), seeded through `STATION_CARRIER_ACTIONS` to every role with Batch Management or a bench workstation (Pathologists Assistant, Histotechnologist, Cytotechnologist, Molecular Technologist) and to a hospital's own roles with case access. Batch Management's three overrides and these four moved to `batchCarrierCapabilities.ts`, spread into the catalog in the same place, so `capabilityCatalog.ts` stays under 1,000 lines (993).

## Batch 728

- `config:research-cases:manage` and `config:batch-purposes:manage` (configLab, high risk; Admin and Lab Director through `CONFIG_SECTIONS`).

## Batch 730

- `labWorkflowReportCapabilities.ts` (new): `report:<report>:view` and `report:<report>:export` for the seven lab workflow reports; the three that read the scan log require `station:scan-history:view`. Seeded with Batch Management (`LAB_WORKFLOW_REPORTS`).

## Batch 731

- `materialLifecycleCapabilities.ts` (new): `material:end-state:record`, `material:reembed:request`, `material:reembed:complete`. Seeds `MATERIAL_END_STATE` (Microtome or Slide Distribution screen), `REEMBED_REQUEST` (Pathologist, Fellow, Resident), `REEMBED_COMPLETE` (Embedding screen).

## Batch 750

`slideImageCapabilities.ts` (new): `case:slide-image:open` (open a slide in the laboratory's own digital pathology application), checked in `digitalPathology/slideImageOpen.ts`; seeded with `REPORT_IMAGES` for every role with case access.

## Batch 751

`organMapDeliveryCapabilities.ts` (new): `config:organ-map-delivery:manage`, checked in `facilities/mockFacilityService.ts` (`setOrganMapDelivery`); a configuration capability (Admin, Lab Director).

## Batch 762

`requisitionCapabilities.ts` (new): `requisition:ingestion:run`, `requisition:inbox:review`, `requisition:inbox:resolve`, `case:requisition:view`, `config:requisition-ingestion:manage`, checked in `requisitions/requisitionService.ts`. Seeds: the first three for roles that open Accession, `case:requisition:view` with `REPORT_IMAGES` (case-access roles), the configuration with the other configuration sections (Admin).
