# What the server decides (Batch 673)

Pete, Oct 25, 2026: *"Keep the front end simple in design. The complexity belongs on the back end."*

This is the inventory that follows from that rule: the logic that sits in the browser's `src/services/` today, and where each piece belongs in a live deployment. It is written for the team building the API server, and for us as we thin the front end.

**How it was made (read this first).** A script looked at all 215 service folders (about 131,000 lines of logic, tests and mocks excluded) and picked out every file that both checks a permission or writes an audit entry **and** makes two or more state-changing calls. That gave 67 files. I then read each file's header and exported functions to name what it sequences. I did not read every line, so treat each row as a proposal to confirm, not a finished specification. Files that only compute and display (formatting, resolving a label, building a filter) are not listed; they are the "browser keeps" group by default.

## The rule

| Group | Meaning | In a live deployment |
|---|---|---|
| **1. Server decides** | Checks a permission, changes state, writes an audit entry, advances a counter, or sequences several writes. | **One call.** The browser sends the intent ("sign out this case"); the server checks the permission, does every step in one transaction, stamps the time and the actor, writes the audit entry, and answers with the result or a fixed refusal code. |
| **2. Server job** | A process that runs by itself (sweeps, polls, ingestion, timers). | A scheduled or event-triggered server function. The browser never runs it (CLAUDE.md rule 11). |
| **3. Browser keeps** | Display, instant feedback, local-only conveniences. | Stays. A rule mirrored for instant feedback (a field shown as required) is advice only; the server re-checks. |
| **4. Demo only** | Stand-ins for things a live deployment has for real. | Not in a server build. |

Four things apply to **every** Group 1 call, so they are not repeated in each row:

1. **Permission.** The server enforces the capability. The 345 keys in `capabilityCatalog.ts` are the list; a button greyed out in the browser is presentation (`AUTHORIZATION_API.md`).
2. **Time and actor.** The server stamps both from its own clock and the bearer token. The browser's `new Date()` is never a decision.
3. **Audit.** The server writes the audit entry in the same transaction as the change. A failed audit write fails the change. (Today the browser writes it afterwards and swallows a failure; that is a gap the server design closes.)
4. **Concurrency.** The server checks the version (`If-Match`), so a second user's stale save is refused with `CONFLICT`, as the case service already does (PS-71).

## Group 1: the server decides (one call each)

Proposed route names follow the `/api/<area>/<service>/<method>` style (HTTP_SERVICES_PATTERN.md §7). "Browser file" is what becomes a thin caller or is retired.

### Cases and sign-out
| Browser file today | What it sequences in the browser | Proposed server call |
|---|---|---|
| `cytology/signOutCytologyCase.ts` (766 lines), `releaseFinalizedCytologyCase` | Permission, signature check, case update, QC assignment, FPPE and competency activity records, audit, result dispatch | `POST /api/cytology/sign-out/sign-out-case`; release is a second call |
| `cytology/saveCytologyReview.ts` (332) | Permission, review record, secondary-screening activity record, case update | `POST /api/cytology/review/save-review` |
| `cytology/cytologyCaseActions.ts` (467) | Workspace save, screening patch, final-diagnosis selection, each with its own permission | one call per action |
| `cytology/releaseCytologyPreliminary.ts` | Per-specimen urgent preliminary release rules | `POST /api/cytology/release/release-preliminary` |
| `cytology/saveCytologyComplianceFeatures.ts` | Permission, enterprise or facility compliance settings | settings call (Group 1, config) |
| `reportRelease/releaseReport.ts`, `recallHeldRelease` | Release delay, held record, event log, PDF, delivery | `POST /api/report-release/release/release-report`, `recall-held-release` |
| `reports/sendReviewRequest.ts` | Permission, message, case review record | `POST /api/reports/review/send-review-request` |
| `cases/caseHolds.ts` | Place or release a case or retention hold | `place-hold`, `release-hold` |
| `cases/poolCaseActions.ts` | Claim, accept, pass a pool case. **Must be atomic** (two people claim at once) | `claim-pool-case`, `accept-pool-case`, `pass-pool-case` |
| `clinical/clinicalMismatchService.ts` | Mismatch check, the pathologist's decision, audit | `record-mismatch-decision` |
| `followUp/followUpActions.ts` | Mark expected, disposition, with failure keys | `mark-follow-up-expected`, `set-disposition` |
| `relatedCases/relatedCaseAttachments.ts`, `imageAssociation/caseReportImages.ts` | Attach related cases or images to the report | `attach-related-case`, `attach-report-image` |

### Material, grossing, scanning
| Browser file | Sequence | Proposed call |
|---|---|---|
| `material/deleteBlockInProcess.ts` | Permission, block delete, billing deficiency, audit | `delete-block-in-process` |
| `material/deleteBlockAfterSignOut.ts` | Tier 2 invalidation, tier 3 flag on amended report | `invalidate-block-after-sign-out`, `flag-block-on-amended-report` |
| `digitalPathology/wsiScanBatchWorkflow.ts` | Load queue, load/unload scanner, batch actions, HL7 | batch actions (8 permission checks) |
| `lockbox/lockboxService.ts` | Drop-off logic with 7 permission checks | lockbox calls |
| `molecularOrders/molecularOrderEngine.ts` (512) | Every state change of an in-house molecular order | `/api/molecular-orders/engine/*` (spec v1.1.0 was written engine-driven) |

### People, identity, access
| Browser file | Sequence | Proposed call |
|---|---|---|
| `roles/roleAdministration.ts` | Check the actor keeps a role manager, save role | `save-role` |
| `staff/staffAdministration.ts` | Staff save, access-change detail, audit | `save-staff-member` |
| `participationTypes/saveParticipationType.ts` | Save with compliance audit for sign-out authority overrides | `save-participation-type` |
| `patientCaseAccess/patientCaseAccessService.ts` | Request, grant, refuse, revoke access to other cases (6 audit writes) | the four actions |
| `patientIdentifiers/recordNationalPatientIdentifier.ts` | Permission, check digit, write to the patient and case | `record-national-identifier` |
| `registryConsent/recordPatientRegistryConsent.ts` | Permission, opt-outs written to patient and case | `record-registry-consent` |
| `interfaceExceptions/bindPatientManagementException.ts` | Apply an unresolved A40/A24/A47 message to the chosen patients | `bind-patient-management-exception` |

### Billing, registries, interfaces, administration
| Browser file | Sequence | Proposed call |
|---|---|---|
| `billing/chargeApproval.ts` | Four-eyes approval of charges | `approve-charge`, `mark-awaiting-approval` |
| `interfaceDispatch/dispatchCharge.ts` | Queue a charge, send to the billing engine | server-side dispatch from the queue |
| `interfaceDispatch/outboundQueueActions.ts`, `outboundQueue/outboundQueueService.ts` | Dispatch, resend, (demo) simulate failure for every queue | `dispatch-entry`, `resend-entry` |
| `registrySubmission/resendRegistrySubmission.ts`, `registryExceptionsDeps.ts` | Re-validate and resend | `resend-submission`, `resend-all` |
| `cancerRegistry/*Settings*`, `screeningRegistry/save*Settings.ts` | Permission, settings save per layer | settings calls |
| `registryGoLive/registryGoLive.ts` (499) | Send gates and live holds (12 permission checks) | gate evaluated on the server at send time |
| `migration/runLegacyFileImport.ts`, `importLegacyFile.ts` | Mapping permission, import run | `start-import` (long job, Group 2) |
| `smartCapture/smartCaptureService.ts` | Human-reviewed AI charge capture (prototype, not compliance-reviewed) | decide before building |
| `siteAgent/siteAgentAdminService.ts` | Already an HTTP API (SITE_AGENT_API.md) | none |
| `authorization/guardConfigWrites.ts` | Wraps every configuration service with a permission check | the server checks every config write; the wrapper becomes feedback only |

## Group 2: processes that run by themselves (server jobs)

| Browser file | What runs | Server form |
|---|---|---|
| `assistPolling/assistPollingRuntime.ts` | The LIS poll, ingest, retry of failed events | scheduled function |
| `cases/poolAssignmentTimeout.ts` | `startAssignmentTimeoutSweep`: a browser timer that expires unassigned pool cases | scheduled function |
| `reportRelease/releaseReportDeps.ts` | `startReleaseBackgroundWork`: releases due held reports | RELEASE_SWEEP_SERVER_JOB.md (already specified) |
| `hl7/processInboundHpvResultEvent.ts`, `processMaterialLocationEvent.ts` | Ingest an inbound result or location event | event handler behind the interface engine, not the browser |
| `networkPrint/networkPrintJobs.ts` | Tracks answers to label print jobs | server records the answer; the browser only shows status over the live-update connection |

A browser timer or poll is a smell: if it must run when nobody has the page open, it cannot live in the page.

## Group 3: the browser keeps

Display and instant feedback: `templates/templateService.ts` (reads and caches templates for the editor), `fieldRequirements/` (mirrors the required-field rules), `organMapping/organMapConfig.ts` (resolves which colours and patterns show), `auth/signerConfirmation.ts` and `auth/signatureEvidence.ts` (the signing prompt and lock countdown; the server verifies the signature on save), `auth/authSession.ts` (the client half of sign-in), and the many small resolve/format/filter functions that never appeared in the scan. Each should have a server re-check where it affects a stored value.

## Group 4: demo only

`communications/simulatedMailOutbox.ts`, `printing/simulatedPrint.ts`, `mockInterfaceEngine/simulatedEngineReceiver.ts`, `demoReset/demoReset.ts`, `staffPasswords/mockStaffPasswordService.ts` and the demo accounts, `auth/mfa/totp.ts` and the Simulated authenticator, `biometric/mockBiometricFlow.ts` (the simulated device check), and the "simulate" functions in `molecularOrderEngineLive.ts`. A server build should not contain them. (`scripts/check-production-bundle.mjs` already fails the build if the demo sign-in accounts are in it; I have not checked that the other stand-ins are covered. That is a follow-up.)

## What this means for the remaining mock imports

| Remaining file | Resolution under this rule |
|---|---|
| "Unchecked" variants (flags, physicians, participation types) | Disappear from the browser. The server decides whether a system-initiated change is allowed. |
| AI instructions | The browser keeps list, save and "test this instruction" calls; permission, audit and the AI call run on the server. |
| Orchestrator case service | Demo only. A server build exposes one case API. |
| Biometrics | **Supported in production** (correction, Oct 25; an earlier version of this table wrongly called it demo-only). Real WebAuthn: the device holds the private key, the API server makes the challenge, checks the answer and keeps the public key (`ACCESS_SESSION_API.md` section 3; `httpBiometricService.ts`, `serverBiometricFlow.ts`). Only `mockBiometricFlow` is demo. The one remaining direct mock import is three helper functions kept in `mockBiometricService.ts`, which should move out. |
| Staff passwords | **Decided (Oct 25): demo only.** Server deployments are single sign-on only; there is no password service to build. See `AUTHENTICATION_MODEL.md`. One related gap remains: the organisation's MFA policy has no server version. |
| Follow-up, correlation settings, case-store helpers | Move to Group 1 calls with the rest of their area. |

## Open questions for Pete

1. **Is "the server writes the audit entry in the same transaction" acceptable as the rule?** It is stricter than today (a failed audit write now fails the action), and the right behaviour for compliance, but the back-end team should hear it from you.
2. **Smart Capture** is marked prototype and not compliance-reviewed in its own header. Do we build its server side, or leave it out of the first release?
3. **Long jobs** (legacy import, report re-render): do you want a common "job started, poll for status" shape in the contract? The Server jobs view (Batch 551) suggests yes.

## What this document is not

It is not a plan to rewrite the front end. Nothing in `src/` changed in Batch 673. It is the checklist for what the API server owns, so the browser services can shrink to thin callers as each route appears, and the front end stays as simple as you want it.
